// Kısa haber havuzu: olayların şifreli saklanması, kategoriye göre derleme, süre ve tekrar kuralları.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { havuzOlayi, havuzAc, havuzKapat, kisaGruplari, derlemeKaynagi, havuzuIsle, HAVUZ_SAAT, DERLEME_AZAMI } from './havuz.mjs';

const simdi = new Date('2026-10-16T12:00:00Z');
const saatOnce = (h) => new Date(simdi.getTime() - h * 3600e3).toISOString();
const olay = (id, kategori = 'yatirimlar', girdi = saatOnce(1)) =>
  havuzOlayi({
    id,
    taslak: { category: kategori, title: `Başlık ${id}` },
    basliklar: [`Source title ${id}`],
    kaynaklar: [{ baslik: `Source title ${id}`, tarih: '2026-10-16', metin: `Kaynak metni ${id} `.repeat(400) }],
    kullanilan: [{ ad: 'Haber Sitesi', url: `https://haber.example.com/${id}` }],
    iso: girdi,
  });

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

test('kisaGruplari: aynı kategoriden en az iki olay gruplanır, en fazla DERLEME_AZAMI', () => {
  const liste = [olay('a'), olay('b', 'mevzuat'), olay('c'), ...Array.from({ length: DERLEME_AZAMI }, (_, i) => olay(`x${i}`))];
  const g = kisaGruplari(liste);
  assert.deepEqual(g.map((x) => x.length), [DERLEME_AZAMI, 2]);
  assert.ok(g.every((x) => x.every((o) => o.kategori === 'yatirimlar')));
});

test('derlemeKaynagi: her haber kendi bölümünde', () => {
  const k = derlemeKaynagi([olay('a'), olay('b')]);
  assert.match(k, /### 1\. Başlık a/);
  assert.match(k, /### 2\. Başlık b/);
});

test('havuzuIsle: tek olay eş bekler; aynı kategoriden ikinci gelince derleme yazılır ve havuz boşalır', async () => {
  const b = bagimlilik();
  let r = await havuzuIsle([olay('a')], b);
  assert.deepEqual(r.havuz.map((o) => o.id), ['a']);
  assert.deepEqual(r.yazilan, []);
  r = await havuzuIsle([...r.havuz, olay('b', 'yatirimlar', simdi.toISOString())], b);
  assert.deepEqual(r.yazilan, ['derleme-1']);
  assert.deepEqual(b.kaydedilen, [['b', 'a']]);
  assert.deepEqual(r.havuz, []);
});

test('havuzuIsle: farklı kategoriler birleşmez', async () => {
  const b = bagimlilik();
  const r = await havuzuIsle([olay('a'), olay('b', 'mevzuat')], b);
  assert.deepEqual(r.yazilan, []);
  assert.equal(r.havuz.length, 2);
});

test('havuzuIsle: HAVUZ_SAAT dolan olay düşer', async () => {
  const r = await havuzuIsle([olay('a', 'yatirimlar', saatOnce(HAVUZ_SAAT)), olay('b', 'mevzuat')], bagimlilik());
  assert.deepEqual(r.havuz.map((o) => o.id), ['b']);
});

test('havuzuIsle: bu arada tam haber olarak yazılan olay düşer', async () => {
  const r = await havuzuIsle([olay('a'), olay('b')], bagimlilik({ mukerrer: (o) => (o.id === 'a' ? 'aynı hikâye' : null) }));
  assert.deepEqual(r.yazilan, []);
  assert.deepEqual(r.havuz.map((o) => o.id), ['b']);
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

test('derlemeIstemi: kategori ve her haber ayrı bölüm istenir', async () => {
  const { derlemeIstemi } = await import('./yazar.mjs');
  const grup = [olay('a', 'mevzuat'), olay('b', 'mevzuat')];
  const istem = derlemeIstemi(grup, derlemeKaynagi(grup));
  assert.match(istem, /"mevzuat" kategorisinden 2 kısa/);
  assert.match(istem, /### 1\. Başlık a/);
  assert.match(istem, /category="mevzuat"/);
});
