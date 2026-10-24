import test from 'node:test';
import assert from 'node:assert/strict';
import { kisiYazariMi, gorunenYazarAdi, SITE, YAZAR } from './site.ts';

test('bot haberi ve bülten: site adı', () => {
  assert.equal(kisiYazariMi({ uretim: 'yapay-zeka', category: 'yatirimlar', yaziTuru: 'haber', author: 'kifobu' }), false);
  assert.equal(kisiYazariMi({ uretim: 'yapay-zeka', category: 'gunluk-bulten' }), false);
  assert.equal(gorunenYazarAdi({ uretim: 'yapay-zeka', category: 'kampanyalar' }), SITE.name);
});

test('botun analiz kategorisindeki derlemesi kişi imzası almaz', () => {
  assert.equal(kisiYazariMi({ uretim: 'yapay-zeka', category: 'analiz' }), false);
});

test('özel analiz (bot dışı üretim) Şenol Dak', () => {
  assert.equal(kisiYazariMi({ uretim: 'yazi-isleri', category: 'analiz' }), true);
  assert.equal(kisiYazariMi({ uretim: 'editor', category: 'analiz' }), true);
});

test('yaziTuru analiz: üretimi yapay-zeka olsa da Şenol Dak; analiz olmayan aynı yazı site adı', () => {
  assert.equal(kisiYazariMi({ yaziTuru: 'analiz', category: 'yatirimlar', uretim: 'yapay-zeka' }), true);
  assert.equal(kisiYazariMi({ yaziTuru: 'haber', category: 'yatirimlar', uretim: 'yapay-zeka' }), false);
});

test('açıklayıcı ve referans, üretimi ne olursa olsun Şenol Dak', () => {
  assert.equal(kisiYazariMi({ uretim: 'yapay-zeka', yaziTuru: 'aciklayici', category: 'girisimler' }), true);
  assert.equal(kisiYazariMi({ uretim: 'yazi-isleri', yaziTuru: 'referans' }), true);
  assert.equal(gorunenYazarAdi({ yaziTuru: 'referans' }), YAZAR.ad);
});

test('köşe yazısı (author: Şenol Dak) Şenol Dak', () => {
  assert.equal(kisiYazariMi({ author: 'Şenol Dak', category: 'gundem' }), true);
});

test('boş veri: site adı', () => {
  assert.equal(kisiYazariMi(undefined), false);
  assert.equal(kisiYazariMi({}), false);
});
