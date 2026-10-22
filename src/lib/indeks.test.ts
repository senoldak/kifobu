import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EN_AZ_KELIME, bolumIndekslenir, indekslenir, kelimeSayisi } from './indeks.ts';

const metin = (n: number) => Array.from({ length: n }, (_, i) => `kelime${i}`).join(' ');

test('kelime sayısı bağlantı adreslerini ve resimleri saymaz', () => {
  assert.equal(kelimeSayisi('- [Bumble satın alınıyor](/haber/bumble-ithaca/)'), 3);
  assert.equal(kelimeSayisi('![kapak](kapak.png) Girişim 1,1 milyon dolar aldı.'), 5);
});

test('kısa, taslak ya da işaretli haber indekslenmez', () => {
  assert.equal(indekslenir({ govde: metin(EN_AZ_KELIME) }), true);
  assert.equal(indekslenir({ govde: metin(EN_AZ_KELIME - 1) }), false);
  assert.equal(indekslenir({ govde: metin(300), noindex: true }), false);
  assert.equal(indekslenir({ govde: metin(300), draft: true }), false);
});

test('indekslenebilir haberi olmayan bölüm kapanır, bülten bölümü açık kalır', () => {
  assert.equal(bolumIndekslenir('kampanyalar', 0), false);
  assert.equal(bolumIndekslenir('kampanyalar', 1), true);
  assert.equal(bolumIndekslenir('gunluk-bulten', 0), true);
});
