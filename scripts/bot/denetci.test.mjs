import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baslikKontrol, ekAlanlariSuz, kesinKontroller } from './denetci.mjs';
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

// Standartlar Faz 1: ölçek kontrolü (Tonbo/Zetwerk vakası: crore milyara çevrilirken 100 kat şişti).
test('kesinKontroller: metindeki ve künyedeki 100 kat şişmiş tutar ölçek hatası olur', () => {
  const kaynak = 'Tonbo Imaging Rs 852 crore IPO subscribed 7.78 times. Zetwerk raised Rs 5,012.3 crore.';
  const metin = { title: 'Tonbo Imaging halka arzı yaklaşık sekiz kat talep gördü', description: 'Arz 852 milyar rupi büyüklüğünde.', body: 'Arz 7,78 kat talep gördü.', kunye: {} };
  assert.ok(kesinKontroller(metin, kaynak).some((s) => s.startsWith('Ölçek hatası') && s.includes('852 milyar')));
  const kunye = { ...metin, description: 'Arz 852 crore rupi büyüklüğünde.', kunye: { hedef: 5012300000000 } };
  const s = kesinKontroller(kunye, kaynak);
  assert.ok(s.some((x) => x.startsWith('Ölçek hatası') && x.includes('5012300000000')), JSON.stringify(s));
  assert.ok(!kesinKontroller({ ...kunye, kunye: { hedef: 50123000000 } }, kaynak).some((x) => x.startsWith('Ölçek hatası')));
});

test('ekAlanlariSuz: doğrulanamayan rakam ya da ölçek hatası taşıyan madde düşer, haber durmaz', () => {
  const kaynak = 'Rs 852 crore IPO subscribed 7.78 times; retail portion 7.13 times.';
  const h = { title: 't', body: 'b', why_matters: 'Talep 9,9 kat oldu.', key_points: ['Arz 852 milyar rupi', 'İkinci günde 7,78 kat talep', 'Bireysel kota 7,13 kat aşıldı'] };
  const r = ekAlanlariSuz(h, kaynak);
  assert.equal(r.why_matters, '');
  assert.deepEqual(r.key_points, ['İkinci günde 7,78 kat talep', 'Bireysel kota 7,13 kat aşıldı']);
  assert.equal(ekAlanlariSuz({ ...h, why_matters: 'Savunma alanında yüksek talep var.' }, kaynak).why_matters, 'Savunma alanında yüksek talep var.');
});
