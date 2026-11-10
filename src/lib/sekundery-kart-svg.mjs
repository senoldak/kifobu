// Sekundery paylaşım kartı (1080 × 1350) SVG olarak: ısı ızgarası düzeni.
// Kartın gövdesi bütün pay gruplarıdır: her pay grubu bir karo (kod + değer), büyükten küçüğe; renk koyuluğu farkın büyüklüğü.
// Yazılar Schibsted Grotesk'ten yola çevrilir; sayfa ve PNG birebir aynıdır.
// Artı hardal, eksi lacivert (BRAND.md istisnası); tek yönlü (fark, tutar) kartlarda karo marka yeşili.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { create } from 'fontkitten';

export const W = 1080, H = 1350;
const SOL = 72, SAG = W - 72;
const R = { a: '#8a6a00', e: '#2f4b6e', m: '#141a17', g: '#5d645f', g2: '#3b413d', cizgi: '#dcd9cf', sari: '#e8b40c', yesil: '#10b981', asim: '#a7e9cf' };

let ana = null;
const fontlar = new Map();
function font(w) {
  ana ??= create(readFileSync(path.join(process.cwd(), 'src/kapak/fontlar/SchibstedGrotesk[wght].ttf')));
  if (!fontlar.has(w)) fontlar.set(w, ana.getVariation({ wght: w }));
  return fontlar.get(w);
}
export function genislik(s, a = {}) {
  const f = font(a.agirlik ?? 400), olcek = (a.boyut ?? 24) / f.unitsPerEm;
  const g = f.glyphsForString(String(s));
  return g.reduce((t, x) => t + x.advanceWidth * olcek, 0) + (a.aralik ?? 0) * Math.max(0, g.length - 1);
}
/** Yazıyı yol olarak çizer. a: { boyut, agirlik (400–800), renk, hiza: 'start'|'end', aralik } */
export function metin(s, x, y, a = {}) {
  const f = font(a.agirlik ?? 400), olcek = (a.boyut ?? 24) / f.unitsPerEm, aralik = a.aralik ?? 0;
  let cx = a.hiza === 'end' ? x - genislik(s, a) : x;
  let d = '';
  for (const g of f.glyphsForString(String(s))) {
    const p = g.path.toSVG();
    if (p) d += `<path transform="translate(${cx.toFixed(1)} ${y}) scale(${olcek.toFixed(5)} ${(-olcek).toFixed(5)})" d="${p}"/>`;
    cx += g.advanceWidth * olcek + aralik;
  }
  return `<g fill="${a.renk ?? R.m}">${d}</g>`;
}

const kacis = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const renkOf = (v, tekYon) => (tekYon ? R.m : v > 0 ? R.a : v < 0 ? R.e : R.m);

/** Sayım cümlesi: parçalar yan yana; sayılar iri ve renkli, sözcükler orta boy. Sığmazsa bütün cümle küçülür. */
function sayimCiz(parcalar, y) {
  const olc = (k) => parcalar.reduce((t, p) => t + genislik(p.t, p.sayi ? { boyut: 64 * k, agirlik: 800, aralik: -1.5 * k } : { boyut: 32 * k, agirlik: 600 }), 0);
  let k = 1;
  while (olc(k) > SAG - SOL && k > 0.6) k -= 0.05;
  let x = SOL, s = '';
  for (const p of parcalar) {
    const a = p.sayi ? { boyut: 64 * k, agirlik: 800, aralik: -1.5 * k, renk: p.renk ? R[p.renk] : R.m } : { boyut: 32 * k, agirlik: 600, renk: R.g2 };
    s += metin(p.t, x, y, a);
    x += genislik(p.t, a);
  }
  return s;
}

const siraliAl = (seri) => [...seri].sort((a, b) => b.deger - a.deger);
// ton ölçeği: büyük uçlar rengi doyursun diye mutlak değerlerin %85'liği (en az 1)
function tonOlcegi(l) {
  const m = l.map((r) => Math.abs(r.deger)).sort((a, b) => a - b);
  return Math.max(1e-9, m[Math.floor((m.length - 1) * 0.85)] || m.at(-1) || 1);
}
const hex2 = (a) => Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

