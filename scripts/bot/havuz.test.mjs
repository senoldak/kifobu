// Kısa haber havuzu: olayların şifreli saklanması, dilim derlemesi (İstanbul dilimleri), devir, süre ve tekrar kuralları.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { havuzOlayi, havuzAc, havuzKapat, dilimGruplari, dilimAnahtari, bultenDilimi, dilimEki, havuzAyir, derlemeKaynagi, havuzuIsle, HAVUZ_SAAT, DERLEME_AZAMI } from './havuz.mjs';

const simdi = new Date('2026-10-16T12:00:00Z'); // 15:00 İstanbul: öğle dilimi
const saatOnce = (h) => new Date(simdi.getTime() - h * 3600e3).toISOString();
// saatOnce(1) = 14:00 (süren öğle dilimi); saatOnce(5) = 10:00 (bitmiş açılış dilimi).
const olay = (id, kategori = 'yatirimlar', girdi = saatOnce(5)) =>
  havuzOlayi({
    id,
    taslak: { category: kategori, title: `Başlık ${id}` },
    basliklar: [`Source title ${id}`],
    kaynaklar: [{ baslik: `Source title ${id}`, tarih: '2026-10-16', metin: `Kaynak metni ${id} `.repeat(400) }],
    kullanilan: [{ ad: 'Haber Sitesi', url: `https://haber.example.com/${id}` }],
    iso: girdi,
  });
const dortSaatSonra = new Date(simdi.getTime() + 4 * 3600e3); // 19:00: öğle dilimi bitti

const bagimlilik = (ek = {}) => {
  const kaydedilen = [];
  return {
    kaydedilen,
    simdi,
    log: () => {},
    mukerrer: () => null,
    yaz: async (grup) => ({ category: grup[0].kategori, title: 'Derleme' }),
    denetle: async (t) => ({ haber: t, sorunlar: [] }),
    kaydet: async (h, t, grup) => (kaydedilen.push(grup.map((o) => o.id)), `derleme-${kaydedilen.length}`),
    ...ek,
  };
};

test('havuzOlayi: kaynak metnini kırpar, kategori ve başlığı taşır', () => {
  const o = olay('a');
  assert.equal(o.kategori, 'yatirimlar');
  assert.equal(o.baslik, 'Başlık a');
  assert.equal(o.kaynaklar[0].metin.length, 3500);
});

test('havuzKapat: kaynak metni, adı ve adresi durum dosyasına düz girmez; havuzAc geri açar', () => {
  const kapali = havuzKapat([olay('a')]);
  const metin = JSON.stringify(kapali);
  assert.doesNotMatch(metin, /Kaynak metni|haber\.example\.com|Haber Sitesi|Source title/);
  assert.deepEqual(Object.keys(kapali[0]).sort(), ['havuzaGirdi', 'id', 'kategori', 'sifreli']);
  const acik = havuzAc(kapali);
  assert.equal(acik[0].id, 'a');
  assert.equal(acik[0].kullanilan[0].url, 'https://haber.example.com/a');
  // Değişmeyen kayıt yeniden şifrelenmez (dosya farkı küçük kalır).
  assert.equal(havuzKapat(acik)[0].sifreli, kapali[0].sifreli);
});

test('bultenDilimi: İstanbul saatiyle açılış 06-12, öğle 12-18, kapanış 18-06', () => {
  const d = (utc) => bultenDilimi(new Date(utc)).anahtar;
  assert.equal(d('2026-10-18T03:00:00Z'), '2026-10-18:acilis'); // 06:00
  assert.equal(d('2026-10-18T08:59:00Z'), '2026-10-18:acilis'); // 11:59
  assert.equal(d('2026-10-18T09:00:00Z'), '2026-10-18:ogle'); // 12:00
  assert.equal(d('2026-10-18T15:00:00Z'), '2026-10-18:kapanis'); // 18:00
  assert.equal(d('2026-10-18T22:30:00Z'), '2026-10-18:kapanis'); // ertesi gün 01:30, önceki günün kapanışı
  assert.equal(d('2026-10-19T02:59:00Z'), '2026-10-18:kapanis'); // 05:59
});

test('dilimGruplari: kategori aranmadan dilime göre en az iki olay tek grup olur', () => {
  const g = dilimGruplari([olay('a', 'yatirimlar'), olay('b', 'mevzuat'), olay('c', 'kampanyalar')]);
  assert.equal(g.gruplar.length, 1);
  assert.deepEqual(g.gruplar[0].map((o) => o.id), ['a', 'b', 'c']);
  assert.deepEqual(g.artan, []);
});

