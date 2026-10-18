// Haber kartları, Kimlik v2 (BRAND.md §11): kâğıt zemin, üstte sarı bant, Schibsted Grotesk.
// Üç düzen: haber (başlık + altta logo ve kategori), künye (kampanya: durum etiketi, tutar, yüzde, hedef çubuğu),
// yatırım (tur etiketi, başlık, büyük tutar). Verisi olmayan bilgi çizilmez; rakam yoksa düz haber kapağı.
// Üç biçim: site kapağı 1200×675 (yayında), post 1080×1350 ve story 1080×1920.
// 18:00 kapanış bülteninin görselleri (scripts/bulten-gorsel-*) bu dosyayı kullanmaz.
import { BUYUK_HARF, genislik, logo, metin, satirlar, type MetinAyar } from './ciz.ts';
import { categoryName, type Durum } from '../lib/site.ts';
import { KIMLIK, cubukOlcegi, durumEtiketi, tutarKisa, yuzdeKesik } from '../lib/kimlik.ts';

export interface KapakVeri {
  baslik: string;
  kategori: string;
  girisim?: string;
  platform?: string;
  toplanan?: number;
  hedef?: number;
  yatirimci?: number;
  durum?: Durum;
  paraBirimi?: string;
  tur?: string;
}

export type Bicim = 'kapak' | 'post' | 'story';
export type Duzen = 'haber' | 'kunye' | 'yatirim';

interface Olcu {
  g: number;
  y: number;
  pad: number;
  bant: number; // üst sarı bandın yüksekliği
  ust: number; // içeriğin başladığı y
  alt: number; // alt satırın (logo, kategori) taban çizgisi
  isaret: number; // logo işaretinin boyu
  kat: number; // kategori etiketi puntosu
  baslik: [number, number, number]; // kısa / orta / uzun başlık
  k: number; // künye ve yatırım içi ölçek
}
// Story'de üst ~270, alt ~340 px Instagram arayüzünün altında kalır; içerik bu güvenli alanda durur.
export const OLCU: Record<Bicim, Olcu> = {
  kapak: { g: 1200, y: 675, pad: 80, bant: 18, ust: 70, alt: 619, isaret: 52, kat: 22, baslik: [80, 72, 64], k: 1 },
  post: { g: 1080, y: 1350, pad: 88, bant: 24, ust: 120, alt: 1240, isaret: 72, kat: 28, baslik: [96, 88, 76], k: 1.15 },
  story: { g: 1080, y: 1920, pad: 96, bant: 28, ust: 300, alt: 1560, isaret: 76, kat: 30, baslik: [104, 96, 84], k: 1.45 },
};

const BASLIK_RENGI = '#2b3442';
const SATIR_ADIMI = 1.06;

/** Başlık; bültende " — " sonrası (tarih) sağ alttaki etikete gider. */
export function bol(baslik: string, kategori: string) {
  const ana = baslik.trim();
  if (kategori === 'gunluk-bulten') {
    const p = ana.split(/\s+[—–]\s+/);
    if (p.length > 1) return { ana: p[0], tarih: p.slice(1).join(' — ') };
  }
  return { ana, tarih: null as string | null };
}

/** Sağ alttaki etiket: bölüm adı; bültende bültenin tarihi. Türkçe büyük harf. */
export function kunyeEtiketi(kategori: string, bultenTarihi: string | null) {
  return (bultenTarihi ?? categoryName(kategori)).toLocaleUpperCase('tr-TR');
}

const sayi = (n?: number) => typeof n === 'number' && Number.isFinite(n);

export function kapakDuzeni(v: KapakVeri): Duzen {
  if (v.girisim && sayi(v.toplanan) && sayi(v.hedef) && v.hedef! > 0) return 'kunye';
  if (v.tur && sayi(v.toplanan) && v.toplanan! > 0) return 'yatirim';
  return 'haber';
}

/** Yatırım turunun etiketi: "Tohum" → "TOHUM TURU"; "Seri A", "Satın alma" olduğu gibi. */
export function turEtiketi(tur: string) {
  const b = tur.trim().toLocaleUpperCase('tr-TR');
  return /TUR|SERİ|SATIN|HALKA|ARZ|BİRLEŞ/.test(b) ? b : `${b} TURU`;
}

