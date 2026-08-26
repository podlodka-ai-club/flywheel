import { expect, test } from 'vitest';

import { loadConfig } from '../src/config.ts';

test('defaults apply when env is unset', () => {
  const cfg = loadConfig({});
  expect(cfg.PORT).toBe(3000);
  expect(cfg.PGLITE_DATA_DIR).toBe('./.data');
});

test('environment overrides defaults', () => {
  const cfg = loadConfig({ PORT: '4000', PGLITE_DATA_DIR: '/tmp/triage' });
  expect(cfg.PORT).toBe(4000);
  expect(cfg.PGLITE_DATA_DIR).toBe('/tmp/triage');
});

test('invalid PORT throws', () => {
  expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow(/Invalid PORT/);
});
