// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, getButtonByText, renderWithQueryClient, setInputFiles } from '../test-utils';
import { UploadPanel } from './UploadPanel';

const { getDocumentMock, toastSuccessMock, uploadResumesMock } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  uploadResumesMock: vi.fn(),
}));

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  version: '4.10.38',
  getDocument: getDocumentMock,
}));

vi.mock('../api', () => ({
  uploadResumes: uploadResumesMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
  },
}));

function createPdfFile(name: string) {
  const file = new File(['pdf'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'arrayBuffer', {
    value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  });
  return file;
}

describe('UploadPanel', () => {
  beforeEach(() => {
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn().mockReturnValue({ width: 160, height: 90 }),
          render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        }),
      }),
    });
    uploadResumesMock.mockImplementation(async (files: File[]) =>
      files.map((file, index) => ({ id: `candidate-${index + 1}`, filename: file.name })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,thumb');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('keeps only PDF files, renders previews, and uploads after the minimum selection threshold', async () => {
    const onUploaded = vi.fn();
    const pdfFiles = Array.from({ length: 5 }, (_, index) => createPdfFile(`resume-${index + 1}.pdf`));
    const nonPdf = new File(['txt'], 'notes.txt', { type: 'text/plain' });
    const view = await renderWithQueryClient(<UploadPanel onUploaded={onUploaded} />);

    try {
      const fileInput = view.container.querySelector('input[type="file"]');
      if (!(fileInput instanceof HTMLInputElement)) {
        throw new Error('Expected file input to exist');
      }

      await setInputFiles(fileInput, [...pdfFiles, nonPdf]);

      const uploadButton = getButtonByText(view.container, '确认上传');
      expect(uploadButton.disabled).toBe(false);
      expect(uploadButton.textContent).toContain('确认上传 (5)');
      expect(view.container.textContent).toContain('resume-1.pdf');
      expect(view.container.textContent).not.toContain('notes.txt');

      await click(uploadButton);

      expect(uploadResumesMock).toHaveBeenCalledWith(pdfFiles);
      expect(toastSuccessMock).toHaveBeenCalledWith('上传成功，当前已经上传5份，请至候选人管理面板查看详情');
      expect(onUploaded).toHaveBeenCalledTimes(1);
    } finally {
      await view.unmount();
    }
  });
});