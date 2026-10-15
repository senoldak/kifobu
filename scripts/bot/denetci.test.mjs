import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baslikKontrol, kesinKontroller } from './denetci.mjs';
import { YAZIM_KURALLARI } from './yazar.mjs';

test('başlık aranan kelimeyle başlar: iki noktalı önek reddedilir', () => {
  assert.equal(baslikKontrol('SPK: Kitle fonlama platformlarına yeni kural').length, 1);
  assert.equal(baslikKontrol('Kurum: Örnek Girişim 5 milyon dolar yatırım aldı').length, 1);
  assert.match(baslikKontrol('Son dakika: Örnek Platform yeni kampanya açtı')[0], /iki noktalı/);
});

test('belirsiz başlangıç, soru başlık ve çok kısa başlık reddedilir', () => {
  assert.match(baslikKontrol('Bu girişim 5 milyon dolar yatırım aldı')[0], /belirsiz/);
  assert.match(baslikKontrol('İşte kitle fonlamasında yeni dönem başlıyor')[0], /belirsiz/);
  assert.match(baslikKontrol('Bir şirket Seri A turunu kapattı')[0], /belirsiz/);
  assert.ok(baslikKontrol('Kitle fonlaması neden büyüyor?').some((s) => /soru/.test(s)));
  assert.ok(baslikKontrol('Yeni yatırım').some((s) => /kısa/.test(s)));
});

test('aranan kelimeyle başlayan düz başlık geçer; saat ve özel adlar takılmaz', () => {
  assert.deepEqual(baslikKontrol('Örnek Girişim, Seri A turunda 5 milyon dolar yatırım aldı'), []);
  assert.deepEqual(baslikKontrol('SPK, kitle fonlama platformlarına yeni yükümlülük getirdi'), []);
  assert.deepEqual(baslikKontrol('Birleşik Krallık merkezli Örnek Labs tohum turunda yatırım aldı'), []);
  assert.deepEqual(baslikKontrol('Örnek Platform kampanyası saat 10:30 itibarıyla hedefe ulaştı'), []);
  assert.deepEqual(baslikKontrol('Bulut girişimi Örnek 3 milyon euro topladı'), []);
});

test('başlık kuralı kesin kontrollere ve yazım kurallarına dahil', () => {
  const sorunlar = kesinKontroller({ title: 'SPK: Örnek karar', description: '', body: '', kunye: {} }, '');
  assert.ok(sorunlar.some((s) => /iki noktalı/.test(s)));
  assert.match(YAZIM_KURALLARI, /iki noktalı önekle başlama/);
});
