import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunOzeti, degisim, yuzdeYaz, medyan, tekillestir, seriBirlestir } from './sekundery.mjs';

const i = (tur, birimFiyat, adet = 100, ek = {}) => ({ kod: 'ACTVB', grup: 'B', tur, adet, birimFiyat, tutar: adet * birimFiyat, ...ek });

test('medyan: tek ve çift sayıda', () => {
  assert.equal(medyan([3, 1, 2]), 2);
  assert.equal(medyan([4, 1, 2, 3]), 2.5);
  assert.equal(medyan([]), null);
});

test('gunOzeti: satışta en düşük, alışta en yüksek; medyan ve toplamlar', () => {
  const o = gunOzeti([i('satis', 4.6), i('satis', 19.5), i('satis', 25), i('alis', 3.46), i('alis', 2.76), i('alis', 0.35)])['ACTVB-B'];
  assert.equal(o.satis.enIyi, 4.6);
  assert.equal(o.satis.medyan, 19.5);
  assert.equal(o.satis.ilanSayisi, 3);
  assert.equal(o.alis.enIyi, 3.46);
  assert.equal(o.alis.medyan, 2.76);
});

test('gunOzeti: pay grupları ayrı tutulur, tek taraflı girişimde öteki taraf null', () => {
  const o = gunOzeti([i('satis', 5), i('satis', 7, 10, { grup: 'D' })]);
  assert.equal(o['ACTVB-B'].satis.enIyi, 5);
  assert.equal(o['ACTVB-D'].satis.enIyi, 7);
  assert.equal(o['ACTVB-B'].alis, null);
});

test('tekillestir: birkaç turda görülen aynı ilan bir kez sayılır', () => {
  assert.equal(tekillestir([i('satis', 5, 1, { id: 9 }), i('satis', 5, 1, { id: 9 }), i('satis', 5, 1, { id: 10 })]).length, 2);
  // kimliksiz iki eş ilan iki ayrı ilandır (Excel: ACTVB-B alış medyanı 2,76 ancak böyle tutar)
  assert.equal(tekillestir([i('satis', 5), i('satis', 5)]).length, 2);
});

test('degisim: kendi dağıtım fiyatına göre, kesilerek (Excel GECE kayma hatası tekrarlanmaz)', () => {
  // ACTVB-B: en düşük satış 4,60, dağıtım 6,17 → %−25,44 (GECE'de alt satırın 6,55'iyle %−29,77 çıkıyordu)
  assert.equal(degisim(4.6, 6.17), -25.44);
  assert.equal(degisim(49, 16.25), 201.53);
  assert.equal(degisim(5, 0), null);
});

test('yuzdeYaz: işaret ve Türkçe ondalık', () => {
  assert.equal(yuzdeYaz(-25.44), '%−25,44');
  assert.equal(yuzdeYaz(201.53), '%+201,53');
  assert.equal(yuzdeYaz(null), '');
});

test('seriBirlestir: Excel geçmişi ve turlar; aynı günde tur kazanır', () => {
  const s = seriBirlestir(
    [{ tarih: '2024-01-05', enDusukSatis: 9.25, medyanSatis: 15 }, { tarih: '2026-11-10', enDusukSatis: 1, medyanSatis: 1 }],
    [{ tarih: '2026-11-10', ozet: { satis: { enIyi: 4.6, medyan: 19.5 }, alis: { enIyi: 3.46, medyan: 2.76 } } }],
  );
  assert.equal(s.length, 2);
  assert.equal(s[1].enDusukSatis, 4.6);
  assert.equal(s[1].enYuksekAlis, 3.46);
  assert.equal(s[0].enYuksekAlis, null);
});

test('kapanisDegeri ve gecenDonem: dönemin son gözlemi, verisi olan son kapanmış dönem', async () => {
  const { kapanisDegeri, gecenDonem } = await import('./sekundery.mjs');
  const D = [{ acilis: '2026-07-20', kapanis: '2026-07-26' }, { acilis: '2026-10-05', kapanis: '2026-10-11' }, { acilis: '2026-11-09', kapanis: '2026-11-15' }];
  const s = [{ tarih: '2026-07-21', enDusukSatis: 5 }, { tarih: '2026-07-25', enDusukSatis: 4.5 }, { tarih: '2026-07-26', enDusukSatis: null }, { tarih: '2026-11-10', enDusukSatis: 6 }];
  assert.deepEqual(kapanisDegeri(s, D[0]), { tarih: '2026-07-25', deger: 4.5 });
  assert.equal(kapanisDegeri(s, D[1]), null);
  assert.deepEqual(gecenDonem(D, [s], '2026-11-10'), D[0]); // Ekim döneminde veri yok, Temmuz'a düşer
  assert.equal(gecenDonem(D, [s], '2026-07-01'), null);
});

