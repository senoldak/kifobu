// Dilden bağımsız olay eşleme. Başlık kelimeleri Türkçe ile İngilizce arasında örtüşmez ("raises" ≠ "yatırım aldı"),
// ama özel adlar (girişim, fon, kişi) iki dilde de aynı yazılır. Ortak özel adı olan çiftler aday sayılır;
// aynı olay olup olmadıklarına tek bir Gemini çağrısı karar verir.
//
// Üç tür çift sorulur:
//   - yazili: yeni olay ↔ son 10 günde yayımlanmış haber (evet → olay zaten yazılmış, atlanır)
//   - uye:    kelime benzerliğiyle aynı gruba konmuş haber ↔ grubun ilk haberi (hayır → gruptan çıkar)
//   - grup:   iki ayrı grup (evet → birleşir; genelde biri Türkçe biri İngilizce kaynak)
import { gemini } from './lib.mjs';

export const EN_FAZLA_CIFT = 150;

// Başlıklarda büyük harfle yazılabilen ama olayı ayırt etmeyen kelimeler (İngilizce başlıklar çoğu zaman Title Case).
const YAYGIN = new Set(
  `türkiye turkey türk turkish abd usa us uk avrupa europe european eu ab dünya world global çin china hindistan india almanya germany
fransa france ingiltere britain london londra istanbul ankara berlin paris new york san francisco silicon valley
yapay zeka zekâ ai artificial intelligence genai llm saas fintech fintek startup startups girişim girişimi girişimler start
seri series seed tohum pre round tur turu yatırım yatırımı funding fund fon fonu raises raised raise million milyon billion milyar
dolar dollar dollars euro avro sterlin lira the and for with from into its how why what who when will can has have new
ceo cto cfo founder kurucu inc ltd corp group capital ventures venture partners holding plc
ocak şubat mart nisan mayıs haziran temmuz ağustos eylül ekim kasım aralık january february march april may june july
august september october november december monday tuesday wednesday thursday friday saturday sunday
led lands launches launch closes acquires acquisition buys sells secures backed by
report rapor exclusive özel update week weekly haftalık daily günlük news haber haberleri`.split(/\s+/),
);

