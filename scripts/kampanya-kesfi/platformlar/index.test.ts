import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OKUYUCULAR } from './index.ts';

test('OKUYUCULAR: her anahtar okuyucunun platform adına eşit', () => {
  for (const [anahtar, okuyucu] of Object.entries(OKUYUCULAR)) {
    assert.equal(okuyucu.platform, anahtar);
  }
});

test('OKUYUCULAR: tam sekiz onaylı platform var', () => {
  assert.deepEqual(Object.keys(OKUYUCULAR).sort(), [
    'birikimfon', 'ecofolio', 'fonangels', 'fonbulucu', 'fongogo', 'fonventure', 'startupburada', 'trinkfon',
  ]);
});
