import { render, screen, waitFor } from '@testing-library/react';
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
