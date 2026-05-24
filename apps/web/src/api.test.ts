import type { Candidate, CandidateScore, ResumeStructured } from '@sidereus/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  createJob,
  fetchCandidate,
  fetchCandidateScores,
  fetchCandidates,
  fetchJobs,
  resolveApiBase,
  saveStructuredData,
  scoreCandidate,
  streamExtractCandidate,
  updateCandidateStatus,
  uploadResumes,
} from './api';

const baseStructured: ResumeStructured = {
  basicInfo: {
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    city: '上海',
  },
  education: [],
  workExperience: [],
  skillTags: ['React'],
  projects: [],
};

const baseCandidate: Candidate = {
  id: 'candidate-1',
  filename: 'frontend-zhangsan.pdf',
  fileUrl: '/uploads/frontend-zhangsan.pdf',
  rawText: 'raw resume',
  cleanedText: 'cleaned resume',
  structuredData: baseStructured,
  status: 'pending',
  createdAt: '2026-05-24T00:00:00.000Z',
  updatedAt: '2026-05-24T00:00:00.000Z',
};

class FakeEventSource {
  static lastInstance: FakeEventSource | null = null;

  readonly close = vi.fn();
  readonly listeners = new Map<string, Array<(event: MessageEvent) => void>>();

  constructor(public readonly url: string) {
    FakeEventSource.lastInstance = this;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  emit(type: string, payload: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(payload) } as MessageEvent);
    }
  }
}

describe('resolveApiBase', () => {
  it('falls back correctly when VITE_API_BASE is empty and trims trailing slashes', () => {
    expect(resolveApiBase('', false, 'https://sidereus.example.com')).toBe(
      'https://sidereus.example.com',
    );
    expect(resolveApiBase('   ', true, 'https://sidereus.example.com')).toBe(
      'http://localhost:4000',
    );
    expect(
      resolveApiBase('https://api.example.com///', false, 'https://sidereus.example.com'),
    ).toBe('https://api.example.com');
  });

  it('uses localhost in dev when VITE_API_BASE is undefined', () => {
    expect(resolveApiBase(undefined, true, 'https://sidereus.example.com')).toBe(
      'http://localhost:4000',
    );
  });

  it('uses current origin in production when VITE_API_BASE is undefined', () => {
    expect(resolveApiBase(undefined, false, 'https://sidereus.example.com')).toBe(
      'https://sidereus.example.com',
    );
  });

  it('trims surrounding spaces and preserves API path', () => {
    expect(
      resolveApiBase('  https://api.example.com/v1/  ', false, 'https://sidereus.example.com'),
    ).toBe('https://api.example.com/v1');
  });

  it('keeps configured API host in dev instead of fallback', () => {
    expect(resolveApiBase('http://127.0.0.1:9000/', true, 'https://sidereus.example.com')).toBe(
      'http://127.0.0.1:9000',
    );
  });
});

