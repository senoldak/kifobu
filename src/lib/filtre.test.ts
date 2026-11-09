import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtreSlug, filtreDegerleri, filtreUyar, turNormallestir } from './filtre.ts';

const h = (tur?: string, paraBirimi = 'USD') => ({ data: { tur, paraBirimi } });

test('slug: Türkçe harfler ve boşluk', () => {
  assert.equal(filtreSlug('Seri A'), 'seri-a');
  assert.equal(filtreSlug('Tohum Öncesi'), 'tohum-oncesi');
  assert.equal(filtreSlug('İlk Fon'), 'ilk-fon');
});

test('turNormallestir: varyasyonlar standart kategoriye eşlenir', () => {
  assert.equal(turNormallestir('Fon Kapama'), 'Fon Kapanışı');
  assert.equal(turNormallestir('Fon Kapanış'), 'Fon Kapanışı');
  assert.equal(turNormallestir('Pre-Seed'), 'Tohum Öncesi');
  assert.equal(turNormallestir('Ön Tohum'), 'Tohum Öncesi');
  assert.equal(turNormallestir('Seed'), 'Tohum');
  assert.equal(turNormallestir('Series A'), 'Seri A');
  assert.equal(turNormallestir('Bridge'), 'Köprü');
  assert.equal(turNormallestir('Bilinmeyen Tur'), 'Bilinmeyen Tur');
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

test('tur normalizasyonu: varyasyonlar parçalanmadan aynı başlık altında toplanır', () => {
  const l = [
    h('Fon Kapama'),
    h('Fon Kapanışı'),
    h('Fon Kapama'),
    h('Pre-Seed'),
    h('Tohum Öncesi'),
    h('Ön Tohum'),
  ];
  const d = filtreDegerleri(l, 'tur');
  assert.deepEqual(
    d.map((x) => [x.slug, x.ad, x.sayi]),
    [
      ['fon-kapanisi', 'Fon Kapanışı', 3],
      ['tohum-oncesi', 'Tohum Öncesi', 3],
    ],
  );
  assert.ok(filtreUyar(h('Fon Kapama'), 'tur', 'fon-kapanisi'));
  assert.ok(filtreUyar(h('Fon Kapanışı'), 'tur', 'fon-kapanisi'));
  assert.ok(filtreUyar(h('Pre-Seed'), 'tur', 'tohum-oncesi'));
  assert.ok(filtreUyar(h('Tohum Öncesi'), 'tur', 'tohum-oncesi'));
});

test('tur normalizasyonu: harita dışı turlarda en çok kullanılan yazım başlık olur', () => {
  const l = [
    h('özel tur'),
    h('Özel Tur'),
    h('Özel Tur'),
  ];
  const d = filtreDegerleri(l, 'tur');
  assert.equal(d[0].slug, 'ozel-tur');
  assert.equal(d[0].ad, 'Özel Tur');
});

test('tur normalizasyonu: yeni varyasyonlar (pre-tohum, melek, büyüme finansmanı)', () => {
  assert.equal(turNormallestir('pre-Tohum'), 'Tohum Öncesi');
  assert.equal(turNormallestir('Büyüme Finansmanı'), 'Büyüme');
  assert.equal(turNormallestir('Melek'), 'Melek Yatırım');
  assert.equal(turNormallestir('Pre-Seri A'), 'Seri A Öncesi');
});

