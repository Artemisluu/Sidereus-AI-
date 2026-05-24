import type { Candidate } from '@sidereus/shared';

export function normalizeUploadedFilename(originalname: string): string {
  const decoded = Buffer.from(originalname, 'latin1').toString('utf8');
  const decodedHasReplacement = decoded.includes('�');
  const decodedHasCjk = /[\u3400-\u9fff]/.test(decoded);
  const originalHasCjk = /[\u3400-\u9fff]/.test(originalname);
  const looksMojibake = /[ÃÂÐÑØÅÄÖÆÇÈÉÊËÌÍÎÏÒÓÔÕÙÚÛÜÝÞßà-ÿ]/.test(originalname);

  if (!decodedHasReplacement && decodedHasCjk && (!originalHasCjk || looksMojibake)) {
    return decoded;
  }

  return originalname;
}

export function cleanResumeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[•●▪]/g, '-')
    .trim();
}

export function rowToCandidate(row: any): Candidate {
  return {
    id: row.id,
    filename: row.filename,
    fileUrl: row.file_url,
    rawText: row.raw_text,
    cleanedText: row.cleaned_text,
    structuredData: row.structured_data,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const normalized = text
      .replace(/^```json\s*/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(normalized) as T;
  } catch {
    return fallback;
  }
}

export function normalizeChunk<T>(parsed: unknown, key: string, fallback: T): T {
  if (typeof parsed === 'object' && parsed !== null && Object.prototype.hasOwnProperty.call(parsed, key)) {
    const nested = (parsed as Record<string, unknown>)[key];
    if (nested !== null && nested !== undefined) {
      return nested as T;
    }

    return fallback;
  }

  if (parsed === null || parsed === undefined) {
    return fallback;
  }

  return parsed as T;
}