const ac = (o: Olcu, d: Record<string, string | number>) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${o.g}" height="${o.y}" viewBox="0 0 ${o.g} ${o.y}" ${Object.entries(d)
    .map(([a, b]) => `data-${a}="${b}"`)
    .join(' ')}>`;

const zemin = (o: Olcu) => `<rect width="${o.g}" height="${o.y}" fill="${KIMLIK.kagit}"/><rect width="${o.g}" height="${o.bant}" fill="${KIMLIK.sari}"/>`;

/** Çerçeveli etiket; (x, y) sol üst köşe. */
function etiket(x: number, y: number, yazi: string, tur: 'cerceve' | 'yesil' | 'murekkep' | 'gri', k: number) {
  const boyut = 22 * k;
  const ayar: MetinAyar = { yuz: 'yari', boyut, renk: KIMLIK.murekkep, aralik: boyut * 0.12 };
  const w = genislik(yazi, ayar) + 26 * k;
  const h = 40 * k;
  const taban = y + h / 2 + (boyut * BUYUK_HARF) / 2;
  const kenar = 2 * k;
  let kutu = '';
  if (tur === 'yesil') kutu = `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" fill="${KIMLIK.yesil}"/>`;
  else if (tur === 'murekkep') kutu = `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" fill="${KIMLIK.murekkep}"/>`;
  else kutu = `<rect x="${x + kenar / 2}" y="${y + kenar / 2}" width="${(w - kenar).toFixed(1)}" height="${h - kenar}" fill="none" stroke="${tur === 'gri' ? '#8b918c' : KIMLIK.murekkep}" stroke-width="${kenar}"/>`;
  const renk = tur === 'yesil' ? '#ffffff' : tur === 'murekkep' ? KIMLIK.kagit : tur === 'gri' ? KIMLIK.gri : KIMLIK.murekkep;
  return { svg: kutu + metin(yazi, x + 13 * k, taban, { ...ayar, renk }), w, h };
}

/** Alt satır: solda logo, sağda sarı alt çizgili kategori. Üst sınırını döner. */
function altSatir(o: Olcu, yazi: string) {
  const l = logo(o.pad, o.alt, o.isaret);
  const ayar: MetinAyar = { yuz: 'kalin', boyut: o.kat, renk: BASLIK_RENGI, aralik: o.kat * 0.06, hiza: 'end' };
  const taban = o.alt - o.kat * 0.45;
  const w = genislik(yazi, ayar);
  const cizgi = `<rect x="${(o.g - o.pad - w).toFixed(1)}" y="${(taban + o.kat * 0.32).toFixed(1)}" width="${w.toFixed(1)}" height="${(o.kat * 0.14).toFixed(1)}" fill="${KIMLIK.sari}"/>`;
  return { svg: l.svg + metin(yazi, o.g - o.pad, taban, ayar) + cizgi, ust: o.alt - o.isaret };
}

/** Başlığı yerleştirir: sığana kadar küçülür, en küçükte de sığmazsa satır sayısı kısalır ("…"). */
function baslikYerlestir(s: string, x: number, ilkUst: number, enAlt: number, genis: number, puntolar: number[], yuz: MetinAyar['yuz']) {
  let boyut = puntolar[0];
  let satir: string[] = [];
  for (const p of puntolar) {
    boyut = p;
    satir = satirlar(s, genis, { yuz, boyut: p, renk: KIMLIK.murekkep, aralik: -p * 0.025 });
    if (ilkUst + p * BUYUK_HARF + (satir.length - 1) * p * SATIR_ADIMI + p * 0.22 <= enAlt) break;
  }
  const sigan = Math.max(1, Math.floor((enAlt - ilkUst - boyut * BUYUK_HARF - boyut * 0.22) / (boyut * SATIR_ADIMI)) + 1);
  if (satir.length > sigan) satir = satirlar(s, genis, { yuz, boyut, renk: KIMLIK.murekkep, aralik: -boyut * 0.025 }, sigan);
  const ilkTaban = ilkUst + boyut * BUYUK_HARF;
  const svg = satir
    .map((l, i) => metin(l, x, ilkTaban + i * boyut * SATIR_ADIMI, { yuz, boyut, renk: KIMLIK.murekkep, aralik: -boyut * 0.025 }))
    .join('');
  return { svg, alt: ilkTaban + (satir.length - 1) * boyut * SATIR_ADIMI + boyut * 0.22 };
}

function haberSvg(v: KapakVeri, o: Olcu) {
  const { ana, tarih } = bol(v.baslik, v.kategori);
  const etiketYazi = kunyeEtiketi(v.kategori, tarih);
  const alt = altSatir(o, etiketYazi);
  const enAlt = alt.ust - 30 * o.k;
  const b = baslikYerlestir(ana, o.pad - 2, o.ust + 26 * o.k, enAlt, o.g - 2 * o.pad, o.baslik, 'kalin');
  return `${ac(o, { 'baslik-alt': b.alt.toFixed(1), 'alt-ust': alt.ust.toFixed(1), kategori: etiketYazi })}${zemin(o)}${b.svg}${alt.svg}</svg>`;
}

