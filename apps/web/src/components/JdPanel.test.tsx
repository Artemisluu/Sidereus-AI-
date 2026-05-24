// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeValue, click, getButtonByText, getInputByPlaceholder, getTextareaByPlaceholder, renderWithQueryClient } from '../test-utils';
import { JdPanel } from './JdPanel';

const { createJobMock, fetchJobsMock, toastSuccessMock } = vi.hoisted(() => ({
  createJobMock: vi.fn(),
  fetchJobsMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('../api', () => ({
  createJob: createJobMock,
  fetchJobs: fetchJobsMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
  },
}));

describe('JdPanel', () => {
  beforeEach(() => {
    fetchJobsMock.mockResolvedValue([]);
    createJobMock.mockResolvedValue({ id: 'job-1', title: '资深前端工程师' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('submits a trimmed JD payload and resets the form after success', async () => {
    const onSelectJob = vi.fn();
    const view = await renderWithQueryClient(<JdPanel onSelectJob={onSelectJob} />);

    try {
      const saveButton = getButtonByText(view.container, '保存 JD');
      expect(saveButton.disabled).toBe(true);

      const titleInput = getInputByPlaceholder(view.container, '岗位名称');
      const descriptionInput = getTextareaByPlaceholder(view.container, '岗位描述');
      const requiredInput = getInputByPlaceholder(view.container, '必备技能（逗号分隔）');
      const bonusInput = getInputByPlaceholder(view.container, '加分技能（逗号分隔）');

      await changeValue(titleInput, '资深前端工程师');
      await changeValue(descriptionInput, '负责招聘运营台前端建设');
      await changeValue(requiredInput, ' React , TypeScript,  ');
      await changeValue(bonusInput, 'Node.js, GraphQL ');

      expect(saveButton.disabled).toBe(false);

      await click(saveButton);

      expect(createJobMock).toHaveBeenCalledTimes(1);
      expect(createJobMock.mock.calls[0]?.[0]).toEqual({
        title: '资深前端工程师',
        description: '负责招聘运营台前端建设',
        requiredSkills: ['React', 'TypeScript'],
        bonusSkills: ['Node.js', 'GraphQL'],
      });
      expect(onSelectJob).toHaveBeenCalledWith('job-1');
      expect(toastSuccessMock).toHaveBeenCalledWith('保存成功');
      expect(titleInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
      expect(requiredInput.value).toBe('');
      expect(bonusInput.value).toBe('');
      expect(fetchJobsMock).toHaveBeenCalled();
    } finally {
      await view.unmount();
    }
  });
});