// Haber kapakları: görsel, haberin kendi künyesinden çizilir (tidsrost'taki gibi dışarıdan fotoğraf alınmaz).
// Her fonksiyon 1200×675 (16:9) SVG döner; /kapak/[id].png uç noktası bunu sharp ile PNG'ye çevirir.
// Yazılar yazı tipinden doğrudan vektör yola çevrilir; böylece derleme makinesinde yazı tipi kurulu olması gerekmez.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { create, type Font } from 'fontkitten';
import { DURUMLAR, categoryName, dayNumber, formatDate, formatMoney, formatNumber, ilkYatirimci, paraSimgesi, percentOf, SITE, type Durum } from '../lib/site.ts';
import type { Haber } from '../lib/news';

export const KAPAK_G = 1200;
export const KAPAK_Y = 675;
const G = KAPAK_G;
const Y = KAPAK_Y;
const KENAR = 64;

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

type Yuz = 'tahta' | 'baslik' | 'baslikInce' | 'govde';
const DOSYA: Record<Yuz, string> = {
  tahta: 'SofiaSansExtraCondensed-ExtraBold.ttf',
  baslik: 'SofiaSansCondensed-ExtraBold.ttf',
  baslikInce: 'SofiaSansCondensed-Bold.ttf',
  govde: 'SofiaSans-SemiBold.ttf',
};

const fontlar = new Map<Yuz, Font>();
function font(yuz: Yuz): Font {
  let f = fontlar.get(yuz);
  if (!f) {
    // Derleme proje kökünden çalışır; paketlenmiş dosyanın yeri değiştiği için import.meta.url kullanılmaz.
    f = create(readFileSync(path.join(process.cwd(), 'src/kapak/fontlar', DOSYA[yuz]))) as Font;
    fontlar.set(yuz, f);
  }
  return f;
}

interface MetinAyar {
  yuz: Yuz;
  boyut: number;
  renk: string;
  hiza?: 'start' | 'end';
  aralik?: number; // harf aralığı, piksel
}

function genislik(s: string, { yuz, boyut, aralik = 0 }: MetinAyar) {
  const f = font(yuz);
  const glifler = f.glyphsForString(s);
  const olcek = boyut / f.unitsPerEm;
  return glifler.reduce((t, g) => t + g.advanceWidth * olcek, 0) + aralik * Math.max(0, glifler.length - 1);
}

