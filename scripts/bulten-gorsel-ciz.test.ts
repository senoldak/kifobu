import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BULTEN } from '../src/data/bulten.ts';
import { bultenSvgCiz } from './bulten-gorsel-ciz.ts';

const oznitelik = (svg: string, ad: string) => Number(svg.match(new RegExp(`data-${ad}="([0-9.]+)"`))?.[1]);

for (const mod of ['post', 'story'] as const) {
  test(`18:00 bülteni ${mod}: ayçiçeği resmi yerine tohum işareti`, () => {
    const s = bultenSvgCiz(mod);
    assert.doesNotMatch(s, /<image/);
    assert.match(s, /fill="#e8b40c"/);
  });

  test(`18:00 bülteni ${mod}: tarih ve sayı eski yazımla ("18 Ekim 2026 / 1531")`, () => {
    assert.match(bultenSvgCiz(mod), new RegExp(`data-tarih="${BULTEN.tarih} / ${BULTEN.sayi}"`));
  });

  test(`18:00 bülteni ${mod}: MKK kutusu ile alt bant arasında en az bir satır boşluk`, () => {
    const s = bultenSvgCiz(mod);
    assert.ok(oznitelik(s, 'mkk-alt') + 24 <= oznitelik(s, 'alt-ust'), `${oznitelik(s, 'mkk-alt')} / ${oznitelik(s, 'alt-ust')}`);
  });
}

const yediYakinda = ['NARPOS', 'NEURATURK', 'NEUROX', 'QUAD ROBOTICS', 'TWINUP', 'DEXCOOK', 'MEDICALTEX'].map((ad) => ({ ad, platform: 'fonbulucu' }));

for (const mod of ['post', 'story'] as const) {
  test(`yakında bölümü ${mod}: üçten fazla kampanyanın hepsi çizilir, MKK boşluğu korunur`, () => {
    const s = bultenSvgCiz(mod, { ...BULTEN, yakinda: yediYakinda });
    for (const y of yediYakinda) assert.match(s, new RegExp(`data-yakinda="${y.ad}"`));
    assert.ok(oznitelik(s, 'mkk-alt') + 24 <= oznitelik(s, 'alt-ust'));
  });
}

test('yakında bölümü: üç ve daha az kampanya tek satırda', () => {
  const s = bultenSvgCiz('post', { ...BULTEN, yakinda: yediYakinda.slice(0, 2) });
  const ys = [...s.matchAll(/data-yakinda="[^"]+" x="[^"]+" y="([0-9.]+)"/g)].map((m) => m[1]);
  assert.equal(ys.length, 2);
  assert.equal(new Set(ys).size, 1);
});

test('değerlemesi 0 olan girişimde değerleme yerine "—" çizilir', () => {
  const g = { ...BULTEN.girisimler[0], degerleme: 0 };
  const svg = bultenSvgCiz('post', { ...BULTEN, girisimler: [g] });
  assert.match(svg, /data-degerleme="—"/);
  assert.doesNotMatch(svg, /data-degerleme="0"/);
  const dolu = bultenSvgCiz('post', { ...BULTEN, girisimler: [{ ...BULTEN.girisimler[0], degerleme: 50_000_000 }] });
  assert.match(dolu, /data-degerleme="50000000"/);
});

// ---- Ön talep şeridi ----
const quadSerit = { ad: 'QUAD ROBOTICS', platform: 'fonventure', hedef: 25000000, degerleme: 192307692, onTalep: 3466500, onTalepKisi: 112, renk: '#4f46e5' };
const kutuAdlari = ['NARPOS', 'NEURATURK', 'NEUROX', 'TWINUP', 'DEXCOOK', 'MEDICALTEX'];
const kutular = kutuAdlari.map((ad) => ({ ad, platform: 'fonbulucu' }));
const uc = BULTEN.girisimler[0];
const ucGirisim = [
  { ...uc, ad: 'VISITEXTRA', durum: 'son 26 gün', kalan: 4804400, yuzde: 4 },
  { ...uc, ad: 'OYLİO', durum: 'SONA ERDİ', kalan: 0, yuzde: 100 },
  { ...uc, ad: 'ATHLETICLABS', durum: 'SONA ERDİ', kalan: null, yuzde: 100 },
];
const ikiSerit = [quadSerit, { ...quadSerit, ad: 'OFFGRID', hedef: 7500000, degerleme: undefined, onTalep: undefined, onTalepKisi: undefined }];

