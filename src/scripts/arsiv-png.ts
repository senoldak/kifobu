// Arşiv PNG çıktıları: grafik (SVG -> canvas, çerçeveli) ve 1080×1080 kampanya kartı.
import { paraKisa, yuzdeEkli, tarihTr } from '../lib/arsiv/bicim.ts';

export interface KampanyaKartVerisi {
  ad: string;
  platform: string;
  platformRenk: string;
  toplam: number;
  yuzde: number;
  durum: string;
  tarih: string;
  seri: number[] /* yüzde noktaları */;
}

// Kimlik v2 (BRAND.md): kâğıt zemin, mürekkep yazı, tek aile Schibsted Grotesk. Eski adlar korunur.
const TAHTA = '#f7f5ef';
const TAHTA_KOYU = '#efece4';
const TEBESIR = '#141a17';
const TEBESIR_2 = '#3b413d';
const TEBESIR_3 = '#5d645f';
const CIZGI = '#dcd9cf';
const SARI = '#141a17';

const GOVDE = '"Schibsted Grotesk", sans-serif';
const BASLIK = GOVDE;
const TAHTA_YAZI = GOVDE;
const KAYNAK_GENEL = 'Kaynak: platformların kampanya sayfaları';

// Örnek metin latin-ext alt kümesini de (Türkçe harfler, ₺) yükletir.
const ORNEK = 'AaİıŞşĞğÜüÖöÇç₺%0123456789';
const KULLANILAN = [
  `800 64px "Schibsted Grotesk"`,
  `700 32px "Schibsted Grotesk"`,
  `600 32px "Schibsted Grotesk"`,
  `500 32px "Schibsted Grotesk"`,
];

let fontlarSozu: Promise<void> | null = null;
function fontlariHazirla(): Promise<void> {
  fontlarSozu ??= Promise.all(KULLANILAN.map((f) => document.fonts.load(f, ORNEK)))
    .then(() => document.fonts.ready)
    .then(() => undefined)
    .catch(() => undefined);
  return fontlarSozu;
}

function resimYukle(src: string): Promise<HTMLImageElement> {
  return new Promise((coz, reddet) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => coz(img);
    img.onerror = () => reddet(new Error(`Görsel yüklenemedi: ${src.slice(0, 60)}`));
    img.src = src;
  });
}

let logoSozu: Promise<HTMLImageElement> | null = null;
const logo = () => (logoSozu ??= resimYukle('/favicon-512.png'));

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((coz, reddet) => {
    const r = new FileReader();
    r.onload = () => coz(String(r.result));
    r.onerror = () => reddet(r.error);
    r.readAsDataURL(blob);
  });
}

// SVG, <img> içinde sayfanın web fontlarını göremez: Schibsted Grotesk data: URL olarak gömülür.
const SVG_FONTLARI = [
  {
    dosya: '/fonts/schibsted-grotesk-latin-v2.woff2',
    aralik:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    dosya: '/fonts/schibsted-grotesk-latin-ext-v2.woff2',
    aralik:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
];
let svgFontCssSozu: Promise<string> | null = null;
function svgFontCss(): Promise<string> {
  svgFontCssSozu ??= Promise.all(
    SVG_FONTLARI.map(async (f) => {
      const yanit = await fetch(f.dosya);
      if (!yanit.ok) throw new Error(`Yazı tipi alınamadı: ${f.dosya}`);
      const url = await dataUrl(await yanit.blob());
      return `@font-face{font-family:'Schibsted Grotesk';font-style:normal;font-weight:400 800;src:url(${url}) format('woff2');unicode-range:${f.aralik};}`;
    }),
  ).then((p) => p.join(''));
  svgFontCssSozu.catch(() => (svgFontCssSozu = null));
  return svgFontCssSozu;
}

function tuval(w: number, h: number, olcek: number) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * olcek);
  c.height = Math.round(h * olcek);
  const ctx = c.getContext('2d')!;
  ctx.scale(olcek, olcek);
  ctx.textBaseline = 'alphabetic';
  return { c, ctx };
}

function pngBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((coz, reddet) =>
    c.toBlob((b) => (b ? coz(b) : reddet(new Error('PNG üretilemedi'))), 'image/png'),
  );
}

function aralikli(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}

function logoCiz(ctx: CanvasRenderingContext2D, img: HTMLImageElement, sag: number, alt: number, yukseklik: number) {
  const g = (yukseklik * img.naturalWidth) / img.naturalHeight;
  ctx.drawImage(img, sag - g, alt - yukseklik, g, yukseklik);
}

/** Yazıyı en çok `genislik` kadar sığdıracak en büyük boyutu (≤ boy) döndürür. */
function sigdir(ctx: CanvasRenderingContext2D, metin: string, agirlik: number, aile: string, boy: number, genislik: number) {
  let b = boy;
  for (; b > 24; b -= 4) {
    ctx.font = `${agirlik} ${b}px ${aile}`;
    if (ctx.measureText(metin).width <= genislik) break;
  }
  return b;
}

/**
 * Görünen grafiği çerçeveli PNG'ye çevirir. Boyut viewBox'tan alınır
 * (gizli SVG'lerde getBoundingClientRect 0 döner). `tarih` DD.MM.YYYY.
 */