test('donemOrtalamasi: dönem içindeki gözlemlerin ortalaması', async () => {
  const { donemOrtalamasi } = await import('./sekundery.mjs');
  const s = [{ tarih: '2026-07-19', enDusukSatis: 99 }, { tarih: '2026-07-21', enDusukSatis: 5 }, { tarih: '2026-07-25', enDusukSatis: 4 }, { tarih: '2026-07-26', enDusukSatis: null }];
  assert.equal(donemOrtalamasi(s, { acilis: '2026-07-20', kapanis: '2026-07-26' }), 4.5);
  assert.equal(donemOrtalamasi(s, { acilis: '2026-10-05', kapanis: '2026-10-11' }), null);
  const m = [{ tarih: '2026-07-21', medyanSatis: 6 }, { tarih: '2026-07-22', medyanSatis: 8 }];
  assert.equal(donemOrtalamasi(m, { acilis: '2026-07-20', kapanis: '2026-07-26' }, 'medyanSatis'), 7);
});

test('gunOzeti: kısmen karşılanan ilanlar; eski kayıtta bilinmiyor', () => {
  const o = gunOzeti([i('satis', 5, 100, { id: 1, islenen: 40 }), i('satis', 6, 100, { id: 2, islenen: 0 })]);
  assert.equal(o['ACTVB-B'].satis.islenen, 40);
  assert.equal(o['ACTVB-B'].satis.kismi, 1);
  const e = gunOzeti([i('satis', 5, 100, { id: 3 })]);
  assert.equal(e['ACTVB-B'].satis.islenen, null);
});

test('defterOzeti: Excel DEFTER ölçüleri, tek ilan göstermeden', async () => {
  const { defterOzeti } = await import('./sekundery.mjs');
  const l = (birimFiyat, adet) => ({ birimFiyat, adet, tutar: birimFiyat * adet });
  const o = defterOzeti([l(10, 100), l(12, 300), l(15, 100), l(40, 500)], [l(8, 200), l(5, 800)]);
  assert.equal(o.fark, 20); // (10-8)/10
  assert.equal(o.satis.ortalama, Math.round(((1000 + 3600 + 1500 + 20000) / 1000) * 100) / 100);
  assert.equal(o.satis.enIyiPay, 10);
  assert.equal(o.satis.ilkUcPay, 50);
  assert.equal(o.alis.enIyiPay, 20);
  assert.equal(o.satisPayi, Math.round((26100 / (26100 + 5600)) * 1000) / 10);
  const adet = o.dagilim.reduce((t, d) => t + d.satisAdet + d.alisAdet, 0);
  assert.equal(adet, 2000); // her pay bir dilime düşer
  assert.equal(defterOzeti([], []).fark, null);
  assert.equal(defterOzeti([l(5, 10)], []).dagilim.length, 1);
});

test('defterOzeti: Excel DEFTER adet ölçüleri (NGAYT örneğinin kendi satırlarıyla)', async () => {
  const { defterOzeti } = await import('./sekundery.mjs');
  const l = (birimFiyat, adet) => ({ birimFiyat, adet, tutar: Math.round(birimFiyat * adet * 100) / 100 });
  // DEFTER: en iyi satış 8,99 × 1.000, en iyi alış 6,51 × 1.000 → WMP 7,75; III = 1.000 ÷ alış adedi
  const o = defterOzeti([l(8.99, 1000), l(9.8, 5000)], [l(6.51, 1000), l(6.5, 500)]);
  assert.equal(o.ortaFiyat, 7.75);
  assert.equal(o.alis.enIyiPay, Math.round((1000 / 1500) * 1000) / 10);
  assert.equal(o.adetOrani, 4);
  assert.equal(o.adetFarki, -4500);
  assert.equal(o.fark, Math.round(((8.99 - 6.51) / 8.99) * 10000) / 100);
});

test('gunOzeti: tekliflere açık ilan sayısı; eski kayıtta bilinmiyor', () => {
  const o = gunOzeti([i('satis', 5, 100, { id: 1, teklif: true }), i('satis', 6, 100, { id: 2, teklif: false })]);
  assert.equal(o['ACTVB-B'].satis.teklif, 1);
  assert.equal(gunOzeti([i('satis', 5, 100, { id: 3 })])['ACTVB-B'].satis.teklif, null);
});

test('gunOzeti: yeni ilan sayısı ve medyan ilan yaşı; eski kayıtta bilinmiyor', () => {
  const o = gunOzeti([
    i('satis', 5, 100, { id: 1, yayin: '2026-11-11T09:00:00' }),
    i('satis', 6, 100, { id: 2, yayin: '2026-11-01T09:00:00' }),
    i('satis', 7, 100, { id: 3, yayin: '2026-10-22T09:00:00' }),
  ], '2026-11-11');
  assert.equal(o['ACTVB-B'].satis.yeni, 1);
  assert.equal(o['ACTVB-B'].satis.yasMedyan, 10);
  assert.equal(gunOzeti([i('satis', 5, 100, { id: 4 })], '2026-11-11')['ACTVB-B'].satis.yeni, null);
});

test('donemIciDegisim: ilk ve son gözlem', async () => {
  const { donemIciDegisim } = await import('./sekundery.mjs');
  const d = { acilis: '2026-07-20', kapanis: '2026-07-26' };
  assert.equal(donemIciDegisim([{ tarih: '2026-07-20', enDusukSatis: 5 }, { tarih: '2026-07-22', enDusukSatis: 4 }, { tarih: '2026-07-26', enDusukSatis: 4.5 }], d), -10);
  assert.equal(donemIciDegisim([{ tarih: '2026-07-21', enDusukSatis: 5 }], d), null);
});
