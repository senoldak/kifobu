import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BULTEN } from '../src/data/bulten.ts';
import { ARALIK, ARALIK_EN_AZ_OLCEK, OLCU, bultenSvgCiz } from './bulten-gorsel-ciz.ts';

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

// ---- Sabit aralık düzeni (ritim) ----
const bloklariOku = (svg: string) =>
  (svg.match(/data-bloklar="([^"]*)"/)?.[1] ?? '').split('|').map((s) => {
    const [ad, x, y, w, h] = s.split(';');
    return { ad, x: Number(x), y: Number(y), w: Number(w), h: Number(h) };
  }).sort((a, b) => a.y - b.y);
const ozellik = (svg: string, ad: string) => Number(svg.match(new RegExp(`data-${ad}="([^"]*)"`))?.[1]);

const ornekGirisim = (i: number) => ({ ...uc, ad: `GIRISIM ${i + 1}`, alinan: 1_000_000 * (i + 1), kalan: i % 2 ? null : 2_500_000, yuzde: i % 2 ? 100.5 : 12.4, durum: i % 2 ? 'SONA ERDİ' : `son ${i + 3} gün` });
const ornekSerit = (i: number) => ({ ...quadSerit, ad: `SERIT ${i + 1}` });
const ornekKutu = (i: number) => ({ ad: ['NARPOS', 'NEURATURK', 'NEUROX', 'TWINUP', 'DEXCOOK', 'MEDICALTEX'][i % 6] + (i >= 6 ? ` ${i}` : ''), platform: i % 2 ? 'ardventure' : 'fonbulucu' });

for (const mod of ['post', 'story'] as const) {
  test(`ritim ${mod}: 1–6 kampanya × 0–3 şerit × 0/3/7/12 kutu — çakışma yok, bölüm boşluğu sabit, kart aralıkta`, () => {
    const h = mod === 'story' ? 1920 : 1350;
    const sikistirmasizBolum = new Set<number>();
    for (let n = 1; n <= 6; n++) for (let m = 0; m <= 3; m++) for (const k of [0, 3, 7, 12]) {
      const veri = {
        ...BULTEN,
        girisimler: Array.from({ length: n }, (_, i) => ornekGirisim(i)),
        yakinda: [...Array.from({ length: m }, (_, i) => ornekSerit(i)), ...Array.from({ length: k }, (_, i) => ornekKutu(i))],
      };
      const s = bultenSvgCiz(mod, veri);
      const durum = `${mod} n=${n} m=${m} k=${k}`;
      const bloklar = bloklariOku(s);
      // (e) her şey tuvalin içinde
      for (const b of bloklar) assert.ok(b.y >= 0 && b.y + b.h <= h + 0.05, `${durum}: ${b.ad} tuval dışında`);
      // (a) hiçbir kutu üst üste binmez, aralarında en az 8 px
      for (let i = 1; i < bloklar.length; i++) {
        const ara = bloklar[i].y - (bloklar[i - 1].y + bloklar[i - 1].h);
        assert.ok(ara >= 8 - 0.05, `${durum}: ${bloklar[i - 1].ad} → ${bloklar[i].ad} arası ${ara}`);
      }
      // tam genişlik: içerik hiçbir zaman daraltılmaz
      for (const b of bloklar.filter((b) => b.ad !== 'alt-bant')) assert.ok(b.x === 56 && b.w === 968, `${durum}: ${b.ad} ${b.x}/${b.w}`);
      // (b) bölüm boşluğu görselin her bölümünde aynı
      const beklenenBolum = ozellik(s, 'bolum-aralik');
      const basliklar = bloklar.map((b, i) => [b, i] as const).filter(([b]) => b.ad.startsWith('baslik:'));
      assert.equal(basliklar.length, k ? 4 : 3, durum);
      for (const [b, i] of basliklar.slice(1)) {
        const onceki = bloklar[i - 1];
        assert.ok(Math.abs(b.y - (onceki.y + onceki.h) - beklenenBolum) < 0.2, `${durum}: ${b.ad} üstü ${b.y - (onceki.y + onceki.h)} ≠ ${beklenenBolum}`);
      }
      if (ozellik(s, 'aralik-olcek') === 1) sikistirmasizBolum.add(ozellik(s, 'bolum-aralik'));
      // (c) kart yüksekliği [min, max]
      const kartH = ozellik(s, 'kart-h');
      assert.ok(kartH >= OLCU[mod].kartMin && kartH <= OLCU[mod].kartMax, `${durum}: kart ${kartH}`);
      for (const b of bloklar.filter((b) => b.ad.startsWith('kart:'))) assert.equal(b.h, kartH, durum);
      // (d) MKK kutusu alt banttan en az 24 px yukarıda
      assert.ok(ozellik(s, 'mkk-alt') + 24 <= ozellik(s, 'alt-ust'), `${durum}: ${ozellik(s, 'mkk-alt')}`);
      // boşluklar en çok 0,75'e kadar kısılır
      assert.ok(ozellik(s, 'aralik-olcek') >= ARALIK_EN_AZ_OLCEK, durum);
    }
    // sıkıştırma gerekmeyen bütün görsellerde bölüm boşluğu aynı ve ölçekteki değer
    assert.deepEqual([...sikistirmasizBolum], [ARALIK[mod].bolum]);
  });

  test(`ritim ${mod}: yer artınca kartlar uzar, artan yer üst ve alta eşit dağılır`, () => {
    const s = bultenSvgCiz(mod, { ...BULTEN, girisimler: [ornekGirisim(0)], yakinda: kutular.slice(0, 2) });
    assert.equal(ozellik(s, 'sikistirma'), 0);
    assert.equal(ozellik(s, 'kart-h'), OLCU[mod].kartMax);
    const bloklar = bloklariOku(s);
    // Üst bilgi + içerik tek blok: artan yer üst bilginin üstüne ve MKK'nın altına eşit; aradaki boşluklar ölçekteki değerde.
    const ustBilgi = bloklar.find((b) => b.ad === 'ust-bilgi')!;
    const ilk = bloklar.find((b) => b.ad === 'baslik:GİRİŞİMLER')!;
    const ust = ustBilgi.y + 2 - (mod === 'story' ? 190 : 54);
    const alt = ozellik(s, 'alt-ust') - ARALIK[mod].alt - ozellik(s, 'mkk-alt');
    assert.ok(ust > 0 && Math.abs(ust - alt) <= 1, `${ust} / ${alt}`);
    assert.ok(Math.abs(ilk.y - (ustBilgi.y + ustBilgi.h) - ARALIK[mod].ust) < 0.2, 'üst bilgi ile ilk bölüm arası sabit');
    assert.equal(ozellik(s, 'gizlenen'), 0);
    assert.equal(ozellik(s, 'kart-aralik'), ARALIK[mod].kart);
    assert.equal(ozellik(s, 'baslik-alti'), ARALIK[mod].baslikAlti);
  });
}

