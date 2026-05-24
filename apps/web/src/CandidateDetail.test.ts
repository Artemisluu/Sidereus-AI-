// @vitest-environment jsdom

import type { Candidate, ResumeStructured } from '@sidereus/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CandidateDetail } from './components/CandidateDetail';

const {
  fetchCandidateScoresMock,
  fetchJobsMock,
  saveStructuredDataMock,
  scoreCandidateMock,
  streamExtractCandidateMock,
  toastSuccessMock,
  updateCandidateStatusMock,
} = vi.hoisted(() => ({
  fetchCandidateScoresMock: vi.fn(),
  fetchJobsMock: vi.fn(),
  saveStructuredDataMock: vi.fn(),
  scoreCandidateMock: vi.fn(),
  streamExtractCandidateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateCandidateStatusMock: vi.fn(),
}));

vi.mock('./api', () => ({
  fetchCandidateScores: fetchCandidateScoresMock,
  fetchJobs: fetchJobsMock,
  saveStructuredData: saveStructuredDataMock,
  scoreCandidate: scoreCandidateMock,
  streamExtractCandidate: streamExtractCandidateMock,
  updateCandidateStatus: updateCandidateStatusMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
  },
}));

const baseCandidate: Candidate = {
  id: 'candidate-1',
  filename: 'frontend-zhangsan.pdf',
  fileUrl: '/uploads/frontend-zhangsan.pdf',
  rawText: 'raw resume text',
  cleanedText: 'cleaned resume text',
  structuredData: null,
  status: 'pending',
  createdAt: '2026-05-24T00:00:00.000Z',
  updatedAt: '2026-05-24T00:00:00.000Z',
};

const extractedStructured: ResumeStructured = {
  basicInfo: {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    city: '上海',
  },
  education: [
    {
      school: '同济大学',
      major: '软件工程',
      degree: '本科',
      graduationDate: '2023-06',
    },
  ],
  workExperience: [
    {
      company: '星云科技',
      title: '前端工程师',
      period: '2023-07 至今',
      summary: '负责招聘平台前端开发',
    },
  ],
  skillTags: ['React', 'TypeScript', 'Vite'],
  projects: [
    {
      projectName: '招聘运营台',
      techStack: ['React', 'TypeScript'],
      responsibility: '负责候选人详情与结构化展示',
      highlights: '支持简历结构化与评分联动',
    },
  ],
};

function flushMicrotasks() {
  return Promise.resolve();
}

describe('CandidateDetail', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchJobsMock.mockResolvedValue([]);
    fetchCandidateScoresMock.mockResolvedValue([]);
    saveStructuredDataMock.mockResolvedValue(baseCandidate);
    scoreCandidateMock.mockResolvedValue(null);
    updateCandidateStatusMock.mockResolvedValue(baseCandidate);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await flushMicrotasks();
    });
    container.remove();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('shows completion prompt and renders AI extracted structured content with ReactJson', async () => {
    streamExtractCandidateMock.mockImplementation(
      (
        _candidateId: string,
        onChunk: (chunk: { key: keyof ResumeStructured; value: unknown }) => void,
        onProgress: (progress: { step: string; status: string }) => void,
        onDone: (data: ResumeStructured) => void,
      ) => {
        const source = {
          close: vi.fn(),
        };

        window.setTimeout(() => {
          onProgress({ step: 'basicInfo', status: 'processing' });
          onChunk({ key: 'basicInfo', value: extractedStructured.basicInfo });
          onDone(extractedStructured);
        }, 0);

        return source as unknown as EventSource;
      },
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CandidateDetail, {
            candidate: baseCandidate,
            selectedJobId: '',
            onSelectJob: vi.fn(),
          }),
        ),
      );
      await flushMicrotasks();
    });

    const extractButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('AI 提取（SSE）'),
    );
    expect(extractButton).toBeTruthy();

    await act(async () => {
      extractButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      vi.runAllTimers();
      await flushMicrotasks();
    });

    expect(toastSuccessMock).toHaveBeenCalledWith('当前候选人张三简历结构化提取完毕，请查看。');
    expect(container.textContent).toContain('当前候选人张三简历结构化提取完毕，请查看。');
    expect(container.querySelector('[data-testid="structured-json-view"]')?.textContent).toContain('name');
    expect(container.querySelector('[data-testid="structured-json-view"]')?.textContent).toContain('张三');

    const highlightedJson = container.querySelector('[data-testid="structured-json-highlight"]');
    expect(highlightedJson).toBeNull();
  });
});