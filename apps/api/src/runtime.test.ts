import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, it } from 'node:test';

const apiDir = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

describe('compiled api entrypoint', () => {
  it('does not fail on relative ESM imports at runtime', () => {
    execFileSync('pnpm', ['build'], {
      cwd: apiDir,
      env: process.env,
      stdio: 'pipe',
    });

    const result = spawnSync('node', ['dist/index.js'], {
      cwd: apiDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: '',
      },
      timeout: 15000,
    });

    const output = `${result.stdout}${result.stderr}`;

    assert.doesNotMatch(output, /ERR_MODULE_NOT_FOUND/);
    assert.match(output, /DATABASE_URL is required/);
  });
});