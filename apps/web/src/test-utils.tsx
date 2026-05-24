import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

interface BaseRenderResult {
  container: HTMLDivElement;
  root: Root;
  unmount: () => Promise<void>;
}

interface QueryRenderResult extends BaseRenderResult {
  queryClient: QueryClient;
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export async function flushMicrotasks(cycles = 3) {
  for (let index = 0; index < cycles; index += 1) {
    await Promise.resolve();
  }
}

export async function settle(cycles = 5) {
  await act(async () => {
    await flushMicrotasks(cycles);
  });
}

export async function waitForCondition(
  predicate: () => boolean,
  message = 'Condition was not met in time',
  attempts = 20,
) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) {
      return;
    }

    await settle(2);
  }

  throw new Error(message);
}

export async function renderElement(ui: ReactNode): Promise<BaseRenderResult> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<>{ui}</>);
    await flushMicrotasks();
  });

  return {
    container,
    root,
    unmount: async () => {
      await act(async () => {
        root.unmount();
        await flushMicrotasks();
      });
      container.remove();
    },
  };
}

export async function renderWithQueryClient(
  ui: ReactNode,
  queryClient = createTestQueryClient(),
): Promise<QueryRenderResult> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
    await flushMicrotasks();
  });

  return {
    container,
    root,
    queryClient,
    unmount: async () => {
      await act(async () => {
        root.unmount();
        await flushMicrotasks();
      });
      container.remove();
    },
  };
}

export function getButtonByText(container: ParentNode, text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((element) =>
    element.textContent?.includes(text),
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Unable to find button containing text: ${text}`);
  }

  return button;
}

export function getInputByPlaceholder(container: ParentNode, placeholder: string) {
  const input = Array.from(container.querySelectorAll('input')).find(
    (element) => element.getAttribute('placeholder') === placeholder,
  );

  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Unable to find input with placeholder: ${placeholder}`);
  }

  return input;
}

export function getTextareaByPlaceholder(container: ParentNode, placeholder: string) {
  const textarea = Array.from(container.querySelectorAll('textarea')).find(
    (element) => element.getAttribute('placeholder') === placeholder,
  );

  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`Unable to find textarea with placeholder: ${placeholder}`);
  }

  return textarea;
}

export async function click(element: HTMLElement) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushMicrotasks();
  });
}

export async function changeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  descriptor?.set?.call(element, value);

  await act(async () => {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await flushMicrotasks();
  });
}

function toFileList(files: File[]) {
  if (typeof DataTransfer !== 'undefined') {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
      dataTransfer.items.add(file);
    }
    return dataTransfer.files;
  }

  const fileList = Object.assign([...files], {
    item(index: number) {
      return files[index] ?? null;
    },
  });

  return fileList as unknown as FileList;
}

export async function setInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: toFileList(files),
  });

  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flushMicrotasks(5);
  });
}

export async function dispatchWindowEvent(event: Event) {
  await act(async () => {
    window.dispatchEvent(event);
    await flushMicrotasks();
  });
}