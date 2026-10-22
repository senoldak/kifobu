import test from 'node:test';
import assert from 'node:assert/strict';
import { kunyeNotu, kitleFonlamasiMi, RISK_NOTU, GENEL_NOT } from './site.ts';

test('platform alanı dolu haberde kitle fonlaması riski gösterilir', () => {
  assert.equal(kunyeNotu({ platform: 'Kickstarter', category: 'yatirimlar' }), RISK_NOTU);
  assert.equal(kunyeNotu({ category: 'kampanyalar' }), RISK_NOTU);
});

test('VC turu haberinde kitle fonlaması riski çıkmaz', () => {
  const n = kunyeNotu({ category: 'yatirimlar' });
  assert.equal(n, GENEL_NOT);
  assert.ok(!/kitle fonlaması/i.test(n));
  assert.equal(kitleFonlamasiMi({ platform: '  ', category: 'girisimler' }), false);
});