export async function grafikPng(svg: SVGSVGElement, baslik: string, tarih = ''): Promise<Blob> {
  const vb = svg.viewBox.baseVal;
  const w = vb && vb.width ? vb.width : 720;
  const h = vb && vb.height ? vb.height : 280;

  const [css, logoImg] = await Promise.all([svgFontCss(), logo(), fontlariHazirla()]);

  const kopya = svg.cloneNode(true) as SVGSVGElement;
  kopya.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  kopya.setAttribute('width', String(w));
  kopya.setAttribute('height', String(h));
  kopya.removeAttribute('class');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const stil = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  stil.textContent = css;
  defs.appendChild(stil);
  kopya.insertBefore(defs, kopya.firstChild);
  const metin = new XMLSerializer().serializeToString(kopya);
  const grafik = await resimYukle(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(metin)}`);

  const P = 32;
  const UST = 92;
  const ALT = 76;
  const W = w + P * 2;
  const H = UST + h + ALT;
  const { c, ctx } = tuval(W, H, 2);

  ctx.fillStyle = TAHTA;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = TAHTA_KOYU;
  ctx.fillRect(0, H - 6, W, 6);

  ctx.fillStyle = SARI;
  ctx.font = `800 14px ${BASLIK}`;
  aralikli(ctx, 2);
  ctx.fillText('KİTLE FONLAMA ARŞİVİ', P, P + 12);
  aralikli(ctx, 0);
  ctx.fillStyle = TEBESIR;
  ctx.font = `800 34px ${TAHTA_YAZI}`;
  ctx.fillText(baslik, P, P + 48);

  ctx.drawImage(grafik, P, UST, w, h);

  ctx.fillStyle = TEBESIR_3;
  ctx.font = `500 13px ${GOVDE}`;
  ctx.fillText(tarih ? `${KAYNAK_GENEL} · ${tarih}` : KAYNAK_GENEL, P, H - 30);
  logoCiz(ctx, logoImg, W - P, H - 18, 44);

  return pngBlob(c);
}

/** 1080×1080 kampanya kartı. */
export async function kampanyaKartiPng(v: KampanyaKartVerisi): Promise<Blob> {
  const [logoImg] = await Promise.all([logo(), fontlariHazirla()]);
  const S = 1080;
  const P = 80;
  const { c, ctx } = tuval(S, S, 1);

  ctx.fillStyle = TAHTA;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = TAHTA_KOYU;
  ctx.fillRect(0, S - 14, S, 14);

  // Üst etiket
  ctx.fillStyle = SARI;
  ctx.font = `800 26px ${BASLIK}`;
  aralikli(ctx, 4);
  ctx.fillText('KİTLE FONLAMA ARŞİVİ', P, 116);
  aralikli(ctx, 0);

  // Girişim adı
  const adBoy = sigdir(ctx, v.ad, 800, TAHTA_YAZI, 168, S - P * 2);
  ctx.fillStyle = TEBESIR;
  ctx.font = `800 ${adBoy}px ${TAHTA_YAZI}`;
  ctx.fillText(v.ad, P, 128 + adBoy * 0.92);

  // Platform
  const platY = 330;
  ctx.fillStyle = v.platformRenk;
  ctx.beginPath();
  ctx.arc(P + 13, platY - 12, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TEBESIR_2;
  ctx.font = `600 38px ${GOVDE}`;
  ctx.fillText(v.platform, P + 42, platY);

  // Toplam, hedef yüzdesi, durum
  ctx.fillStyle = SARI;
  ctx.font = `800 132px ${TAHTA_YAZI}`;
  ctx.fillText(paraKisa(v.toplam), P, 478);
  ctx.fillStyle = TEBESIR;
  ctx.font = `700 46px ${BASLIK}`;
  ctx.fillText(`hedefin ${yuzdeEkli(v.yuzde)}`, P, 544);
  ctx.fillStyle = TEBESIR_3;
  ctx.font = `600 34px ${GOVDE}`;
  ctx.fillText(v.durum, P, 596);

  // Dolma çizgisi + %100 hedef çizgisi
  const x0 = P;
  const x1 = S - P;
  const yUst = 650;
  const yAlt = 900;
  const ust = Math.max(100, ...v.seri) * 1.08;
  const y = (d: number) => yAlt - (Math.max(0, d) / ust) * (yAlt - yUst);
  const n = v.seri.length;
  const x = (i: number) => (n > 1 ? x0 + (i / (n - 1)) * (x1 - x0) : x1);

  ctx.strokeStyle = CIZGI;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, yAlt);
  ctx.lineTo(x1, yAlt);
  ctx.stroke();

  ctx.setLineDash([12, 10]);
  ctx.strokeStyle = TEBESIR_2;
  ctx.beginPath();
  ctx.moveTo(x0, y(100));
  ctx.lineTo(x1, y(100));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = TEBESIR_2;
  ctx.font = `700 24px ${BASLIK}`;
  ctx.textAlign = 'right';
  ctx.fillText('%100 hedef', x1, y(100) - 12);
  ctx.textAlign = 'left';

  if (n > 0) {
    ctx.beginPath();
    v.seri.forEach((d, i) => (i ? ctx.lineTo(x(i), y(d)) : ctx.moveTo(x(i), y(d))));
    if (n > 1) {
      ctx.lineTo(x(n - 1), yAlt);
      ctx.lineTo(x(0), yAlt);
      ctx.closePath();
      ctx.fillStyle = 'rgba(242,212,92,0.16)';
      ctx.fill();
      ctx.beginPath();
      v.seri.forEach((d, i) => (i ? ctx.lineTo(x(i), y(d)) : ctx.moveTo(x(i), y(d))));
      ctx.strokeStyle = SARI;
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.fillStyle = SARI;
    ctx.beginPath();
    ctx.arc(x(n - 1), y(v.seri[n - 1]), 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Alt satır + logo
  ctx.fillStyle = TEBESIR_3;
  ctx.font = `500 26px ${GOVDE}`;
  ctx.fillText(`Kaynak: ${v.platform} kampanya sayfası · ${tarihTr(v.tarih)}`, P, 1010);
  logoCiz(ctx, logoImg, S - P, 1034, 96);

  return pngBlob(c);
}

export function indir(blob: Blob, ad: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
