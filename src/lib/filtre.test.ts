import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtreSlug, filtreDegerleri, filtreUyar } from './filtre.ts';

const h = (tur?: string, paraBirimi = 'USD') => ({ data: { tur, paraBirimi } });

test('slug: Türkçe harfler ve boşluk', () => {
  assert.equal(filtreSlug('Seri A'), 'seri-a');
  assert.equal(filtreSlug('Tohum Öncesi'), 'tohum-oncesi');
  assert.equal(filtreSlug('İlk Fon'), 'ilk-fon');
});

test('değerler: harf farkı birleşir, 3 altı atılır, çoktan aza sıralanır', () => {
  const l = [h('Tohum'), h('Tohum'), h('Tohum'), h('Tohum öncesi'), h('Tohum Öncesi'), h('Tohum Öncesi'), h('Seri A'), h('Seri A'), h()];
  const d = filtreDegerleri(l, 'tur');
  assert.deepEqual(d.map((x) => [x.slug, x.sayi]), [['tohum', 3], ['tohum-oncesi', 3]]);
  assert.equal(d[1].ad, 'Tohum Öncesi');
  assert.equal(filtreDegerleri(l, 'paraBirimi')[0].slug, 'usd');
  assert.ok(filtreUyar(h('Tohum öncesi'), 'tur', 'tohum-oncesi'));
  assert.ok(!filtreUyar(h(), 'tur', 'tohum'));
});