/** Isı ızgarası: her pay grubu bir karo (kod + değer), büyükten küçüğe; renk koyuluğu farkın büyüklüğü. */
function izgaraCiz(seri, y0, y1, { tekYon = false } = {}) {
  const l = siraliAl(seri), N = l.length;
  if (!N) return '';
  const cols = N <= 24 ? 4 : N <= 60 ? 6 : 7, rows = Math.ceil(N / cols), gap = 6;
  const tw = (SAG - SOL - gap * (cols - 1)) / cols;
  const th = Math.min(100, (y1 - y0 - gap * (rows - 1)) / rows);
  const fs = Math.min(26, th * 0.3);
  const ref = tonOlcegi(l);
  const p = [];
  l.forEach((r, i) => {
    const x = SOL + (i % cols) * (tw + gap), y = y0 + Math.floor(i / cols) * (th + gap);
    const t = Math.min(1, Math.abs(r.deger) / ref);
    const taban = tekYon ? R.yesil : r.deger > 0 ? R.a : r.deger < 0 ? R.e : R.g;
    p.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${tw.toFixed(1)}" height="${th.toFixed(1)}" fill="${taban}${hex2(0.1 + t * 0.85)}"/>`);
    const koyu = !tekYon && t > 0.55;
    // uzun kod ya da değer kareden taşmasın: sığmayan satır kendi genişliğine göre küçültülür
    const sigdir = (s) => Math.min(fs, (fs * (tw - 20)) / Math.max(1, genislik(s, { boyut: fs, agirlik: 800 })));
    p.push(metin(r.kod, x + 12, y + th * 0.42, { boyut: sigdir(r.kod), agirlik: 800, renk: koyu ? '#ffffff' : R.m }));
    p.push(metin(r.yazi, x + 12, y + th * 0.42 + fs * 1.35, { boyut: sigdir(r.yazi), agirlik: 800, renk: koyu ? '#ffffff' : renkOf(r.deger, tekYon) }));
  });
  return p.join('');
}

/**
 * k: { id, baslik, alt?, sayim?: {t, sayi?, renk?:'a'|'e'}[], seri?: {kod, deger, yazi}[], tekYon?,
 *      cubuk?: {sol, sag, oran}, bilgiler?: {ad, deger}[], dipnot? }
 */
export function kartSvg(k, tarih) {
  const p = [];
  p.push(`<rect width="${W}" height="${H}" fill="#f7f5ef"/>`, `<rect width="${W}" height="18" fill="${R.sari}"/>`);
  // yayın başlığı (running head): her kartta aynı
  p.push(metin('Sekundery', SOL, 86, { boyut: 26, agirlik: 800 }));
  p.push(metin(tarih, SAG, 86, { boyut: 24, renk: R.g, hiza: 'end' }));
  p.push(`<rect x="${SOL}" y="108" width="${SAG - SOL}" height="2" fill="${R.cizgi}"/>`);
  p.push(metin(k.baslik, SOL, 196, { boyut: 62, agirlik: 800, aralik: -1.5 }));
  if (k.alt) p.push(metin(k.alt, SOL, 244, { boyut: 27, renk: R.g2 }));
  let y = 270;
  if (k.sayim?.length) {
    p.push(sayimCiz(k.sayim, 352));
    y = 384;
  }
  if (k.cubuk) {
    p.push(`<rect x="${SOL}" y="${y + 10}" width="${SAG - SOL}" height="40" fill="${R.asim}"/>`);
    p.push(`<rect x="${SOL}" y="${y + 10}" width="${((SAG - SOL) * k.cubuk.oran).toFixed(1)}" height="40" fill="${R.yesil}"/>`);
    p.push(metin(k.cubuk.sol, SOL, y + 92, { boyut: 28, agirlik: 700 }));
    p.push(metin(k.cubuk.sag, SAG, y + 92, { boyut: 28, agirlik: 700, hiza: 'end' }));
    y += 116;
  }
  const alt = k.dipnot ? H - 176 : H - 150;
  if (k.bilgiler?.length) {
    k.bilgiler.forEach((b, i) => {
      const yy = y + 70 + i * 84;
      p.push(metin(b.ad, SOL, yy, { boyut: 30, agirlik: 600, renk: R.g2 }));
      p.push(metin(b.deger, SAG, yy, { boyut: 36, agirlik: 800, hiza: 'end' }));
      p.push(`<rect x="${SOL}" y="${yy + 28}" width="${SAG - SOL}" height="1" fill="#e6e3da"/>`);
    });
  }
  if (k.seri?.length) p.push(izgaraCiz(k.seri, y + 40, alt + 20, { tekYon: k.tekYon }));

  if (k.dipnot) p.push(metin(k.dipnot, SOL, H - 128, { boyut: 21, renk: R.g }));
  p.push(`<rect x="${SOL}" y="${H - 100}" width="${SAG - SOL}" height="2" fill="${R.cizgi}"/>`);
  p.push(metin('kifobu.com/sekundery', SOL, H - 46, { boyut: 30, agirlik: 800 }));
  p.push(metin('Kamuya açık pay ilanlarından derlenmiştir.', SAG, H - 64, { boyut: 19, renk: R.g, hiza: 'end' }));
  p.push(metin('Gerçekleşen işlem değildir; yatırım tavsiyesi değildir.', SAG, H - 38, { boyut: 19, renk: R.g, hiza: 'end' }));
  return `<svg id="${kacis(k.id)}" class="kart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${kacis(k.baslik)}">${p.join('')}</svg>`;
}
