import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AiTokenUsageDashboard from '../../src/components/AiTokenUsageDashboard';
import { aiUsageService } from '../../src/services/api/aiUsageService';

vi.mock('../../src/services/api/aiUsageService', () => ({
  aiUsageService: {
    getOverview: vi.fn(),
    getDailySummary: vi.fn(),
  },
}));

describe('AI token usage chart names', () => {
  beforeEach(() => {
    vi.mocked(aiUsageService.getOverview).mockResolvedValue({
      thisMonth: 100,
      lastMonth: 200,
      thisYear: 300,
      observableTotal: 300,
      dailyAverage: 10,
      monthlyAverage: 100,
      yearlyAverage: 300,
      wowPercent: null,
      momPercent: null,
      yoyPercent: null,
      dataSince: '2026-04-01',
      timezone: 'Asia/Taipei',
    });
    vi.mocked(aiUsageService.getDailySummary).mockResolvedValue([
      {
        period: '2026-04-01', aiProvider: 'codex', modelName: 'gpt-test',
        totalInputTokens: 40, totalOutputTokens: 60, totalCacheCreationInputTokens: 0,
        totalCacheReadInputTokens: 0, totalTokens: 100, totalEstimatedCostUsd: 1, callCount: 1,
      },
    ]);
  });

  it('gives both rendered charts an accessible name', async () => {
    const { container } = render(<AiTokenUsageDashboard />);

    await waitFor(() => expect(container.querySelectorAll('svg')).toHaveLength(2));

    expect(screen.getByLabelText('Weekly cost trend chart')).toBeInTheDocument();
    expect(screen.getByLabelText('Daily token usage chart')).toBeInTheDocument();
  });
});

describe('AI token usage Provider / Model panel (vendor > generation > version)', () => {
  const usage = (aiProvider: string, modelName: string, totalTokens: number, cost: number) => ({
    period: '2026-04-01', aiProvider, modelName,
    totalInputTokens: 0, totalOutputTokens: 0, totalCacheCreationInputTokens: 0,
    totalCacheReadInputTokens: 0, totalTokens, totalEstimatedCostUsd: cost, callCount: 1,
  });

  beforeEach(() => {
    vi.mocked(aiUsageService.getOverview).mockResolvedValue({
      thisMonth: 1, lastMonth: 1, thisYear: 1, observableTotal: 1, dailyAverage: 1,
      monthlyAverage: 1, yearlyAverage: 1, wowPercent: null, momPercent: null, yoyPercent: null,
      dataSince: '2026-04-01', timezone: 'Asia/Taipei',
    });
    vi.mocked(aiUsageService.getDailySummary).mockResolvedValue([
      usage('claude-code', 'claude-opus-5-5', 3000, 3),
      usage('claude-code', 'claude-sonnet-5-5', 2000, 2),
      usage('claude-code', 'claude-opus-4-8', 1000, 1),
      usage('codex', 'gpt-6.1-terra', 5000, 5),
    ]);
  });

  async function renderPanel() {
    const utils = render(<AiTokenUsageDashboard />);
    const panel = (await screen.findByText(/^Provider \/ Model/)).closest('div')!.parentElement as HTMLElement;
    return { ...utils, panel };
  }

  it('shows one row per vendor and generation by default, not one per model', async () => {
    const { panel } = await renderPanel();
    const view = within(panel);
    expect(view.getByRole('button', { name: /Claude$/ })).toBeInTheDocument();
    expect(view.getByRole('button', { name: /Claude 5/ })).toBeInTheDocument();
    expect(view.getByRole('button', { name: /Claude 4/ })).toBeInTheDocument();
    expect(view.getByRole('button', { name: /GPT-6/ })).toBeInTheDocument();
    expect(view.queryByText('Opus 5.5')).not.toBeInTheDocument();
    expect(view.queryByText('6.1 Terra')).not.toBeInTheDocument();
  });

  it('reveals the minor versions when a generation is expanded, and hides them again', async () => {
    const { panel } = await renderPanel();
    const view = within(panel);
    const gen5 = view.getByRole('button', { name: /Claude 5/ });
    expect(gen5).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(gen5);
    expect(gen5).toHaveAttribute('aria-expanded', 'true');
    expect(view.getByText('Opus 5.5')).toBeInTheDocument();
    expect(view.getByText('Sonnet 5.5')).toBeInTheDocument();
    expect(view.queryByText('Opus 4.8')).not.toBeInTheDocument();

    fireEvent.click(gen5);
    expect(view.queryByText('Opus 5.5')).not.toBeInTheDocument();
  });

  it('collapses a whole vendor, and shows rolled-up tokens on the vendor row', async () => {
    const { panel } = await renderPanel();
    const view = within(panel);
    const claude = view.getByRole('button', { name: /Claude$/ });
    expect(claude.closest('tr')).toHaveTextContent('6K'); // 3000 + 2000 + 1000

    fireEvent.click(claude);
    expect(view.queryByRole('button', { name: /Claude 5/ })).not.toBeInTheDocument();
    expect(view.getByRole('button', { name: /GPT-6/ })).toBeInTheDocument();
  });
});