test('ön talep şeridi: rakamlı yakında kaydı şerit olarak çizilir, kutu olarak çizilmez', () => {
  const s = bultenSvgCiz('post', { ...BULTEN, girisimler: ucGirisim, yakinda: [quadSerit, ...kutular] });
  assert.match(s, /data-on-talep="QUAD ROBOTICS"/);
  assert.doesNotMatch(s, /data-yakinda="QUAD ROBOTICS"/);
});

test('ön talep şeridi: rakamsız kayıtlar kutu olarak kalır, hepsi çizilir', () => {
  for (const mod of ['post', 'story'] as const) {
    const s = bultenSvgCiz(mod, { ...BULTEN, girisimler: ucGirisim, yakinda: [quadSerit, ...kutular] });
    for (const ad of kutuAdlari) {
      assert.match(s, new RegExp(`data-yakinda="${ad}"`));
      assert.doesNotMatch(s, new RegExp(`data-on-talep="${ad}"`));
    }
  }
});

test('ön talep şeridi: yalnız hedefi olan kayıt da şerit olur, eksik değerler "—" çizilir', () => {
  const s = bultenSvgCiz('post', { ...BULTEN, girisimler: ucGirisim, yakinda: [{ ad: 'SADECE HEDEF', platform: 'fonventure', hedef: 1000000 }] });
  assert.match(s, /data-on-talep="SADECE HEDEF"/);
});

for (const mod of ['post', 'story'] as const) {
  test(`ön talep şeridi ${mod}: iki şerit + altı kutu + üç kart ile MKK boşluğu korunur`, () => {
    const s = bultenSvgCiz(mod, { ...BULTEN, girisimler: ucGirisim, yakinda: [...ikiSerit, ...kutular] });
    assert.equal([...s.matchAll(/data-on-talep=/g)].length, 2);
    assert.ok(oznitelik(s, 'mkk-alt') + 24 <= oznitelik(s, 'alt-ust'), `${oznitelik(s, 'mkk-alt')} / ${oznitelik(s, 'alt-ust')}`);
  });

  test(`ön talep şeridi ${mod}: şerit son kampanya kartının altında, platform kartlarının üstünde`, () => {
    const s = bultenSvgCiz(mod, { ...BULTEN, girisimler: ucGirisim, yakinda: [...ikiSerit, ...kutular] });
    const kartlar = [...s.matchAll(/<rect x="56" y="([0-9.]+)" width="968" height="([0-9.]+)" rx="10" fill="#ffffff"/g)];
    assert.equal(kartlar.length, 3);
    const sonKartAlt = Number(kartlar[2][1]) + Number(kartlar[2][2]);
    const seritY = [...s.matchAll(/data-on-talep="[^"]+" x="56" y="([0-9.]+)" width="968" height="([0-9.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    assert.equal(seritY.length, 2);
    assert.ok(seritY[0][0] > Number(kartlar[2][1]));
    assert.ok(seritY[0][0] >= sonKartAlt, 'şerit karta binmez');
    assert.ok(seritY[1][0] >= seritY[0][0] + seritY[0][1], 'şeritler üst üste binmez');
    const platformY = Number(s.match(/<rect x="56" y="([0-9.]+)" width="[0-9.]+" height="[0-9.]+" rx="8" fill="#[0-9a-f]{6}18"/i)?.[1]);
    assert.ok(seritY[1][0] + seritY[1][1] <= platformY, 'şeritler platform kartlarından önce biter');
  });
}

test('ön talep şeridi: kutu kalmayınca "ÖN TALEP & YAKINDA" ızgarası çizilmez, MKK boşluğu korunur', () => {
  for (const mod of ['post', 'story'] as const) {
    const s = bultenSvgCiz(mod, { ...BULTEN, girisimler: ucGirisim, yakinda: [quadSerit] });
    assert.match(s, /data-on-talep="QUAD ROBOTICS"/);
    assert.doesNotMatch(s, /data-yakinda=/);
    assert.ok(oznitelik(s, 'mkk-alt') + 24 <= oznitelik(s, 'alt-ust'));
  }
});

test('bugünkü düzen: dört kart + bir şerit + altı kutu sığar, kartlar sıkışmaz', () => {
  const dort = [...ucGirisim, { ...uc, ad: 'LOOPYON', durum: 'SONA ERDİ', kalan: 33720400, yuzde: 3.65 }];
  for (const [mod, enAz] of [['post', 88], ['story', 110]] as const) {
    const s = bultenSvgCiz(mod, { ...BULTEN, girisimler: dort, yakinda: [quadSerit, ...kutular] });
    assert.ok(oznitelik(s, 'kart-h') >= enAz, `${mod} kart yüksekliği ${oznitelik(s, 'kart-h')}`);
    assert.ok(oznitelik(s, 'mkk-alt') + 24 <= oznitelik(s, 'alt-ust'));
  }
});
