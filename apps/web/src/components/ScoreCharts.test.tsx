// @vitest-environment jsdom

import type { CandidateScore } from '@sidereus/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderElement } from '../test-utils';
import { ScoreCharts } from './ScoreCharts';

vi.mock('recharts', () => {
  function Box({ children, data, ...props }: Record<string, unknown> & { children?: unknown; data?: unknown }) {
    return (
      <div data-props={JSON.stringify(props)} data-series={JSON.stringify(data ?? null)}>
        {children as React.ReactNode}
      </div>
    );
  }

  return {
    Bar: Box,
    BarChart: Box,
    PolarAngleAxis: Box,
    PolarGrid: Box,
    Radar: Box,
    RadarChart: Box,
    ResponsiveContainer: Box,
    Tooltip: Box,
    XAxis: Box,
    YAxis: Box,
  };
});

describe('ScoreCharts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders radar and bar chart datasets for the provided score', async () => {
    const score: CandidateScore = {
      total: 88,
      skill: 92,
      experience: 81,
      education: 76,
      comment: 'strong match',
    };
    const view = await renderElement(<ScoreCharts score={score} />);

    try {
      expect(view.container.textContent).toContain('雷达图');
      expect(view.container.textContent).toContain('维度柱状图');
      expect(view.container.innerHTML).toContain('技能匹配');
      expect(view.container.innerHTML).toContain('经验相关');
      expect(view.container.innerHTML).toContain('教育契合');
      expect(view.container.innerHTML).toContain('综合');
      expect(view.container.innerHTML).toContain('88');
      expect(view.container.innerHTML).toContain('92');
      expect(view.container.innerHTML).toContain('81');
      expect(view.container.innerHTML).toContain('76');
    } finally {
      await view.unmount();
    }
  });
});