function kunyeSvg(v: KapakVeri, o: Olcu) {
  const k = o.k;
  const x = o.pad;
  const genis = o.g - 2 * o.pad;
  const ust = Math.max(o.bant + 52 * k, o.ust);
  let svg = '';
  const durum = durumEtiketi(v.durum);
  if (durum) svg += etiket(x, ust, durum.metin, durum.tur, k).svg;
  const l = logo(0, 0, 40 * k);
  svg += logo(o.g - o.pad - l.genislik, ust + 40 * k, 40 * k).svg;

  // Girişim adı tek satır; sığmazsa küçülür.
  let ad = 58 * k;
  while (ad > 36 * k && genislik(v.girisim!, { yuz: 'yari', boyut: ad, renk: '', aralik: -ad * 0.02 }) > genis) ad -= 2 * k;
  let taban = ust + 40 * k + 28 * k + ad * BUYUK_HARF;
  svg += metin(v.girisim!, x, taban, { yuz: 'yari', boyut: ad, renk: KIMLIK.murekkep, aralik: -ad * 0.02 });
  if (v.platform) {
    taban += 36 * k;
    svg += metin(v.platform, x, taban, { yuz: 'normal', boyut: 24 * k, renk: KIMLIK.gri });
  }

  const yuzde = (v.toplanan! / v.hedef!) * 100;
  const fonlandi = yuzde >= 100;
  // Tutar ve yüzde aynı satırda: sığana kadar ikisi birlikte küçülür.
  const tutarYazi = tutarKisa(v.toplanan!, v.paraBirimi);
  const yuzdeYazi = yuzdeKesik(yuzde);
  let tb = 92 * k;
  const tAyar = (b: number): MetinAyar => ({ yuz: 'yari', boyut: b, renk: KIMLIK.murekkep, aralik: -b * 0.03 });
  const yAyar = (b: number): MetinAyar => ({ yuz: 'yari', boyut: b * 0.587, renk: fonlandi ? KIMLIK.yesil : KIMLIK.murekkep, hiza: 'end' });
  while (tb > 48 * k && genislik(tutarYazi, tAyar(tb)) + genislik(yuzdeYazi, yAyar(tb)) + 40 * k > genis) tb -= 2 * k;
  taban += 30 * k + tb * BUYUK_HARF;
  svg += metin(tutarYazi, x, taban, tAyar(tb));
  svg += metin(yuzdeYazi, o.g - o.pad, taban, yAyar(tb));
  const tutarSag = x + genislik(tutarYazi, tAyar(tb)) + 40 * k + genislik(yuzdeYazi, yAyar(tb));

  // Hedef çubuğu: çizgi %100 noktasında, aşım açık yeşil.
  const c = cubukOlcegi(yuzde);
  const cy = taban + 22 * k;
  const ch = 14 * k;
  const hx = x + (genis * c.hedef) / 100;
  svg += `<rect x="${x}" y="${cy.toFixed(1)}" width="${genis}" height="${ch.toFixed(1)}" fill="#e4e1d8"/>`;
  svg += `<rect x="${x}" y="${cy.toFixed(1)}" width="${((genis * Math.max(c.dolu, yuzde > 0 ? 1.5 : 0)) / 100).toFixed(1)}" height="${ch.toFixed(1)}" fill="${fonlandi ? KIMLIK.yesil : KIMLIK.murekkep}"/>`;
  if (c.asim > 0) svg += `<rect x="${hx.toFixed(1)}" y="${cy.toFixed(1)}" width="${((genis * c.asim) / 100).toFixed(1)}" height="${ch.toFixed(1)}" fill="${KIMLIK.asim}"/>`;
  svg += `<rect x="${(Math.min(hx, x + genis - 3 * k) - 1.5 * k).toFixed(1)}" y="${(cy - 7 * k).toFixed(1)}" width="${(3 * k).toFixed(1)}" height="${(ch + 14 * k).toFixed(1)}" fill="${KIMLIK.murekkep}"/>`;
  const etiketTaban = cy + ch + 12 * k + 24 * k * BUYUK_HARF;
  const kucuk: MetinAyar = { yuz: 'normal', boyut: 24 * k, renk: KIMLIK.gri };
  svg += metin('toplanan', x, etiketTaban, kucuk);
  const hedefYazi = `hedef ${tutarKisa(v.hedef!, v.paraBirimi)}`;
  const hw = genislik(hedefYazi, kucuk);
  const hedefX = Math.min(Math.max(hx - hw / 2, x + genislik('toplanan', kucuk) + 24 * k), x + genis - hw);
  svg += metin(hedefYazi, hedefX, etiketTaban, kucuk);

  // Alt satır: yalnız verisi olan hücreler (uydurma yok).
  const hucreler: [string, string][] = [];
  if (sayi(v.yatirimci)) hucreler.push(['YATIRIMCI', v.yatirimci!.toLocaleString('tr-TR')]);
  let altUst = o.y;
  if (hucreler.length) {
    const deger = o.alt - 4 * k;
    const etiketB = deger - 40 * k;
    const cizgiY = etiketB - 19 * k * BUYUK_HARF - 18 * k;
    altUst = cizgiY;
    svg += `<rect x="${x}" y="${cizgiY.toFixed(1)}" width="${genis}" height="${(1.5 * k).toFixed(1)}" fill="${KIMLIK.cizgi}"/>`;
    const adim = hucreler.length > 1 ? genis / (hucreler.length - 1) : 0;
    hucreler.forEach(([e, d], i) => {
      const hiza = hucreler.length > 1 && i === hucreler.length - 1 ? 'end' : 'start';
      const hx2 = x + i * adim;
      svg += `<g data-hucre="${e}">${metin(e, hx2, etiketB, { yuz: 'orta', boyut: 19 * k, renk: KIMLIK.gri, aralik: 19 * k * 0.08, hiza })}${metin(d, hx2, deger, { yuz: 'yari', boyut: 32 * k, renk: KIMLIK.murekkep, hiza })}</g>`;
    });
  }
  return `${ac(o, { 'baslik-alt': etiketTaban.toFixed(1), 'alt-ust': altUst.toFixed(1), 'tutar-sag': tutarSag.toFixed(1), 'icerik-sag': o.g - o.pad, kategori: kunyeEtiketi(v.kategori, null) })}${zemin(o)}${svg}</svg>`;
}

