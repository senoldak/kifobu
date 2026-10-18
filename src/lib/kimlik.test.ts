import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KIMLIK, cubukOlcegi, durumEtiketi, platformRengi, tohumIsaretiSvg, tutarKisa, yuzdeKesik } from './kimlik.ts';

test('marka ve veri renkleri BRAND.md ile aynı', () => {
  assert.deepEqual(KIMLIK, {
    kagit: '#f7f5ef', murekkep: '#141a17', sari: '#e8b40c', gri: '#5d645f', cizgi: '#dcd9cf', yesil: '#10b981', asim: '#a7e9cf',
  });
});

test('yüzde iki ondalık ve kesilerek', () => {
  assert.equal(yuzdeKesik(96.2799), '%96,27');
  assert.equal(yuzdeKesik(99.996), '%99,99');
  assert.equal(yuzdeKesik(100), '%100,00');
  assert.equal(yuzdeKesik(112.4), '%112,40');
  assert.equal(yuzdeKesik(null), '—');
  assert.equal(yuzdeKesik(Number.NaN), '—');
});

test('çubuk: hedef çizgisi %100 noktasında, aşım ayrı', () => {
  assert.deepEqual(cubukOlcegi(71.02), { dolu: 71.02, asim: 0, hedef: 100 });
  assert.deepEqual(cubukOlcegi(100), { dolu: 100, asim: 0, hedef: 100 });
  const a = cubukOlcegi(125);
  assert.equal(a.hedef, 80);
  assert.equal(a.dolu, 80);
  assert.equal(a.asim, 20);
  assert.deepEqual(cubukOlcegi(-5), { dolu: 0, asim: 0, hedef: 100 });
});

test('durum etiketleri', () => {
  assert.deepEqual(durumEtiketi('suruyor'), { metin: 'FON TOPLUYOR', tur: 'cerceve' });
  assert.deepEqual(durumEtiketi('yeni'), { metin: 'FON TOPLUYOR', tur: 'cerceve' });
  assert.deepEqual(durumEtiketi('basarili'), { metin: 'FONLANDI', tur: 'yesil' });
  assert.deepEqual(durumEtiketi('basarisiz'), { metin: 'FONLANAMADI', tur: 'murekkep' });
  assert.equal(durumEtiketi(undefined), null);
});

test('tohum işareti: 233 / 89 tohum, kol sarı, metin yok', () => {
  const b = tohumIsaretiSvg({ boyut: 200 });
  assert.equal((b.match(/<circle/g) ?? []).length, 233);
  assert.equal((b.match(/fill="#e8b40c"/g) ?? []).length, 11);
  assert.doesNotMatch(b, /<text/);
  assert.match(b, /width="200" height="200"/);
  assert.equal((tohumIsaretiSvg({ boyut: 32, kucuk: true }).match(/<circle/g) ?? []).length, 89);
  assert.match(tohumIsaretiSvg({ boyut: 200, zemin: 'koyu' }), /fill="#f7f5ef"/);
});

test('platform rengi bülten verisinden; büyük-küçük harf fark etmez; bilinmeyen gri', () => {
  const liste = [{ ad: 'fonangels', renk: '#f47b3d' }, { ad: 'ecofolio', renk: '#009bae' }];
  assert.equal(platformRengi('fonangels', liste), '#f47b3d');
  assert.equal(platformRengi('EcoFolio', liste), '#009bae');
  assert.equal(platformRengi('yok', liste), KIMLIK.gri);
});

test('kısa tutar: simge önde, milyon/milyar iki ondalık aşağı, bin tam sayı aşağı', () => {
  assert.equal(tutarKisa(4_495_800), '₺4,49 milyon');
  assert.equal(tutarKisa(4_000_000), '₺4,00 milyon');
  assert.equal(tutarKisa(1_600_000_000), '₺1,60 milyar');
  assert.equal(tutarKisa(999_600), '₺999 bin');
  assert.equal(tutarKisa(850_000), '₺850 bin');
  assert.equal(tutarKisa(950), '₺950');
  assert.equal(tutarKisa(10_690_000, 'EUR'), '€10,69 milyon');
  assert.equal(tutarKisa(200_000_000, 'USD'), '$200,00 milyon');
});

test('negatif yüzde sıfıra doğru kesilir, eksi işareti önde', () => {
  assert.equal(yuzdeKesik(-0.001), '%0,00');
  assert.equal(yuzdeKesik(-1.239), '-%1,23');
  assert.equal(yuzdeKesik(-0), '%0,00');
});

test('kayan nokta artığı düzeltilir ama gerçek küsurat yukarı itilmez', () => {
  assert.equal(yuzdeKesik(0.29 * 100), '%29,00'); // 28,999999999999996
  assert.equal(yuzdeKesik(1.15 * 100), '%115,00'); // 114,99999999999999
  assert.equal(yuzdeKesik(99.99999999999), '%99,99');
  assert.equal(yuzdeKesik(((1e13 - 1) / 1e13) * 100), '%99,99');
});

test('kapanmış kampanya: sona eren, iptal edilen ve geri çekilen; büyük-küçük harf fark etmez', async () => {
  const { kapandiMi } = await import('./kimlik.ts');
  for (const d of ['SONA ERDİ', 'İPTAL EDİLDİ', 'GERİ ÇEKİLDİ', 'sona erdi', 'iptal edildi', 'geri çekildi']) assert.equal(kapandiMi(d), true, d);
  for (const d of ['son 18 gün', 'SON GÜN', 'ÖN TALEP', 'Aktif', '']) assert.equal(kapandiMi(d), false, d);
});
