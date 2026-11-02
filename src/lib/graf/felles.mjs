// Grafik setinin ortak saf yardımcıları: ölçek, eksen değerleri, tr-TR sayı biçimi, birim yazımı, SVG yolları.
// tidsrøst'ün grafik setinden (tidsrost/src/lib/graf) uyarlandı; kifobu kuralı (BRAND.md): % ve ₺ sayının önünde,
// hesaplanan yüzde iki ondalık ve kesilerek (pay).

const yuvarla = (n) => Math.round(n * 1e10) / 1e10;

/** [min, max] aralığını kapsayan, 1/2/2,5/5 × 10ⁿ adımlı yaklaşık n+1 eksen değeri. Düz seride değerin etrafında açılır. */
export function fineTikker(min, max, n = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error(`fineTikker: sonlu olmayan aralık (${min}, ${max})`);
  if (!(max > min)) {
    const a = Math.abs(min) || 1;
    return fineTikker(min - a / 2, max + a / 2, n);
  }
  const ham = (max - min) / n;
  const us = 10 ** Math.floor(Math.log10(ham));
  const adim = [1, 2, 2.5, 5, 10].map((k) => k * us).find((s) => s >= ham - 1e-12);
  const bas = Math.floor(yuvarla(min / adim)) * adim;
  const son = Math.ceil(yuvarla(max / adim)) * adim;
  const ut = [];
  for (let v = bas; v <= son + adim / 2; v += adim) ut.push(yuvarla(v));
  return ut;
}

/** Eksen etiketleri için ondalık sayısı: adımı tam gösterecek kadar (en çok 2). */
export function tikkDesimaler(tikker) {
  const steg = tikker.length > 1 ? Math.abs(tikker[1] - tikker[0]) : Math.abs(tikker[0]);
  if (!steg) return 0;
  for (let d = 0; d <= 2; d++) if (Math.abs(Math.round(steg * 10 ** d) - steg * 10 ** d) < 1e-9) return d;
  return 2;
}

