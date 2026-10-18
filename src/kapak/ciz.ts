// Haber kapakları: görsel, haberin kendi künyesinden çizilir (tidsrost'taki gibi dışarıdan fotoğraf alınmaz).
// Her fonksiyon 1200×675 (16:9) SVG döner; /kapak/[id].png uç noktası bunu sharp ile PNG'ye çevirir.
// Yazılar yazı tipinden doğrudan vektör yola çevrilir; böylece derleme makinesinde yazı tipi kurulu olması gerekmez.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { create, type Font } from 'fontkitten';
import { categoryName, SITE } from '../lib/site.ts';
import { kartSvg } from './kart.ts';
import type { Haber } from '../lib/news';

export const KAPAK_G = 1200;
export const KAPAK_Y = 675;
const G = KAPAK_G;
const Y = KAPAK_Y;

// Seans tahtası paleti (global.css ile aynı).
const R = {
  tahta: '#1d2723',
  koyu: '#151d1a',
  tebesir: '#ecefe9',
  tebesir2: 'rgb(236 239 233 / 0.74)',
  tebesir3: 'rgb(236 239 233 / 0.62)',
  cizgi: 'rgb(236 239 233 / 0.32)',
  ince: 'rgb(236 239 233 / 0.14)',
  sari: '#f2d45c',
  pembe: '#f19bb0',
  mavi: '#8fc7e0',
};

export type Yuz = 'tahta' | 'baslik' | 'baslikInce' | 'govde';
const DOSYA: Record<Yuz, string> = {
  tahta: 'SofiaSansExtraCondensed-ExtraBold.ttf',
  baslik: 'SofiaSansCondensed-ExtraBold.ttf',
  baslikInce: 'SofiaSansCondensed-Bold.ttf',
  govde: 'SofiaSans-SemiBold.ttf',
};

const fontlar = new Map<Yuz, Font>();
export function font(yuz: Yuz): Font {
  let f = fontlar.get(yuz);
  if (!f) {
    // Derleme proje kökünden çalışır; paketlenmiş dosyanın yeri değiştiği için import.meta.url kullanılmaz.
    f = create(readFileSync(path.join(process.cwd(), 'src/kapak/fontlar', DOSYA[yuz]))) as Font;
    fontlar.set(yuz, f);
  }
  return f;
}

export interface MetinAyar {
  yuz: Yuz;
  boyut: number;
  renk: string;
  hiza?: 'start' | 'end';
  aralik?: number; // harf aralığı, piksel
}

export function genislik(s: string, { yuz, boyut, aralik = 0 }: MetinAyar) {
  const f = font(yuz);
  const glifler = f.glyphsForString(s);
  const olcek = boyut / f.unitsPerEm;
  return glifler.reduce((t, g) => t + g.advanceWidth * olcek, 0) + aralik * Math.max(0, glifler.length - 1);
}

/** Metni yazı tipinin glif yollarıyla çizer; (x, y) taban çizgisidir. */
export function metin(s: string, x: number, y: number, ayar: MetinAyar) {
  const f = font(ayar.yuz);
  const olcek = ayar.boyut / f.unitsPerEm;
  const aralik = ayar.aralik ?? 0;
  let cx = ayar.hiza === 'end' ? x - genislik(s, ayar) : x;
  let yollar = '';
  for (const g of f.glyphsForString(s)) {
    const d = g.path.toSVG();
    if (d) yollar += `<path transform="translate(${cx.toFixed(1)} ${y}) scale(${olcek} ${-olcek})" d="${d}"/>`;
    cx += g.advanceWidth * olcek + aralik;
  }
  return `<g fill="${ayar.renk}">${yollar}</g>`;
}

/** Kelimeleri verilen genişliğe sığacak satırlara böler. */
export function satirlar(s: string, maks: number, ayar: MetinAyar, maksSatir: number) {
  const out: string[] = [];
  let satir = '';
  for (const kelime of s.split(/\s+/)) {
    const aday = satir ? `${satir} ${kelime}` : kelime;
    if (satir && genislik(aday, ayar) > maks) {
      out.push(satir);
      satir = kelime;
    } else satir = aday;
  }
  if (satir) out.push(satir);
  if (out.length > maksSatir) {
    out.length = maksSatir;
    out[maksSatir - 1] = out[maksSatir - 1].replace(/\s*\S*$/, '') + ' …';
  }
  return out;
}

// Haber kapağı: kart.ts ("Seans · Künye"). Kampanyalar da aynı kartı kullanır; tutar ayrıca çizilmez
// (sahibin kararı, 2026-10-18).
export function kapakSvg(h: Haber) {
  return kartSvg({ baslik: h.data.title, kategori: h.data.category }, 'kapak');
}

/** Çizilen kapağın ekran okuyucu metni. */
export function kapakAlt(h: Haber) {
  return `${categoryName(h.data.category)}: ${h.data.title}`;
}

export const kapakUrl = (h: Haber) => `/kapak/${h.id}.png`;

// ── Yayıncı logosu (JSON-LD publisher.logo): sitenin üst bandındaki yazı logosunun aynısı ──
// Google haber yayıncı logosu için dikdörtgen, en az 600×60 PNG ister. Marka işareti (ayçiçeği) yalnız favicon'da
// kullanıldığı için (DESIGN.md) logo "kifobu | Ulaşılabilir ve anlaşılır veri" yazı dizilişinden çizilir.
export const LOGO_G = 600;
export const LOGO_Y = 60;
export function logoSvg() {
  // Google yayıncı logosu yönergesi: beyaz zemin, yalnız logotip (slogan yok), 60 px yüksekliği dolduran yazı.
  const isim: MetinAyar = { yuz: 'baslik', boyut: 50, renk: R.tahta };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_G}" height="${LOGO_Y}" viewBox="0 0 ${LOGO_G} ${LOGO_Y}"><rect width="${LOGO_G}" height="${LOGO_Y}" fill="#ffffff"/>${metin(SITE.name, 4, 45, isim)}</svg>`;
}