test('dilimGruplari: farklı dilimler ayrı grup; tek kalan olay sonraki dilime devredilir', () => {
  const acilis = (id) => olay(id, 'yatirimlar', '2026-10-16T05:00:00Z'); // 08:00
  const ogle = (id) => olay(id, 'mevzuat', '2026-10-16T10:00:00Z'); // 13:00
  let g = dilimGruplari([acilis('a'), acilis('b'), ogle('c')]);
  assert.deepEqual(g.gruplar.map((x) => x.map((o) => o.id)), [['a', 'b']]);
  assert.deepEqual(g.artan.map((o) => o.id), ['c']);
  g = dilimGruplari([acilis('a'), ogle('c')]);
  assert.deepEqual(g.gruplar.map((x) => x.map((o) => o.id)), [['a', 'c']]);
  assert.deepEqual(g.artan, []);
});

test('dilimGruplari: bir grupta en fazla DERLEME_AZAMI olay; tek artan sonrakine kalır', () => {
  const g = dilimGruplari(Array.from({ length: DERLEME_AZAMI + 1 }, (_, i) => olay(`x${i}`)));
  assert.deepEqual(g.gruplar.map((x) => x.length), [DERLEME_AZAMI]);
  assert.equal(g.artan.length, 1);
  const h = dilimGruplari(Array.from({ length: DERLEME_AZAMI + 3 }, (_, i) => olay(`x${i}`)));
  assert.deepEqual(h.gruplar.map((x) => x.length), [DERLEME_AZAMI, 3]);
});

test('havuzAyir: süren dilimin olayları bekler, bitmiş dilimin olayları olgundur', () => {
  const r = havuzAyir([olay('a', 'yatirimlar', saatOnce(1)), olay('b')], simdi);
  assert.deepEqual(r.bekleyen.map((o) => o.id), ['a']);
  assert.deepEqual(r.olgun.map((o) => o.id), ['b']);
  assert.equal(dilimAnahtari(r.olgun[0]), '2026-10-16:acilis');
});

test('dilimEki: "18 Ekim, öğle" biçimi, grubun en yeni olayının dilimiyle', () => {
  const g = [olay('a', 'yatirimlar', '2026-10-18T05:00:00Z'), olay('b', 'yatirimlar', '2026-10-18T10:00:00Z')];
  assert.equal(dilimEki(g), '18 Ekim, öğle');
});