describe('api request helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts uploaded resumes as multipart form data', async () => {
    const uploaded = [baseCandidate];
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { data: uploaded } } as never);
    const files = [
      new File(['resume-a'], 'resume-a.pdf', { type: 'application/pdf' }),
      new File(['resume-b'], 'resume-b.pdf', { type: 'application/pdf' }),
    ];

    await expect(uploadResumes(files)).resolves.toEqual(uploaded);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/api/candidates/upload', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const formData = postSpy.mock.calls[0]?.[1] as FormData;
    expect(formData.getAll('resumes')).toEqual(files);
  });

  it('uses the expected endpoints and payloads for candidate and job operations', async () => {
    const list = [baseCandidate];
    const score: CandidateScore = {
      total: 91,
      skill: 92,
      experience: 88,
      education: 85,
      comment: 'match',
    };
    const scoreRecord = {
      ...score,
      job_id: 'job-1',
      job_title: '资深前端工程师',
      created_at: '2026-05-24T10:00:00.000Z',
    };

    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { data: list } } as never)
      .mockResolvedValueOnce({ data: { data: baseCandidate } } as never)
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'job-1',
              title: '资深前端工程师',
              description: 'build ui',
              required_skills: ['React'],
              bonus_skills: ['Node.js'],
            },
          ],
        },
      } as never)
      .mockResolvedValueOnce({ data: { data: [scoreRecord] } } as never);
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { data: { id: 'job-1', title: '资深前端工程师' } } } as never)
      .mockResolvedValueOnce({ data: { data: score } } as never);
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: { data: baseCandidate } } as never);
    const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ data: { data: baseCandidate } } as never);

    await expect(
      fetchCandidates({ search: 'react', status: 'pending', sortBy: 'filename', order: 'asc' }),
    ).resolves.toEqual(list);
    await expect(fetchCandidate(baseCandidate.id)).resolves.toEqual(baseCandidate);
    await expect(
      updateCandidateStatus(baseCandidate.id, 'screened'),
    ).resolves.toEqual(baseCandidate);
    await expect(saveStructuredData(baseCandidate.id, baseStructured)).resolves.toEqual(baseCandidate);
    await expect(
      createJob({
        title: '资深前端工程师',
        description: 'build ui',
        requiredSkills: ['React'],
        bonusSkills: ['Node.js'],
      }),
    ).resolves.toEqual({ id: 'job-1', title: '资深前端工程师' });
    await expect(fetchJobs()).resolves.toEqual([
      {
        id: 'job-1',
        title: '资深前端工程师',
        description: 'build ui',
        required_skills: ['React'],
        bonus_skills: ['Node.js'],
      },
    ]);
    await expect(scoreCandidate(baseCandidate.id, 'job-1')).resolves.toEqual(score);
    await expect(fetchCandidateScores(baseCandidate.id)).resolves.toEqual([scoreRecord]);

    expect(getSpy).toHaveBeenNthCalledWith(1, '/api/candidates', {
      params: { search: 'react', status: 'pending', sortBy: 'filename', order: 'asc' },
    });
    expect(getSpy).toHaveBeenNthCalledWith(2, `/api/candidates/${baseCandidate.id}`);
    expect(getSpy).toHaveBeenNthCalledWith(3, '/api/jobs');
    expect(getSpy).toHaveBeenNthCalledWith(4, `/api/candidates/${baseCandidate.id}/scores`);
    expect(patchSpy).toHaveBeenCalledWith(`/api/candidates/${baseCandidate.id}/status`, {
      status: 'screened',
    });
    expect(putSpy).toHaveBeenCalledWith(`/api/candidates/${baseCandidate.id}/structured`, baseStructured);
    expect(postSpy).toHaveBeenNthCalledWith(1, '/api/jobs', {
      title: '资深前端工程师',
      description: 'build ui',
      requiredSkills: ['React'],
      bonusSkills: ['Node.js'],
    });
    expect(postSpy).toHaveBeenNthCalledWith(2, `/api/candidates/${baseCandidate.id}/score`, {
      jobId: 'job-1',
    });
  });

  it('relays SSE progress, chunk, and done events', () => {
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
    const onChunk = vi.fn();
    const onProgress = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    const source = streamExtractCandidate(baseCandidate.id, onChunk, onProgress, onDone, onError);
    const eventSource = FakeEventSource.lastInstance;

    expect(source).toBe(eventSource);
    expect(eventSource?.url).toContain(`/api/candidates/${baseCandidate.id}/extract/stream`);

    eventSource?.emit('progress', { step: 'basicInfo', status: 'running' });
    eventSource?.emit('chunk', { key: 'basicInfo', value: baseStructured.basicInfo });
    eventSource?.emit('done', baseStructured);

    expect(onProgress).toHaveBeenCalledWith({ step: 'basicInfo', status: 'running' });
    expect(onChunk).toHaveBeenCalledWith({ key: 'basicInfo', value: baseStructured.basicInfo });
    expect(onDone).toHaveBeenCalledWith(baseStructured);
    expect(onError).not.toHaveBeenCalled();
    expect(eventSource?.close).toHaveBeenCalledTimes(1);
  });

  it('parses SSE error payloads and closes the stream', () => {
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
    const onChunk = vi.fn();
    const onProgress = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    streamExtractCandidate(baseCandidate.id, onChunk, onProgress, onDone, onError);
    const eventSource = FakeEventSource.lastInstance;

    eventSource?.emit('error', { message: 'SSE failed loudly' });

    expect(onError).toHaveBeenCalledWith('SSE failed loudly');
    expect(onChunk).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(eventSource?.close).toHaveBeenCalledTimes(1);
  });

  it('reports a default error message when the SSE error event has no payload', () => {
    vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
    const onChunk = vi.fn();
    const onProgress = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    streamExtractCandidate(baseCandidate.id, onChunk, onProgress, onDone, onError);
    const eventSource = FakeEventSource.lastInstance;

    eventSource?.emit('error', undefined);

    expect(onError).toHaveBeenCalledWith('SSE failed');
    expect(onChunk).not.toHaveBeenCalled();
    expect(onProgress).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(eventSource?.close).toHaveBeenCalledTimes(1);
  });
});
