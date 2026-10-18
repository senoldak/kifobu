// Haber kapakları: görsel, haberin kendi künyesinden çizilir (dışarıdan fotoğraf alınmaz).
// Kapak 1200×675 (16:9) SVG; /kapak/[id].png uç noktası bunu sharp ile PNG'ye çevirir.
// Yazılar yazı tipinden doğrudan vektör yola çevrilir; böylece derleme makinesinde yazı tipi kurulu olması gerekmez.
// Kimlik v2 (BRAND.md): tek aile Schibsted Grotesk (değişken, 400–800).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { create, type Font } from 'fontkitten';
import { categoryName, SITE } from '../lib/site.ts';
import { KIMLIK, tohumIsaretiSvg } from '../lib/kimlik.ts';
import { kartSvg } from './kart.ts';
import type { Haber } from '../lib/news';

export const KAPAK_G = 1200;
export const KAPAK_Y = 675;

export type Yuz = 'normal' | 'orta' | 'yari' | 'kalin' | 'ekstra';
const AGIRLIK: Record<Yuz, number> = { normal: 400, orta: 500, yari: 600, kalin: 700, ekstra: 800 };

let ana: Font | null = null;
const fontlar = new Map<Yuz, Font>();
export function font(yuz: Yuz): Font {
  let f = fontlar.get(yuz);
  if (!f) {
    // Derleme proje kökünden çalışır; paketlenmiş dosyanın yeri değiştiği için import.meta.url kullanılmaz.
    ana ??= create(readFileSync(path.join(process.cwd(), 'src/kapak/fontlar/SchibstedGrotesk[wght].ttf'))) as Font;
    f = ana.getVariation({ wght: AGIRLIK[yuz] }) as Font;
    fontlar.set(yuz, f);
  }
  return f;
}

/** Büyük harf yüksekliği (em). */
export const BUYUK_HARF = 0.7;

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
    if (d) yollar += `<path transform="translate(${cx.toFixed(1)} ${y.toFixed(1)}) scale(${olcek} ${-olcek})" d="${d}"/>`;
    cx += g.advanceWidth * olcek + aralik;
  }
  return `<g fill="${ayar.renk}">${yollar}</g>`;
}

/** Kelimeleri verilen genişliğe sığacak satırlara böler. */
export function satirlar(s: string, maks: number, ayar: MetinAyar, maksSatir = Infinity) {
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

/** İşaret + "kifobu" logosu; (x, alt) logonun sol alt köşesi. Genişliği de döner. */
export function logo(x: number, alt: number, isaretBoyu: number, renk: string = KIMLIK.murekkep) {
  const yazi = isaretBoyu * 0.78;
  const bosluk = isaretBoyu * 0.24;
  const isaret = tohumIsaretiSvg({ boyut: isaretBoyu, kucuk: isaretBoyu < 64 }).replace('<svg ', `<svg x="${x.toFixed(1)}" y="${(alt - isaretBoyu).toFixed(1)}" `);
  const ayar: MetinAyar = { yuz: 'yari', boyut: yazi, renk, aralik: -yazi * 0.03 };
  const taban = alt - isaretBoyu / 2 + (yazi * 0.52) / 2;
  const svg = isaret + metin(SITE.name, x + isaretBoyu + bosluk, taban, ayar);
  return { svg, genislik: isaretBoyu + bosluk + genislik(SITE.name, ayar) };
}

// Haber kapağı: kart.ts (Kimlik v2). Kampanya haberinde künye, yatırım haberinde tur kapağı; rakam yoksa düz haber.
export function kapakSvg(h: Haber) {
  const d = h.data;
  return kartSvg(
    {
      baslik: d.title,
      kategori: d.category,
      girisim: d.girisim,
      platform: d.platform,
      toplanan: d.toplanan,
      hedef: d.hedef,
      yatirimci: d.yatirimci,
      durum: d.durum,
      paraBirimi: d.paraBirimi,
      tur: d.tur,
    },
    'kapak',
  );
}

/** Çizilen kapağın ekran okuyucu metni. */
export function kapakAlt(h: Haber) {
  return `${categoryName(h.data.category)}: ${h.data.title}`;
}

export const kapakUrl = (h: Haber) => `/kapak/${h.id}.png`;

// ── Yayıncı logosu (JSON-LD publisher.logo) ──
// Google haber yayıncı logosu: dikdörtgen, en az 600×60 PNG, beyaz zemin, yalnız logo (slogan yok).
export const LOGO_G = 600;
export const LOGO_Y = 60;
export function logoSvg() {
  const { svg } = logo(4, 56, 52);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_G}" height="${LOGO_Y}" viewBox="0 0 ${LOGO_G} ${LOGO_Y}"><rect width="${LOGO_G}" height="${LOGO_Y}" fill="#ffffff"/>${svg}</svg>`;
}