test('ritim: bugünkü düzen (VISITEXTRA açık + üç biten, bir şerit, altı kutu) sıkıştırmasız çizilir', () => {
  const g = (ad: string, platform: string, alinan: number, kalan: number | null, degerleme: number, yuzde: number, durum: string) =>
    ({ ad, platform, bugun: 0, alinan, kalan, degerleme, yuzde, durum });
  const veri = {
    ...BULTEN,
    tarih: '18 Kasım 2026',
    sayi: 1562,
    girisimler: [
      g('VISITEXTRA', 'fonangels', 195600, 4804400, 50000000, 3.91, 'son 57 gün'),
      g('OYLİO', 'fonangels', 5135900, null, 50000000, 102.71, 'SONA ERDİ'),
      g('ATHLETICLABS', 'fonangels', 7602500, null, 75000000, 101.36, 'SONA ERDİ'),
      g('LOOPYON', 'ecofolio', 1279600, 33720400, 385000000, 3.65, 'SONA ERDİ'),
    ],
    yakinda: [
      quadSerit,
      { ad: 'NARPOS', platform: 'ardventure' }, { ad: 'NEURATURK', platform: 'ardventure' }, { ad: 'NEUROX', platform: 'fonangels' },
      { ad: 'TWINUP', platform: 'fonbulucu' }, { ad: 'DEXCOOK', platform: 'fonbulucu' }, { ad: 'MEDICALTEX', platform: 'fonbulucu' },
    ],
    platformlar: { bugun: 0, toplam: 14213600, liste: [
      { ad: 'fonangels', toplam: 12934000, girisim: 3, renk: '#f47b3d' },
      { ad: 'ecofolio', toplam: 1279600, girisim: 1, renk: '#009bae' },
    ] },
  };
  for (const mod of ['post', 'story'] as const) {
    const s = bultenSvgCiz(mod, veri);
    assert.equal(ozellik(s, 'aralik-olcek'), 1, mod);
    assert.equal(ozellik(s, 'gizlenen'), 0, mod);
    assert.equal(ozellik(s, 'bolum-aralik'), ARALIK[mod].bolum, mod);
    assert.ok(ozellik(s, 'kart-h') >= OLCU[mod].kartMin, `${mod} kart ${ozellik(s, 'kart-h')}`);
  }
  // Post'ta altı kutu tek satıra sığar.
  assert.equal(ozellik(bultenSvgCiz('post', veri), 'kutu-sutun'), 6);
});

