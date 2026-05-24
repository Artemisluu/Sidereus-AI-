// @vitest-environment jsdom

import type { Candidate } from '@sidereus/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from './store';
import {
  click,
  dispatchWindowEvent,
  getButtonByText,
  renderWithQueryClient,
  settle,
  waitForCondition,
} from './test-utils';
import App from './App';

const { fetchCandidateMock, fetchCandidatesMock } = vi.hoisted(() => ({
  fetchCandidateMock: vi.fn(),
  fetchCandidatesMock: vi.fn(),
}));

vi.mock('./api', () => ({
  fetchCandidate: fetchCandidateMock,
  fetchCandidates: fetchCandidatesMock,
}));

vi.mock('./components/UploadPanel', () => ({
  UploadPanel: ({ onUploaded }: { onUploaded: () => void }) => (
    <button type='button' onClick={onUploaded}>
      模拟上传
    </button>
  ),
}));

vi.mock('./components/JdPanel', () => ({
  JdPanel: ({ onSelectJob }: { onSelectJob: (jobId: string) => void }) => (
    <button type='button' onClick={() => onSelectJob('job-1')}>
      选择 JD
    </button>
  ),
}));

vi.mock('./components/CandidateList', () => ({
  CandidateList: ({
    candidates,
    onSelect,
    onToggleCompare,
  }: {
    candidates: Candidate[];
    onSelect: (candidateId: string) => void;
    onToggleCompare: (candidateId: string) => void;
  }) => (
    <div>
      {candidates.map((candidate) => (
        <div key={candidate.id}>
          <button type='button' onClick={() => onSelect(candidate.id)}>
            {`选择 ${candidate.filename}`}
          </button>
          <button type='button' onClick={() => onToggleCompare(candidate.id)}>
            {`对比 ${candidate.filename}`}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('./components/CandidateDetail', () => ({
  CandidateDetail: ({
    candidate,
    selectedJobId,
  }: {
    candidate: Candidate | null;
    selectedJobId: string;
  }) => <div data-testid='candidate-detail'>{`${candidate?.filename ?? '未选择'}|${selectedJobId}`}</div>,
}));

function createCandidate(id: string, filename: string): Candidate {
  return {
    id,
    filename,
    fileUrl: `/uploads/${filename}`,
    rawText: 'raw',
    cleanedText: 'cleaned',
    structuredData: null,
    status: 'pending',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
  };
}

describe('App', () => {
  beforeEach(() => {
    useAppStore.setState({ theme: 'light', viewMode: 'table', globalError: '' });
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  it('updates summaries, compare cards, and detail state when the operator interacts with the console', async () => {
    const candidates = [createCandidate('candidate-1', 'alpha.pdf'), createCandidate('candidate-2', 'beta.pdf')];
    fetchCandidatesMock.mockResolvedValue(candidates);
    fetchCandidateMock.mockImplementation(async (candidateId: string) =>
      candidates.find((candidate) => candidate.id === candidateId) ?? candidates[0],
    );

    const view = await renderWithQueryClient(<App />);

    try {
      await waitForCondition(
        () => view.container.textContent?.includes('候选人总数') && view.queryClient.isFetching() === 0,
        'Expected initial candidate query to settle',
      );

      expect(view.container.textContent).toContain('候选人总数');
      expect(view.container.textContent).toContain('2');
      expect(view.container.querySelector('[data-testid="candidate-detail"]')?.textContent).toBe('未选择|');

      await click(getButtonByText(view.container, '展开'));
      await click(getButtonByText(view.container, '选择 JD'));
      expect(view.container.querySelector('[data-testid="candidate-detail"]')?.textContent).toBe('未选择|job-1');

      await click(getButtonByText(view.container, '对比 alpha.pdf'));
      await click(getButtonByText(view.container, '对比 beta.pdf'));

      expect(view.container.textContent).toContain('已加入 2 人');
      expect(view.container.textContent).toContain('alpha.pdf');
      expect(view.container.textContent).toContain('beta.pdf');

      await click(getButtonByText(view.container, '选择 alpha.pdf'));
      await waitForCondition(
        () => view.queryClient.isFetching() === 0,
        'Expected selected candidate query to settle',
      );

      expect(fetchCandidateMock).toHaveBeenCalledWith('candidate-1');

      const collapseButtons = Array.from(view.container.querySelectorAll('button')).filter(
        (element) => element.textContent === '收起',
      );

      expect(collapseButtons).toHaveLength(2);

      await click(collapseButtons[0] as HTMLButtonElement);
      await click(collapseButtons[1] as HTMLButtonElement);

      expect(view.container.textContent).toContain('上传工具已折叠');
      expect(view.container.textContent).toContain('JD 配置区已折叠');
    } finally {
      await view.unmount();
    }
  });

  it('toggles the theme when Ctrl+K is pressed', async () => {
    fetchCandidatesMock.mockResolvedValue([]);
    const view = await renderWithQueryClient(<App />);

    try {
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      await dispatchWindowEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      await settle(3);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    } finally {
      await view.unmount();
    }
  });

  it('surfaces candidate loading failures through the global error banner', async () => {
    fetchCandidatesMock.mockImplementation(async () => {
      throw new Error('network down');
    });
    const view = await renderWithQueryClient(<App />);

    try {
      await waitForCondition(
        () => view.container.textContent?.includes('network down') ?? false,
        'Expected the global error banner to render',
      );

      expect(view.container.textContent).toContain('network down');
    } finally {
      await view.unmount();
    }
  });
});