function yatirimSvg(v: KapakVeri, o: Olcu) {
  const k = o.k;
  const etiketYazi = kunyeEtiketi(v.kategori, null);
  const alt = altSatir(o, etiketYazi);
  const ust = Math.max(o.bant + 52 * k, o.ust);
  let svg = etiket(o.pad, ust, turEtiketi(v.tur!), 'cerceve', k).svg;
  const tutar = tutarKisa(v.toplanan!, v.paraBirimi);
  let tutarBoyu = 112 * k;
  while (tutarBoyu > 56 * k && genislik(tutar, { yuz: 'yari', boyut: tutarBoyu, renk: '', aralik: -tutarBoyu * 0.035 }) > o.g - 2 * o.pad) tutarBoyu -= 2 * k;
  const tutarSag = o.pad - 4 + genislik(tutar, { yuz: 'yari', boyut: tutarBoyu, renk: '', aralik: -tutarBoyu * 0.035 });
  const tutarAlan = 30 * k + tutarBoyu * BUYUK_HARF;
  const b = baslikYerlestir(v.baslik, o.pad - 2, ust + 40 * k + 30 * k, alt.ust - 30 * k - tutarAlan, o.g - 2 * o.pad, [60 * k, 54 * k, 48 * k], 'kalin');
  const tutarTaban = b.alt + tutarAlan;
  svg += b.svg;
  svg += metin(tutar, o.pad - 4, tutarTaban, { yuz: 'yari', boyut: tutarBoyu, renk: KIMLIK.murekkep, aralik: -tutarBoyu * 0.035 });
  return `${ac(o, { 'baslik-alt': tutarTaban.toFixed(1), 'alt-ust': alt.ust.toFixed(1), 'tutar-sag': tutarSag.toFixed(1), 'icerik-sag': o.g - o.pad, kategori: etiketYazi })}${zemin(o)}${svg}${alt.svg}</svg>`;
}

/** Haber kartı (SVG). Düzen veriden seçilir. */
export function kartSvg(v: KapakVeri, bicim: Bicim = 'kapak') {
  const o = OLCU[bicim];
  const duzen = kapakDuzeni(v);
  if (duzen === 'kunye') return kunyeSvg(v, o);
  if (duzen === 'yatirim') return yatirimSvg(v, o);
  return haberSvg(v, o);
}
