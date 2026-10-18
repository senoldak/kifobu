// Haber kartları, "Seans · Künye" (sahibin kararı, 2026-10-18, V2): kifobu'nun kendi dünyası, tidsrøst kalitesinin
// ilkeleriyle. Bölüme göre derin ve eşit koyulukta tahta tonu; arkada seans tahtasının çok soluk satır ve sütun
// çizgileri; Sofia Sans Condensed başlık alt kenara yaslı; altta sitenin künye bandı: bölümün tebeşir renginde 2px
// çizgi, solda "kifobu", sağda bölüm adı; bültende sağda bültenin tarihi (başlıkta yalnız "Gece Bülteni" kalır,
// bülten numarası yazılmaz). Üst etiket yok, tutar ayrıca yazılmaz. 18:00 kapanış bülteninin görselleri (scripts/bulten-gorsel-*) bu dosyayı kullanmaz.
// Üç biçim: site kapağı 1200×675 (yayında), post 1080×1350 ve story 1080×1920 (yalnız tasarım; yayına bağlı değil).
import { font, genislik, type MetinAyar } from './ciz.ts';
import { categoryName } from '../lib/site.ts';

const TEBESIR = '#ecefe9';

/** Bölüm → derin tahta tonu ve tebeşir (künye) rengi. Bilinmeyen bölüm sitenin kurşuni tahtasını alır. */
export const TAHTALAR: Record<string, { tahta: string; tebesir: string }> = {
  'gunluk-bulten': { tahta: '#1d2723', tebesir: '#f2d45c' },
  kampanyalar: { tahta: '#1a2e24', tebesir: '#f2d45c' },
  platformlar: { tahta: '#1a2533', tebesir: '#8fc7e0' },
  yatirimlar: { tahta: '#152b30', tebesir: '#9fe3b0' },
  girisimler: { tahta: '#2d1f24', tebesir: '#f6b37a' },
  mevzuat: { tahta: '#29241c', tebesir: '#e9d8a6' },
  analiz: { tahta: '#232136', tebesir: '#c7aef2' },
};
export const tahtaRengi = (kategori: string) => TAHTALAR[kategori] ?? TAHTALAR['gunluk-bulten'];

export type Bicim = 'kapak' | 'post' | 'story';
interface Olcu {
  g: number; y: number; pad: number;
  ust: number; // başlığın en üst sınırı
  bant: number; // künye bandının üst çizgisi
  bantY: number; // bandın yüksekliği
  punto: [number, number, number]; // kısa / orta / uzun başlık
  logo: number; etiket: number; satir: number; // satır çizgisi aralığı
}
// Sofia Sans'ın küçük harf boyu Archivo'dan kısa: tidsrøst'ün 92/80/68'inin görsel karşılığı 100/88/76.
export const OLCU: Record<Bicim, Olcu> = {
  kapak: { g: 1200, y: 675, pad: 72, ust: 64, bant: 567, bantY: 108, punto: [100, 88, 76], logo: 54, etiket: 32, satir: 54 },
  post: { g: 1080, y: 1350, pad: 80, ust: 110, bant: 1200, bantY: 150, punto: [136, 120, 104], logo: 72, etiket: 40, satir: 60 },
  // Story'de üst ~270, alt ~340 px Instagram arayüzünün altında kalır; band güvenli alanın içinde biter.
  story: { g: 1080, y: 1920, pad: 80, ust: 310, bant: 1440, bantY: 140, punto: [144, 128, 112], logo: 72, etiket: 40, satir: 60 },
};

const CAP = 0.655; // Sofia Sans büyük harf boyu (em)
const BASLIK_ADIM = 1.0; // satır adımı (em)

/** Başlık; bültende " — " sonrası (tarih) künye bandına gider. */
export function bol(baslik: string, kategori: string) {
  const ana = baslik.trim();
  if (kategori === 'gunluk-bulten') {
    const p = ana.split(/\s+[—–]\s+/);
    if (p.length > 1) return { ana: p[0], tarih: p.slice(1).join(' — ') };
  }
  return { ana, tarih: null as string | null };
}