/** Metni yazı tipinin glif yollarıyla çizer; (x, y) taban çizgisidir. */
function metin(s: string, x: number, y: number, ayar: MetinAyar) {
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
function satirlar(s: string, maks: number, ayar: MetinAyar, maksSatir: number) {
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

// Yazı tipinde ₺ yok; tahtadaki gibi elle çizilir. Yükseklik = büyük harf boyu.
function lira(x: number, taban: number, h: number, renk: string) {
  const s = h / 100;
  const k = 12;
  return `<g transform="translate(${x} ${taban - h}) scale(${s})" fill="none" stroke="${renk}" stroke-width="${k}" stroke-linecap="square" stroke-linejoin="miter">
<path d="M30 2V98H44C64 98 77 84 80 62"/><path d="M14 52L62 34M14 72L62 54"/></g>`;
}
const LIRA_EN = 0.98; // büyük harf boyuna oranla ₺ genişliği (boşluk dahil)

// Para birimi simgesi: ₺ elle çizilir, $ € £ yazı tipinden gelir. Genişliği simgeden sonraki boşluk dahildir.
function simgeEn(pb: string, ayar: MetinAyar) {
  return pb === 'TRY' ? ayar.boyut * 0.69 * LIRA_EN : genislik(paraSimgesi(pb), ayar) + ayar.boyut * 0.04;
}
function simge(pb: string, x: number, taban: number, ayar: MetinAyar) {
  return pb === 'TRY' ? lira(x, taban, ayar.boyut * 0.69, ayar.renk) : metin(paraSimgesi(pb), x, taban, { ...ayar, hiza: 'start' });
}

/** "₺5.000.000" gibi tutarı yazar. önEk: tutardan önceki metin (ör. "Hedef "). */
function tutarMetin(n: number, pb: string, x: number, y: number, ayar: MetinAyar, onEk = '') {
  const rakam = formatNumber(n);
  const toplam = genislik(onEk, ayar) + simgeEn(pb, ayar) + genislik(rakam, ayar);
  const bas = ayar.hiza === 'end' ? x - toplam : x;
  const sade = { ...ayar, hiza: 'start' as const };
  const xSimge = bas + genislik(onEk, ayar);
  return (onEk ? metin(onEk, bas, y, sade) : '') + simge(pb, xSimge, y, ayar) + metin(rakam, xSimge + simgeEn(pb, ayar), y, sade);
}

// Durum işaretleri: Isaret.astro'daki tebeşir çizgileriyle aynı yollar (24 birimlik kutu).
const ISARET_YOL: Record<string, string> = {
  basarili: 'M3.6 12.9c1.6 1.2 3.2 3 4.6 5.3.3.5 1 .5 1.2-.1C11.6 12.4 15.3 7.6 20.6 4.2',
  yeni: 'M12.6 4.1c-4.3-.4-8.3 2.6-8.5 7-.2 4.6 3.4 8.4 8 8.6 4.5.2 7.9-3.1 7.9-7.4 0-4.1-3.1-7.5-7.6-8.3-1.4-.2-2.6.1-3.5.6',
  suruyor: 'M3.5 12.4c4.6-.5 10.4-.6 16.2-.2M14.6 6.9c1.9 1.6 3.8 3.4 5.4 5.3-1.7 1.8-3.5 3.5-5.5 5.1',
  basarisiz: 'M3.2 13.1c5.6-1.4 11.6-2.2 17.6-2.4',
};
function isaret(durum: string, x: number, y: number, boyut: number, renk: string) {
  const d = ISARET_YOL[durum];
  if (!d) return '';
  return `<path transform="translate(${x} ${y}) scale(${boyut / 24})" d="${d}" fill="none" stroke="${renk}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const svg = (icerik: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}"><rect width="${G}" height="${Y}" fill="${R.tahta}"/>${icerik}<rect y="${Y - 10}" width="${G}" height="10" fill="${R.koyu}"/></svg>`;

function ustSatir() {
  return `${metin(SITE.name, KENAR, 100, { yuz: 'tahta', boyut: 64, renk: R.tebesir })}
<rect x="${KENAR}" y="128" width="${G - KENAR * 2}" height="2" fill="${R.cizgi}"/>`;
}

// ── Kampanya kartı: girişim, toplanan tutar ve hedefe göre ilerleme ─────
function kampanyaKarti(h: Haber) {
  const d = h.data;
  const toplanan = d.toplanan ?? 0;
  const pct = percentOf(toplanan, d.hedef);
  const basarisiz = d.durum === 'basarisiz';
  const vurgu = basarisiz ? R.pembe : R.sari;

  const girisim = metin(d.girisim!, KENAR, 222, { yuz: 'baslik', boyut: 66, renk: R.tebesir });
  // Kampanyada platform, yatırım turunda tur ve yatırımcılar yazılır; satıra sığmayan kısaltılır.
  const altAyar: MetinAyar = { yuz: 'baslikInce', boyut: 34, renk: R.mavi };
  const altSatir = satirlar([d.platform ?? d.tur, d.platform ? undefined : ilkYatirimci(d.yatirimcilar), formatDate(d.date)].filter(Boolean).join(' · '), G - KENAR * 2, altAyar, 1)[0];
  const platform = metin(altSatir, KENAR, 268, altAyar);

  // Anıtsal tutar: para simgesi + rakamlar; uzun tutarlar genişliğe sığacak kadar küçülür.
  const pb = d.paraBirimi;
  const rakam = formatNumber(toplanan);
  const sigdir = (b: number) => simgeEn(pb, { yuz: 'tahta', boyut: b, renk: '' }) + genislik(rakam, { yuz: 'tahta', boyut: b, renk: '' });
  const boy = Math.min(196, Math.floor((196 * (G - KENAR * 2)) / sigdir(196)));
  const capH = boy * 0.69;
  const taban = 458;
  const rakamRenk = basarisiz ? R.tebesir3 : R.tebesir;
  const tutarGen = sigdir(boy);
  const sAyar: MetinAyar = { yuz: 'tahta', boyut: boy, renk: vurgu };
  let tutar = simge(pb, KENAR, taban, sAyar) + metin(rakam, KENAR + simgeEn(pb, sAyar), taban, { yuz: 'tahta', boyut: boy, renk: rakamRenk });
  if (basarisiz) {
    tutar += `<rect x="${KENAR - 6}" y="${(taban - capH / 2 - 4).toFixed(0)}" width="${(tutarGen + 12).toFixed(0)}" height="9" fill="${R.pembe}"/>`;
  }

  // İlerleme rayı: hedef sabit bir çentiktir, yüzde 100'ü aşan kısım çentiğin ötesine taşar.
  let ray = '';
  if (pct !== undefined && d.hedef) {
    const x0 = KENAR;
    const en = G - KENAR * 2;
    const olcekPct = Math.max(100, pct);
    const xHedef = x0 + (en * 100) / olcekPct;
    const xDolu = x0 + (en * Math.min(pct, olcekPct)) / olcekPct;
    const ry = 532;
    ray = `<rect x="${x0}" y="${ry}" width="${en}" height="2" fill="${R.cizgi}"/>
<rect x="${x0}" y="${ry - 9}" width="${(xDolu - x0).toFixed(1)}" height="20" fill="${vurgu}"/>
<rect x="${(xHedef - 1).toFixed(1)}" y="${ry - 26}" width="3" height="54" fill="${R.tebesir}"/>
${tutarMetin(d.hedef, pb, xHedef - 12, ry + 60, { yuz: 'baslikInce', boyut: 28, renk: R.tebesir2, hiza: 'end' }, 'Hedef ')}
${metin(`%${pct}`, G - KENAR, ry - 30, { yuz: 'tahta', boyut: 64, renk: vurgu, hiza: 'end' })}`;
  }

  // Alt satır: durum işareti ve yatırımcı sayısı, sağ altta ise slogan.
  const parcalar = [d.durum ? DURUMLAR[d.durum as Durum] : d.platform ? undefined : d.tur ? `${d.tur} turu` : undefined, d.yatirimci !== undefined ? `${formatNumber(d.yatirimci)} yatırımcı` : undefined].filter(Boolean);
  const isaretRenk = d.durum === 'basarili' ? R.sari : basarisiz ? R.pembe : R.tebesir;
  const durum = parcalar.length
    ? `${d.durum ? isaret(d.durum, KENAR - 4, 596, 40, isaretRenk) : ''}${metin(parcalar.join(' · '), KENAR + (d.durum ? 48 : 0), 628, { yuz: 'govde', boyut: 28, renk: R.tebesir2 })}`
    : '';
  const slogan = metin(SITE.tagline, G - KENAR, 628, { yuz: 'baslikInce', boyut: 26, renk: R.sari, hiza: 'end' });

  return svg(`${ustSatir()}${girisim}${platform}${tutar}${ray}${durum}${slogan}`);
}

// ── Haber kartı: kategori ve başlık (künyesi olmayan haberler) ───────────
function haberKarti(h: Haber) {
  const d = h.data;
  const kategori = metin(categoryName(d.category).toLocaleUpperCase('tr-TR'), KENAR, 200, { yuz: 'baslikInce', boyut: 24, renk: R.sari, aralik: 3 });
  let boyut = 76;
  let ayar: MetinAyar = { yuz: 'baslik', boyut, renk: R.tebesir };
  let s = satirlar(d.title, G - KENAR * 2, ayar, 4);
  if (s.length > 3) {
    boyut = 62;
    ayar = { ...ayar, boyut };
    s = satirlar(d.title, G - KENAR * 2, ayar, 4);
  }
  // Başlık bloğu kategori ile alt çizgi arasında dikeyde ortalanır.
  const blok = (s.length - 1) * boyut * 1.04 + boyut * 0.72;
  const ilk = 236 + (560 - 236 - blok) / 2 + boyut * 0.72;
  const baslik = s.map((l, i) => metin(l, KENAR, Math.round(ilk + i * boyut * 1.04), ayar)).join('');
  const tarih = metin(formatDate(d.date), KENAR, 628, { yuz: 'govde', boyut: 28, renk: R.tebesir2 });
  const no = d.category === 'gunluk-bulten' ? dayNumber(d.date) : undefined;
  const sagAltMetin = no ? `Bülten ${formatNumber(no)} · ${SITE.tagline}` : SITE.tagline;
  const sagAlt = metin(sagAltMetin, G - KENAR, 628, { yuz: 'baslikInce', boyut: 26, renk: R.sari, hiza: 'end' });
  return svg(`${ustSatir()}${kategori}${baslik}<rect x="${KENAR}" y="576" width="${G - KENAR * 2}" height="2" fill="${R.cizgi}"/>${tarih}${sagAlt}`);
}

export function kapakSvg(h: Haber) {
  const d = h.data;
  // Sadece hedefi ve platformu olan kitlesel fonlama kampanyaları tahta/kampanya kartı olarak çizilir.
  // VC/melek yatırım turları ve genel haberler, başlığın okunduğu şık haber kartı olarak çizilir.
  return d.girisim && d.toplanan !== undefined && d.hedef && d.platform ? kampanyaKarti(h) : haberKarti(h);
}

/** Çizilen kapağın ekran okuyucu metni. */
export function kapakAlt(h: Haber) {
  const d = h.data;
  if (d.girisim && d.toplanan !== undefined && d.hedef && d.platform) {
    const pct = percentOf(d.toplanan, d.hedef);
    return `Kampanya kartı: ${d.girisim}, ${d.platform}, ${formatMoney(d.toplanan, d.paraBirimi)} toplandı${pct !== undefined ? `, hedefin yüzde ${pct}'i` : ''}.`;
  }
  return `${categoryName(d.category)}: ${d.title}`;
}

export const kapakUrl = (h: Haber) => `/kapak/${h.id}.png`;

// ── Yayıncı logosu (JSON-LD publisher.logo): sitenin üst bandındaki yazı logosunun aynısı ──
// Google haber yayıncı logosu için dikdörtgen, en az 600×60 PNG ister. Marka işareti (ayçiçeği) yalnız favicon'da
// kullanıldığı için (DESIGN.md) logo "kifobu | Ulaşılabilir ve anlaşılır veri" yazı dizilişinden çizilir.
export const LOGO_G = 600;
export const LOGO_Y = 60;
export function logoSvg() {
  const kenar = 12;
  const taban = 45;
  const isim: MetinAyar = { yuz: 'baslik', boyut: 50, renk: R.tebesir };
  const ayrac: MetinAyar = { yuz: 'baslikInce', boyut: 36, renk: R.tebesir3 };
  const alt: MetinAyar = { yuz: 'baslikInce', boyut: 26, renk: R.sari };
  const x1 = kenar + genislik(SITE.name, isim) + 12;
  const x2 = x1 + genislik('|', ayrac) + 12;
  // Slogan sığmazsa küçültülür.
  const kalan = LOGO_G - kenar - x2;
  const sAyar = { ...alt, boyut: Math.min(alt.boyut, Math.floor((alt.boyut * kalan) / genislik(SITE.tagline, alt))) };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_G}" height="${LOGO_Y}" viewBox="0 0 ${LOGO_G} ${LOGO_Y}"><rect width="${LOGO_G}" height="${LOGO_Y}" fill="${R.tahta}"/>${metin(SITE.name, kenar, taban, isim)}${metin('|', x1, taban - 2, ayrac)}${metin(SITE.tagline, x2, taban - 2, sAyar)}</svg>`;
}
