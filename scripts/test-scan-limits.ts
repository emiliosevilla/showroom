/**
 * Automated gate for scanDirectory folder/file limits (Phase 4).
 * Run: npm run test:scan-limits
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_FILES, MAX_FOLDERS, scanDirectory } from '../src/utils/fileSystem.ts';

type MockEntry =
  | { kind: 'file'; name: string }
  | { kind: 'directory'; name: string; children: MockEntry[] };

function mockDirectory(entries: MockEntry[]) {
  return {
    values: async function* () {
      for (const entry of entries) {
        if (entry.kind === 'file') {
          yield { kind: 'file' as const, name: entry.name };
        } else {
          yield {
            kind: 'directory' as const,
            name: entry.name,
            values: mockDirectory(entry.children).values,
          };
        }
      }
    },
  };
}

test('exports documented scan limits', () => {
  assert.equal(MAX_FOLDERS, 100);
  assert.equal(MAX_FILES, 1000);
});

test('allows up to MAX_FILES files', async () => {
  const entries: MockEntry[] = Array.from({ length: MAX_FILES }, (_, i) => ({
    kind: 'file',
    name: `f${i}.txt`,
  }));
  const result = await scanDirectory(mockDirectory(entries));
  assert.equal(result.filter((e) => e.kind === 'file').length, MAX_FILES);
});

test('throws LIMIT_EXCEEDED when files exceed MAX_FILES', async () => {
  const entries: MockEntry[] = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({
    kind: 'file',
    name: `f${i}.txt`,
  }));
  await assert.rejects(
    () => scanDirectory(mockDirectory(entries)),
    (err: unknown) => err instanceof Error && err.message === 'LIMIT_EXCEEDED',
  );
});

test('allows up to MAX_FOLDERS directories', async () => {
  const entries: MockEntry[] = Array.from({ length: MAX_FOLDERS }, (_, i) => ({
    kind: 'directory',
    name: `d${i}`,
    children: [],
  }));
  const result = await scanDirectory(mockDirectory(entries));
  assert.equal(result.filter((e) => e.kind === 'directory').length, MAX_FOLDERS);
});

test('throws LIMIT_EXCEEDED when folders exceed MAX_FOLDERS', async () => {
  const entries: MockEntry[] = Array.from({ length: MAX_FOLDERS + 1 }, (_, i) => ({
    kind: 'directory',
    name: `d${i}`,
    children: [],
  }));
  await assert.rejects(
    () => scanDirectory(mockDirectory(entries)),
    (err: unknown) => err instanceof Error && err.message === 'LIMIT_EXCEEDED',
  );
});