/** Metindeki özel adlar (küçük harfli). Büyük harfli ya da içinde büyük harf geçen kelimeler; ekleri atılır. */
export function ozelAdlar(metin = '') {
  const out = new Set();
  for (let w of metin.replace(/[’'][\p{L}]+/gu, '').split(/[^\p{L}\d.&-]+/u)) {
    w = w.replace(/^[.&-]+|[.&-]+$/g, '');
    if (w.length < 3 || /^\d/.test(w) || !/\p{Lu}/u.test(w)) continue;
    const l = w.toLocaleLowerCase('tr');
    if (YAYGIN.has(l) || YAYGIN.has(w.toLowerCase())) continue;
    out.add(l);
  }
  return out;
}

export const ortakSayisi = (a, b) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
};

const SEMA = {
  type: 'object',
  properties: { ayni: { type: 'array', items: { type: 'integer' }, description: 'Aynı olayı anlatan çiftlerin numaraları' } },
  required: ['ayni'],
};

/**
 * ciftler: [{ a: metin, b: metin }]. Döner: aynı olay olan çiftlerin indeks kümesi; Gemini cevap vermezse null.
 */
export async function ayniOlayMi(ciftler, { kall = gemini } = {}) {
  if (!ciftler.length) return new Set();
  const r = await kall({
    denetim: true,
    schema: SEMA,
    // Evet/hayır sınıflandırması: en düşük düşünme yeterli, çıkış tokenı azalır.
    dusunme: 'minimal',
    prompt: `Sen bir haber editörüsün. Aşağıdaki her çiftte iki haber başlığı var; biri Türkçe, öteki İngilizce olabilir.
Hangi çiftlerin AYNI OLAYI anlattığını seç: aynı şirketin aynı yatırım turu, aynı satın alma, aynı açıklama gibi.
Aynı şirketin farklı haberleri (ör. bir ay önceki tur ile yeni ürün) aynı olay DEĞİLDİR. Emin değilsen seçme.

${ciftler.map((c, i) => `${i}. A: ${c.a}\n   B: ${c.b}`).join('\n')}`,
  });
  return r ? new Set(r.ayni.filter((i) => Number.isInteger(i) && i >= 0 && i < ciftler.length)) : null;
}

/**
 * Sorulacak çiftleri üretir (önce yazili, sonra uye, sonra grup; en fazla EN_FAZLA_CIFT).
 * gruplar: [{ uyeler: [{ id, baslik, adlar }] }], yazilmis: [{ id, metin, adlar }], ayrikMi(idA, idB).
 */
export function ciftleriKur(gruplar, yazilmis, ayrikMi) {
  const yazili = [];
  const uye = [];
  const grup = [];
  for (const g of gruplar) {
    const bas = g.uyeler[0];
    const adlar = new Set(g.uyeler.flatMap((u) => [...u.adlar]));
    yazilmis
      .map((h) => ({ h, n: ortakSayisi(adlar, h.adlar) }))
      .filter(({ h, n }) => n > 0 && !g.uyeler.some((u) => ayrikMi(u.id, h.id)))
      .sort((x, y) => y.n - x.n)
      .slice(0, 3)
      .forEach(({ h, n }) => yazili.push({ tur: 'yazili', g, h, n, a: bas.baslik, b: h.metin, idA: bas.id, idB: h.id }));
    for (const u of g.uyeler.slice(1)) uye.push({ tur: 'uye', g, u, n: 0, a: bas.baslik, b: u.baslik, idA: bas.id, idB: u.id });
  }
  for (let i = 0; i < gruplar.length; i++) {
    for (let j = i + 1; j < gruplar.length; j++) {
      const [x, y] = [gruplar[i].uyeler[0], gruplar[j].uyeler[0]];
      const n = ortakSayisi(x.adlar, y.adlar);
      if (n > 0 && !ayrikMi(x.id, y.id)) grup.push({ tur: 'grup', gi: i, gj: j, n, a: x.baslik, b: y.baslik, idA: x.id, idB: y.id });
    }
  }
  const sirala = (l) => l.sort((p, q) => q.n - p.n);
  return [...sirala(yazili), ...uye, ...sirala(grup)].slice(0, EN_FAZLA_CIFT);
}

/**
 * Kararları uygular. Döner: { gruplar: [{ uyeler, yazilmis }], ayrik: farklı olay denen [idA, idB] çiftleri }.
 * yazilmis: grup son 10 günde yayımlanmış bir haberle aynı olay.
 */
export function uygula(gruplar, ciftler, ayni) {
  const ayrik = [];
  const yazilmis = new Set();
  const cikan = new Map(); // grup → gruptan çıkan üyeler
  const forelder = gruplar.map((_, i) => i);
  const rot = (i) => (forelder[i] === i ? i : (forelder[i] = rot(forelder[i])));
  ciftler.forEach((c, i) => {
    const evet = ayni.has(i);
    if (!evet) ayrik.push([c.idA, c.idB]);
    if (c.tur === 'yazili' && evet) yazilmis.add(c.g);
    if (c.tur === 'uye' && !evet) (cikan.get(c.g) ?? cikan.set(c.g, []).get(c.g)).push(c.u);
    if (c.tur === 'grup' && evet) forelder[rot(c.gj)] = rot(c.gi);
  });
  // Gruptan çıkan haberler kendi başına birer olay olur.
  const temiz = gruplar.map((g) => ({ ...g, uyeler: g.uyeler.filter((u) => !cikan.get(g)?.includes(u)) }));
  const tekler = [...cikan.values()].flat().map((u) => ({ uyeler: [u] }));
  // Birleşen gruplar: kök grubun ilk haberi başta kalır.
  const kok = new Map();
  temiz.forEach((g, i) => {
    const r = rot(i);
    if (!kok.has(r)) kok.set(r, { uyeler: [], kaynaklar: [] });
    kok.get(r).kaynaklar.push(gruplar[i]);
    if (r === i) kok.get(r).uyeler.unshift(...g.uyeler);
    else kok.get(r).uyeler.push(...g.uyeler);
  });
  const yeni = [...kok.values()].map(({ uyeler, kaynaklar }) => ({ uyeler, yazilmis: kaynaklar.some((g) => yazilmis.has(g)) }));
  return { gruplar: [...yeni, ...tekler], ayrik };
}

/**
 * Önbellekli eşleme: daha önce "aynı olay" denen çiftler (bilinen[anahtar(c)]) Gemini'ye tekrar sorulmaz.
 * Döner: ayniOlayMi gibi, bütün ciftler'e göre indeks kümesi; yeni "evet"ler bilinen'e yazılır. Cevap yoksa null.
 */
export async function onbellekliEsle(ciftler, bilinen, anahtar, { sor = ayniOlayMi, zaman = new Date().toISOString() } = {}) {
  const yeniler = [];
  ciftler.forEach((c, i) => {
    if (!bilinen[anahtar(c)]) yeniler.push(i);
  });
  const cevap = yeniler.length ? await sor(yeniler.map((i) => ciftler[i])) : new Set();
  if (!cevap) return null;
  const ayni = new Set();
  ciftler.forEach((c, i) => {
    if (bilinen[anahtar(c)]) ayni.add(i);
  });
  for (const n of cevap) {
    ayni.add(yeniler[n]);
    bilinen[anahtar(ciftler[yeniler[n]])] = zaman;
  }
  return ayni;
}
