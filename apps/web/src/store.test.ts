// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useAppStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('hydrates theme from localStorage and toggles back while persisting the result', async () => {
    localStorage.setItem('sidereus-theme', 'dark');
    const { useAppStore } = await import('./store');

    expect(useAppStore.getState().theme).toBe('dark');

    useAppStore.getState().toggleTheme();

    expect(useAppStore.getState().theme).toBe('light');
    expect(localStorage.getItem('sidereus-theme')).toBe('light');
  });

  it('updates view mode, global error, and explicit theme changes', async () => {
    const { useAppStore } = await import('./store');

    useAppStore.getState().setViewMode('card');
    useAppStore.getState().setGlobalError('network down');
    useAppStore.getState().setTheme('dark');

    expect(useAppStore.getState().viewMode).toBe('card');
    expect(useAppStore.getState().globalError).toBe('network down');
    expect(useAppStore.getState().theme).toBe('dark');
    expect(localStorage.getItem('sidereus-theme')).toBe('dark');
  });
});