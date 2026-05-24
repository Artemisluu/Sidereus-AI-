// @vitest-environment jsdom

import type { Candidate, ResumeStructured } from '@sidereus/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../store';
import { changeValue, click, getButtonByText, getInputByPlaceholder, renderElement } from '../test-utils';
import { CandidateList } from './CandidateList';

const structuredData: ResumeStructured = {
  basicInfo: {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    city: '上海',
  },
  education: [],
  workExperience: [],
  skillTags: ['React', 'TypeScript'],
  projects: [],
};

function createCandidate(index: number, overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: `candidate-${index}`,
    filename: `candidate-${index}.pdf`,
    fileUrl: `/uploads/candidate-${index}.pdf`,
    rawText: `raw ${index}`,
    cleanedText: `resume ${index}`,
    structuredData,
    status: 'pending',
    createdAt: new Date(Date.UTC(2026, 4, 24, 12, index)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 4, 24, 12, index)).toISOString(),
    ...overrides,
  };
}

describe('CandidateList', () => {
  beforeEach(() => {
    useAppStore.setState({ theme: 'light', viewMode: 'table', globalError: '' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('paginates table rows and keeps compare toggles from selecting the row', async () => {
    const onSelect = vi.fn();
    const onToggleCompare = vi.fn();
    const candidates = Array.from({ length: 9 }, (_, index) => createCandidate(index + 1));
    const view = await renderElement(
      <CandidateList
        candidates={candidates}
        selectedId=''
        onSelect={onSelect}
        compareIds={[]}
        onToggleCompare={onToggleCompare}
      />,
    );

    try {
      await click(getButtonByText(view.container, '下一页'));

      expect(view.container.textContent).toContain('共 9 人，当前第 2/2 页');
      expect(view.container.textContent).toContain('candidate-1.pdf');
      expect(view.container.textContent).not.toContain('candidate-9.pdf');

      const row = view.container.querySelector('tbody tr');
      const checkbox = view.container.querySelector('tbody input[type="checkbox"]');

      if (!(row instanceof HTMLTableRowElement) || !(checkbox instanceof HTMLInputElement)) {
        throw new Error('Expected table row and checkbox to exist on the current page');
      }

      await click(checkbox);
      expect(onToggleCompare).toHaveBeenCalledWith('candidate-1');
      expect(onSelect).not.toHaveBeenCalled();

      await click(row);
      expect(onSelect).toHaveBeenCalledWith('candidate-1');
    } finally {
      await view.unmount();
    }
  });

  it('filters candidates by keyword, skill, and status in table view', async () => {
    const onSelect = vi.fn();
    const onToggleCompare = vi.fn();
    const candidates = [
      createCandidate(1, {
        filename: 'frontend-react.pdf',
        cleanedText: 'react typescript vite',
        structuredData: { ...structuredData, skillTags: ['React', 'TypeScript'] },
        status: 'screened',
      }),
      createCandidate(2, {
        filename: 'backend-node.pdf',
        cleanedText: 'node express postgres',
        structuredData: { ...structuredData, skillTags: ['Node.js'] },
        status: 'pending',
      }),
      createCandidate(3, {
        filename: 'data-python.pdf',
        cleanedText: 'python pandas sql',
        structuredData: { ...structuredData, skillTags: ['Python'] },
        status: 'hired',
      }),
    ];
    const view = await renderElement(
      <CandidateList
        candidates={candidates}
        selectedId=''
        onSelect={onSelect}
        compareIds={[]}
        onToggleCompare={onToggleCompare}
      />,
    );

    try {
      await changeValue(getInputByPlaceholder(view.container, '搜索姓名/技能/学校/关键词'), 'react');
      await changeValue(getInputByPlaceholder(view.container, '技能标签过滤'), 'type');

      const selects = Array.from(view.container.querySelectorAll('select'));
      const statusSelect = selects[0];

      if (!(statusSelect instanceof HTMLSelectElement)) {
        throw new Error('Expected status select to exist');
      }

      await changeValue(statusSelect, 'screened');

      expect(view.container.textContent).toContain('frontend-react.pdf');
      expect(view.container.textContent).not.toContain('backend-node.pdf');
      expect(view.container.textContent).not.toContain('data-python.pdf');
      expect(view.container.querySelectorAll('tbody tr')).toHaveLength(1);
    } finally {
      await view.unmount();
    }
  });

  it('resets pagination when filters shrink the result set', async () => {
    const onSelect = vi.fn();
    const onToggleCompare = vi.fn();
    const candidates = Array.from({ length: 9 }, (_, index) =>
      createCandidate(index + 1, {
        filename: `frontend-${index + 1}.pdf`,
        cleanedText: `frontend resume ${index + 1}`,
      }),
    );
    const view = await renderElement(
      <CandidateList
        candidates={candidates}
        selectedId=''
        onSelect={onSelect}
        compareIds={[]}
        onToggleCompare={onToggleCompare}
      />,
    );

    try {
      await click(getButtonByText(view.container, '下一页'));
      expect(view.container.textContent).toContain('共 9 人，当前第 2/2 页');

      await changeValue(getInputByPlaceholder(view.container, '搜索姓名/技能/学校/关键词'), 'frontend-1');

      expect(view.container.textContent).toContain('共 1 人，当前第 1/1 页');
      expect(view.container.textContent).toContain('frontend-1.pdf');
      expect(view.container.querySelectorAll('tbody tr')).toHaveLength(1);
    } finally {
      await view.unmount();
    }
  });

  it('switches to card view and keeps the store in sync with the selected layout', async () => {
    const onSelect = vi.fn();
    const onToggleCompare = vi.fn();
    const candidates = [createCandidate(1), createCandidate(2)];
    const view = await renderElement(
      <CandidateList
        candidates={candidates}
        selectedId='candidate-2'
        onSelect={onSelect}
        compareIds={['candidate-1']}
        onToggleCompare={onToggleCompare}
      />,
    );

    try {
      await click(getButtonByText(view.container, '卡片'));

      expect(useAppStore.getState().viewMode).toBe('card');
      expect(view.container.querySelector('table')).toBeNull();
      expect(view.container.textContent).toContain('查看详情');

      const checkboxes = view.container.querySelectorAll('input[type="checkbox"]');
      const checkbox = checkboxes[0];
      if (!(checkbox instanceof HTMLInputElement)) {
        throw new Error('Expected compare checkbox to exist in card view');
      }

      await click(checkbox);
      await click(getButtonByText(view.container, '查看详情'));

      expect(onToggleCompare).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledTimes(1);
    } finally {
      await view.unmount();
    }
  });
});