for (const mod of ['post', 'story'] as const) {
  test(`taşma ${mod}: 6 açık + 3 şerit + 12 kutu — açıklar kalır, kutular "+N" ile özetlenir, genişlik tam`, () => {
    const acik = Array.from({ length: 6 }, (_, i) => ({ ...uc, ad: `ACIK ${i + 1}`, durum: `son ${i + 5} gün`, kalan: 1_000_000, yuzde: 20 }));
    const biten = { ...uc, ad: 'BITEN', durum: 'SONA ERDİ', kalan: null, yuzde: 101 };
    const s = bultenSvgCiz(mod, {
      ...BULTEN,
      girisimler: [biten, ...acik],
      yakinda: [...Array.from({ length: 3 }, (_, i) => ornekSerit(i)), ...Array.from({ length: 12 }, (_, i) => ornekKutu(i))],
    });
    const bloklar = bloklariOku(s);
    for (const a of acik) assert.ok(bloklar.some((b) => b.ad === `kart:${a.ad}`), `${a.ad} çizilmeli`);
    assert.ok(!bloklar.some((b) => b.ad === 'kart:BITEN'), 'biten kampanya açıklardan önce düşer');
    assert.ok(ozellik(s, 'gizlenen') > 0);
    const arti = Number(s.match(/data-yakinda-arti="(\d+)"/)?.[1]);
    assert.ok(arti > 0, '"+N kampanya" kutusu');
    assert.equal(bloklar.filter((b) => b.ad.startsWith('kutu-satiri:')).length, 1, 'en az bir kutu satırı kalır');
    for (const b of bloklar.filter((b) => b.ad !== 'alt-bant')) assert.ok(b.x === 56 && b.w === 968, b.ad);
    for (let i = 1; i < bloklar.length; i++) assert.ok(bloklar[i].y - (bloklar[i - 1].y + bloklar[i - 1].h) >= 8 - 0.05, bloklar[i].ad);
    assert.ok(ozellik(s, 'aralik-olcek') >= ARALIK_EN_AZ_OLCEK);
    assert.ok(ozellik(s, 'mkk-alt') + 24 <= ozellik(s, 'alt-ust'));
    assert.doesNotMatch(s, /<g transform=/, 'içerik bloğu ölçeklenmez');
  });
}

test('taşma: ikiden fazla şerit sığmazsa kalanlar "+N ön talep daha" satırında sayılır', () => {
  // Kutu yok: şeritler kutuya katılamaz, satır açılır.
  const acik = Array.from({ length: 5 }, (_, i) => ({ ...uc, ad: `ACIK ${i + 1}`, durum: `son ${i + 5} gün`, kalan: 1_000_000, yuzde: 20 }));
  const s = bultenSvgCiz('post', { ...BULTEN, girisimler: acik, yakinda: Array.from({ length: 3 }, (_, i) => ornekSerit(i)) });
  const tasma = Number(s.match(/data-serit-tasma="(\d+)"/)?.[1]);
  const serit = [...s.matchAll(/data-on-talep=/g)].length;
  assert.ok(tasma > 0 && serit + tasma === 3, `${serit} şerit + ${tasma}`);
  assert.equal(ozellik(s, 'gizlenen'), tasma);
});

test('ön talep şeridi: sağda "ön talep" durumu, tutar etiketi "talep tutarı"', () => {
  for (const mod of ['post', 'story'] as const) {
    const s = bultenSvgCiz(mod, { ...BULTEN, girisimler: ucGirisim, yakinda: [quadSerit, ...kutular] });
    assert.equal([...s.matchAll(/data-serit-durum="ön talep"/g)].length, 1, mod);
  }
});