function yaz(s: string, x: number, taban: number, a: MetinAyar) {
  const f = font(a.yuz);
  const olcek = a.boyut / f.unitsPerEm;
  const harf = a.aralik ?? 0;
  let cx = a.hiza === 'end' ? x - genislik(s, a) : x;
  let yollar = '';
  for (const g of f.glyphsForString(s)) {
    const d = g.path.toSVG();
    if (d) yollar += `<path transform="translate(${cx.toFixed(1)} ${taban.toFixed(1)}) scale(${olcek} ${-olcek})" d="${d}"/>`;
    cx += g.advanceWidth * olcek + harf;
  }
  return `<g fill="${a.renk}">${yollar}</g>`;
}
function sar(s: string, maks: number, a: MetinAyar) {
  const out: string[] = [];
  let satir = '';
  for (const kelime of s.split(/\s+/)) {
    const aday = satir ? `${satir} ${kelime}` : kelime;
    if (satir && genislik(aday, a) > maks) {
      out.push(satir);
      satir = kelime;
    } else satir = aday;
  }
  if (satir) out.push(satir);
  return out;
}

/** Künye bandının sağ ucu: bölüm adı; bültende bültenin tarihi (bülten numarası yazılmaz). */
export function kunyeEtiketi(kategori: string, bultenTarihi: string | null) {
  return (bultenTarihi ?? categoryName(kategori)).toLocaleUpperCase('tr-TR');
}

/** Haber kartı (SVG). */
export function kartSvg({ baslik, kategori }: { baslik: string; kategori: string }, bicim: Bicim = 'kapak') {
  const o = OLCU[bicim];
  const renk = tahtaRengi(kategori);
  const { ana, tarih: bultenTarihi } = bol(baslik, kategori);
  let svg = `<rect width="${o.g}" height="${o.y}" fill="${renk.tahta}"/>`;

  // Seans tahtasının çizgili düzeni: satır kılları (%8) ve iki sütun çizgisi (%7); bandın üstünde biter.
  for (let y = o.satir; y < o.bant - 10; y += o.satir) svg += `<rect x="0" y="${y}" width="${o.g}" height="1" fill="${TEBESIR}" fill-opacity="0.08"/>`;
  for (const x of [o.g * 0.62, o.g * 0.81]) svg += `<rect x="${(x - 1).toFixed(0)}" y="0" width="2" height="${o.bant}" fill="${TEBESIR}" fill-opacity="0.07"/>`;

  // Künye bandı: bölümün tebeşir renginde 2px çizgi; solda logo, sağda bölüm ya da bülten sayacı.
  svg += `<rect x="0" y="${o.bant}" width="${o.g}" height="2" fill="${renk.tebesir}" fill-opacity="0.9"/>`;
  const bandOrta = o.bant + 2 + o.bantY / 2;
  svg += yaz('kifobu', o.pad, bandOrta + (o.logo * CAP) / 2, { yuz: 'tahta', boyut: o.logo, renk: TEBESIR });
  const sag = bicim === 'story' && !bultenTarihi ? 'KIFOBU.COM' : kunyeEtiketi(kategori, bultenTarihi);
  svg += yaz(sag, o.g - o.pad, bandOrta + (o.etiket * CAP) / 2, { yuz: 'baslik', boyut: o.etiket, renk: renk.tebesir, aralik: o.etiket * 0.1, hiza: 'end' });
  if (bicim === 'kapak') svg += `<rect x="0" y="${o.y - 6}" width="${o.g}" height="6" fill="#000" fill-opacity="0.22"/>`;

  // Başlık: son satırın tabanı bandın 56 px (ölçekli) üstünde; sığmazsa 6'şar küçülür.
  const sonTaban = o.bant - Math.round(o.punto[0] * 0.56);
  let boyut = ana.length > 70 ? o.punto[2] : ana.length > 45 ? o.punto[1] : o.punto[0];
  let satir: string[];
  for (;;) {
    const a: MetinAyar = { yuz: 'baslik', boyut, renk: TEBESIR, aralik: -boyut * 0.01 };
    satir = sar(ana, o.g - 2 * o.pad - 60, a);
    const ilkTaban = sonTaban - (satir.length - 1) * boyut * BASLIK_ADIM;
    if (ilkTaban - boyut * CAP >= o.ust || boyut <= o.punto[2] * 0.75) break;
    boyut -= 6;
  }
  satir.forEach((l, i) => {
    const taban = sonTaban - (satir.length - 1 - i) * boyut * BASLIK_ADIM;
    svg += yaz(l, o.pad - 2, taban, { yuz: 'baslik', boyut, renk: TEBESIR, aralik: -boyut * 0.01 });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.g}" height="${o.y}" viewBox="0 0 ${o.g} ${o.y}">${svg}</svg>`;
}