/** Doğrusal ölçek: [d0, d1] → [r0, r1]. Düz aralıkta ortaya düşer. */
export function skala(d0, d1, r0, r1) {
  if (d1 === d0) return () => (r0 + r1) / 2;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

const bicim = new Map();
/** Sıfıra doğru keser; göreli pay yalnız kayan nokta artığını siler (src/lib/kimlik.ts asagiKes ile aynı). */
export function kes(x, basamak) {
  const y = x * 10 ** basamak;
  const k = Math.trunc(y + Math.sign(y) * Math.abs(y) * 8 * Number.EPSILON) / 10 ** basamak;
  return k === 0 ? 0 : k;
}

/**
 * tr-TR sayı: virgül ondalık, nokta binlik. Veri değerleri yuvarlanır: yazıdaki alt metin ve motor da yuvarlar, kart
 * yazıyla birebir aynı rakamı göstermeli. Kartın kendi hesapladığı paylar önce kes() ile kesilir (pay).
 */
export function tall(v, desimaler = 1) {
  if (!bicim.has(desimaler)) bicim.set(desimaler, new Intl.NumberFormat('tr-TR', { minimumFractionDigits: desimaler, maximumFractionDigits: desimaler }));
  return bicim.get(desimaler).format(v);
}

/** Kartın hesapladığı yüzde (pay, oran): iki ondalık, kesilerek; %99,996 asla %100,00 olmaz. */
export function pay(v) {
  return ekle(tall(kes(v, 2), 2), '%|');
}

/** Biçimlenmiş sayıya kısa birimi ekler: birim "ön|son" (kortEnhet). İşaret önde kalır: -%1,23, +₺4,2 milyar. */
export function ekle(sayi, birim) {
  if (!birim) return sayi;
  const [on, son] = birim.includes('|') ? birim.split('|') : ['', birim];
  const m = String(sayi).match(/^([+\-−]?)(.*)$/);
  return `${m[1]}${on}${m[2]}${son}`;
}

/** Uzun adı `maks` karaktere indirir (sonuna …). */
export function kortNavn(s, maks) {
  return s.length > maks ? `${s.slice(0, maks - 1)}…` : s;
}

/** XML/HTML kaçışı. */
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const n = (v) => yuvarla(Math.round(v * 100) / 100);

/** Noktalardan M/L yolu; y null olan noktada çizgi kesilir. */
export function sti(punkter) {
  let ut = '';
  let acik = false;
  for (const p of punkter) {
    if (p.y === null || p.y === undefined) { acik = false; continue; }
    ut += `${acik ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`;
    acik = true;
  }
  return ut;
}

/** Basamaklı yol: önce yatay, sonra dikey. */
export function trappSti(punkter) {
  const g = punkter.filter((p) => p.y !== null && p.y !== undefined);
  if (!g.length) return '';
  return g.reduce((d, p, i) => (i ? `${d}H${n(p.x)}V${n(p.y)}` : `M${n(p.x)} ${n(p.y)}`), '');
}

/**
 * İpucu için kısa birim, "ön|son" biçiminde (ekle): yüzde → "%|", yüzde puan → "| puan", TL → "₺|" (+ " milyar" vb.),
 * öteki ölçek sözcükleri sonda. Grafikte ₺ sayının önünde, boşluksuz (BRAND.md).
 */
export function kortEnhet(enhet) {
  const e = String(enhet ?? '');
  if (/puan/i.test(e)) return '| puan';
  if (/^prosent$|yüzde|%/i.test(e)) return '%|';
  const olcek = /milyar/i.test(e) ? ' milyar' : /milyon/i.test(e) ? ' milyon' : /(^|\s)bin(\s|$)/i.test(e) ? ' bin' : '';
  if (/(^|[\s(])TL([\s,.)]|$)|₺|lira/i.test(e)) return `₺|${olcek}`;
  if (/dolar|\$/i.test(e)) return `$|${olcek}`;
  if (/avro|euro|€/i.test(e)) return `€|${olcek}`;
  return olcek;
}

/** Eksende en çok `antall` etiket: baş, son ve aradakiler eşit aralıkla. */
export function etikettIndekser(lengde, antall = 4) {
  const k = Math.min(antall, lengde);
  if (k <= 1) return [0];
  return [...new Set(Array.from({ length: k }, (_, i) => Math.round((i / (k - 1)) * (lengde - 1))))];
}

/** SVG metni (kaçışlı). */
export function tekst(x, y, innhold, attr = '') {
  return `<text x="${n(x)}" y="${n(y)}"${attr ? ` ${attr}` : ''}>${esc(innhold)}</text>`;
}

/** Öznitelik için iki ondalığa yuvarlar. */
export const r2 = (v) => Math.round(v * 100) / 100;

/** Değer null/undefined mı? */
export const tom = (v) => v === null || v === undefined;

/** Sol y ekseni: yatay ızgara çizgileri ve değer etiketleri (g-akse). */
export function yAkse(tikker, y, V, sag) {
  const des = tikkDesimaler(tikker);
  return `<g class="g-akse">${tikker.map((t) => `<line x1="${V}" x2="${sag}" y1="${r2(y(t))}" y2="${r2(y(t))}"${t === 0 ? ' class="g-null"' : ''}/>${tekst(V - 6, y(t) + 4, tall(t, des), 'text-anchor="end"')}`).join('')}</g>`;
}

/** Alt x etiketleri: en çok `antall` tane, kısaltılmış. */
export function xEtiketter(etiketter, xAv, H, antall = 4) {
  const n = etiketter.length;
  return etikettIndekser(n, antall).map((i) => tekst(xAv(i), H - 7, kortNavn(String(etiketter[i]), 12), `text-anchor="${n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}"`)).join('');
}

/** SVG kabuğu. */
export function svgKabuk(bredde, H, beskrivelse, innhold) {
  return `<svg viewBox="0 0 ${bredde} ${H}" class="g-svg" role="img" aria-label="${esc(beskrivelse)}">${innhold}</svg>`;
}