test('derlemeKaynagi: her haber kendi bölümünde', () => {
  const k = derlemeKaynagi([olay('a'), olay('b')]);
  assert.match(k, /### 1\. Başlık a/);
  assert.match(k, /### 2\. Başlık b/);
});

test('havuzuIsle: dilimi süren olaylar derlenmez; dilim bitince kategoriden bağımsız tek derleme olur', async () => {
  const b = bagimlilik();
  let r = await havuzuIsle([olay('a', 'yatirimlar', saatOnce(1)), olay('b', 'mevzuat', saatOnce(1))], b);
  assert.deepEqual(r.yazilan, []);
  assert.equal(r.havuz.length, 2);
  r = await havuzuIsle(r.havuz, { ...b, simdi: dortSaatSonra });
  assert.deepEqual(r.yazilan, ['derleme-1']);
  assert.deepEqual(b.kaydedilen, [['a', 'b']]);
  assert.deepEqual(r.havuz, []);
});

test('havuzuIsle: bitmiş dilimde tek olay eş bekler; sonraki dilim bitince onunla derlenir (devir)', async () => {
  const b = bagimlilik();
  let r = await havuzuIsle([olay('a')], b);
  assert.deepEqual(r.yazilan, []);
  assert.deepEqual(r.havuz.map((o) => o.id), ['a']);
  r = await havuzuIsle([...r.havuz, olay('b', 'mevzuat', saatOnce(1))], b); // b süren dilimde
  assert.deepEqual(r.yazilan, []);
  r = await havuzuIsle(r.havuz, { ...b, simdi: dortSaatSonra }); // öğle bitti
  assert.deepEqual(b.kaydedilen, [['a', 'b']]);
  assert.deepEqual(r.havuz, []);
});

test('havuzuIsle: devredilen tek olay HAVUZ_SAAT dolunca düşer', async () => {
  const b = bagimlilik({ simdi: new Date(simdi.getTime() + 2 * 3600e3) });
  const r = await havuzuIsle([olay('a', 'yatirimlar', saatOnce(HAVUZ_SAAT - 1))], b);
  assert.deepEqual(r.havuz, []);
});

test('havuzuIsle: HAVUZ_SAAT dolan olay düşer', async () => {
  const r = await havuzuIsle([olay('a', 'yatirimlar', saatOnce(HAVUZ_SAAT)), olay('b', 'mevzuat', saatOnce(1))], bagimlilik());
  assert.deepEqual(r.havuz.map((o) => o.id), ['b']);
});

test('havuzuIsle: bu arada tam haber olarak yazılan olay düşer', async () => {
  const r = await havuzuIsle([olay('a'), olay('b')], bagimlilik({ mukerrer: (o) => (o.id === 'a' ? 'aynı hikâye' : null) }));
  assert.deepEqual(r.yazilan, []);
  assert.deepEqual(r.havuz.map((o) => o.id), ['b']);
});

test('havuzuIsle: denetle derleme grubunu üçüncü argüman olarak alır', async () => {
  let alinan;
  await havuzuIsle([olay('a'), olay('b')], bagimlilik({ denetle: async (t, k, grup) => ((alinan = grup.length), { haber: t, sorunlar: [] }) }));
  assert.equal(alinan, 2);
});

test('havuzuIsle: denetimden geçmeyen derleme yayımlanmaz ve grup bir daha denenmez', async () => {
  let denetim = 0;
  const b = bagimlilik({ denetle: async (t) => (denetim++, { haber: t, sorunlar: ['Metin çok kısa'] }) });
  const r = await havuzuIsle([olay('a'), olay('b')], b);
  assert.equal(denetim, 1);
  assert.deepEqual(b.kaydedilen, []);
  assert.deepEqual(r.havuz, []);
});

test('havuzuIsle: kaydedilen metin denetimin düzelttiği haberdir', async () => {
  let kaydedilen;
  const b = bagimlilik({ denetle: async (t) => ({ haber: { ...t, title: 'Düzeltilmiş' }, sorunlar: [] }), kaydet: async (h) => ((kaydedilen = h.title), 's') });
  await havuzuIsle([olay('a'), olay('b')], b);
  assert.equal(kaydedilen, 'Düzeltilmiş');
});

test('havuzuIsle: anahtar/kota hatasında olaylar havuzda kalır ve tur durur', async () => {
  const hata = Object.assign(new Error('403'), { ayar: true });
  const r = await havuzuIsle([olay('a'), olay('b')], bagimlilik({ yaz: async () => { throw hata; } }));
  assert.equal(r.ayarHatasi, hata);
  assert.equal(r.havuz.length, 2);
});

test('havuzuIsle: zaman bütçesi bittiyse derleme denenmez, olaylar bekler', async () => {
  const r = await havuzuIsle([olay('a'), olay('b')], bagimlilik({ surVar: () => false }));
  assert.deepEqual(r.yazilan, []);
  assert.equal(r.havuz.length, 2);
});

test('havuzuIsle: bir turda en fazla DERLEME_MAKS derleme; kalanı havuzda bekler', async () => {
  const b = bagimlilik();
  const cift = (ad, girdi) => [olay(`${ad}1`, 'yatirimlar', girdi), olay(`${ad}2`, 'mevzuat', girdi)];
  const liste = [...cift('p', '2026-10-16T06:00:00Z'), ...cift('q', '2026-10-16T10:00:00Z'), ...cift('r', '2026-10-16T16:00:00Z')];
  const r = await havuzuIsle(liste, { ...b, simdi: new Date('2026-10-17T05:00:00Z') }); // 08:00, yeni açılış dilimi
  assert.equal(b.kaydedilen.length, 2);
  assert.deepEqual(r.havuz.map((o) => o.id).sort(), ['r1', 'r2']);
});

test('derlemeIstemi: kategori ara başlıkları ve her haber kendi kaynağıyla', async () => {
  const { derlemeIstemi } = await import('./yazar.mjs');
  const grup = [olay('a', 'mevzuat'), olay('b', 'yatirimlar'), olay('c', 'mevzuat')];
  const istem = derlemeIstemi(grup);
  assert.match(istem, /3 kısa haber/);
  assert.match(istem, /## Mevzuat\n### Başlık a[\s\S]*### Başlık c[\s\S]*## Yatırımlar\n### Başlık b/);
  assert.match(istem, /50-80 kelime/);
});

test('enSikKategori: en çok haberi olan kategori, eşitlikte ilk haberinki', async () => {
  const { enSikKategori } = await import('./yazar.mjs');
  assert.equal(enSikKategori([olay('a', 'mevzuat'), olay('b', 'yatirimlar'), olay('c', 'yatirimlar')]), 'yatirimlar');
  assert.equal(enSikKategori([olay('a', 'mevzuat'), olay('b', 'yatirimlar')]), 'mevzuat');
});
