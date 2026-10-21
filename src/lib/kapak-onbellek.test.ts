import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const SVG = (metin: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#f5c400"/><text x="10" y="35" fill="#111" font-size="20">${metin}</text></svg>`;

test('kapak önbelleği: aynı SVG ikinci kez çizilmez, farklı SVG çizilir', async () => {
  process.env.KAPAK_ONBELLEK = await mkdtemp(path.join(os.tmpdir(), 'kapak-onbellek-'));
  const { onbellekliPng, sayac, ONBELLEK_DIZINI } = await import('./kapak-onbellek.mjs');
  assert.equal(ONBELLEK_DIZINI, process.env.KAPAK_ONBELLEK);

  const a1 = await onbellekliPng(SVG('bir'));
  const a2 = await onbellekliPng(SVG('bir'));
  const b = await onbellekliPng(SVG('iki'));

  assert.equal(sayac.cizildi, 2);
  assert.equal(sayac.hazir, 1);
  assert.ok(a1.equals(a2), 'önbellekten dönen PNG çizilenle aynı olmalı');
  assert.ok(!a1.equals(b));
  assert.equal(a1.subarray(1, 4).toString(), 'PNG');
  assert.equal((await readdir(ONBELLEK_DIZINI)).length, 2);
});
