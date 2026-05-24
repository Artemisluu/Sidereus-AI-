import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { describe, it } from 'node:test';
import {
  cleanResumeText,
  normalizeChunk,
  normalizeUploadedFilename,
  rowToCandidate,
  safeJsonParse,
} from './utils';

describe('normalizeUploadedFilename', () => {
  it('decodes mojibake CJK filenames back to UTF-8', () => {
    const expected = '测试-前端简历.pdf';
    const mojibake = Buffer.from(expected, 'utf8').toString('latin1');

    assert.equal(normalizeUploadedFilename(mojibake), expected);
  });

  it('keeps regular filenames unchanged', () => {
    assert.equal(normalizeUploadedFilename('resume_john_doe.pdf'), 'resume_john_doe.pdf');
  });
});

describe('cleanResumeText', () => {
  it('keeps normal CRLF line endings as single line breaks', () => {
    assert.equal(cleanResumeText('第一行\r\n第二行'), '第一行\n第二行');
  });

  it('normalizes carriage returns, extra spaces, bullet symbols, and trims edges', () => {
    const raw = '  第一行\r\n\r\n\r\n第二行    含多空格\n• 条目一\n● 条目二\n▪ 条目三  ';

    assert.equal(
      cleanResumeText(raw),
      '第一行\n\n第二行 含多空格\n- 条目一\n- 条目二\n- 条目三',
    );
  });
});

describe('safeJsonParse', () => {
  it('parses JSON wrapped in markdown fences', () => {
    const value = safeJsonParse('```json\n{"total": 88}\n```', { total: 0 });

    assert.deepEqual(value, { total: 88 });
  });

  it('falls back when the payload is not valid JSON', () => {
    const fallback = { total: 0 };

    assert.deepEqual(safeJsonParse('{bad json}', fallback), fallback);
  });
});

describe('normalizeChunk', () => {
  it('returns a nested property when the requested key exists', () => {
    assert.deepEqual(normalizeChunk({ basicInfo: { name: '张三' } }, 'basicInfo', { name: '' }), {
      name: '张三',
    });
  });

  it('falls back when the nested property is null', () => {
    assert.deepEqual(normalizeChunk({ skillTags: null }, 'skillTags', []), []);
  });

  it('passes through the parsed value when no nested property exists', () => {
    assert.deepEqual(normalizeChunk(['React', 'TypeScript'], 'skillTags', []), ['React', 'TypeScript']);
  });
});

describe('rowToCandidate', () => {
  it('maps database rows to API candidate payloads', () => {
    const row = {
      id: 'candidate-1',
      filename: 'frontend-zhangsan.pdf',
      file_url: '/uploads/frontend-zhangsan.pdf',
      raw_text: 'raw resume text',
      cleaned_text: 'cleaned resume text',
      structured_data: { basicInfo: { name: '张三' } },
      status: 'screened',
      created_at: '2026-05-24T00:00:00.000Z',
      updated_at: '2026-05-24T01:00:00.000Z',
    };

    assert.deepEqual(rowToCandidate(row), {
      id: 'candidate-1',
      filename: 'frontend-zhangsan.pdf',
      fileUrl: '/uploads/frontend-zhangsan.pdf',
      rawText: 'raw resume text',
      cleanedText: 'cleaned resume text',
      structuredData: { basicInfo: { name: '张三' } },
      status: 'screened',
      createdAt: '2026-05-24T00:00:00.000Z',
      updatedAt: '2026-05-24T01:00:00.000Z',
    });
  });
});