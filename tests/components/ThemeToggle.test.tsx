import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../../src/components/ThemeToggle';

beforeEach(() => {
  document.documentElement.className = 'theme-dark';
  localStorage.clear();
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe('theme toggle', () => {
  it('is a black-and-white half-moon: one white disc with its left half filled black', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    const svg = button.querySelector('svg')!;
    expect(svg.querySelector('circle')?.getAttribute('fill')).toBe('#fff');
    expect(svg.querySelector('path')?.getAttribute('fill')).toBe('#000');
    // no more sun / moon-with-stars pair
    expect(button.querySelectorAll('svg')).toHaveLength(1);
  });

  it('names the action in both languages-neutral terms and reports the current theme', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('切換明暗主題 / Toggle light and dark theme');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches the page theme when pressed', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    fireEvent.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
  });
});
