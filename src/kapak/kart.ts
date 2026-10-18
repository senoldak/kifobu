// Haber kartları (sahibin kararı, 2026-10-18): tidsrøst'ün kapak iskeleti ve yazı boyutları, kifobu'nun bölüme göre
// tahta renkleri. Başlık alt kenara yaslı, altında bölümün tebeşir renginde kısa çizgi ve logo; arkada soldan
// görünmez başlayıp sağa doğru belirginleşen nokta ızgarası. Tutar ayrıca yazılmaz; bültende tarih ikinci satırdır.
// 18:00 kapanış bülteninin görselleri (scripts/bulten-gorsel-*) bu dosyayı kullanmaz.
// Üç biçim: site kapağı 1200×675 (yayında), post 1080×1350 ve story 1080×1920 (yalnız tasarım; yayına bağlı değil).
import { font, genislik, type MetinAyar } from './ciz.ts';

const BEYAZ = '#ecefe9';

/** Bölüm → tahta rengi ve tebeşir (vurgu) rengi. Bilinmeyen bölüm sitenin kurşuni tahtasını alır. */
export const TAHTALAR: Record<string, { tahta: string; tebesir: string }> = {
  // Orta tonlar (sahip: koyular fazla ağır); beyaz başlıkla kontrast 5,5–8,7:1, vurguyla en az 4,5:1.
  'gunluk-bulten': { tahta: '#34453f', tebesir: '#f2d45c' },
  kampanyalar: { tahta: '#2e6a4c', tebesir: '#f7e08a' },
  platformlar: { tahta: '#2d5a88', tebesir: '#a9d6ec' },
  yatirimlar: { tahta: '#1f6577', tebesir: '#a8ecc0' },
  girisimler: { tahta: '#8a3a4b', tebesir: '#ffc79a' },
  mevzuat: { tahta: '#73553a', tebesir: '#f1e2b4' },
  analiz: { tahta: '#574887', tebesir: '#d6c3fa' },
};
export const tahtaRengi = (kategori: string) => TAHTALAR[kategori] ?? TAHTALAR['gunluk-bulten'];

export type Bicim = 'kapak' | 'post' | 'story';
// tidsrøst fjord.mjs BICIM ile aynı ölçüler.
export const OLCU: Record<Bicim, { g: number; y: number; pad: number; ust: number; alt: number; punto: [number, number, number]; kick: number; logo: number; bosluk: number; not?: string }> = {
  kapak: { g: 1200, y: 675, pad: 64, ust: 48, alt: 627, punto: [92, 80, 68], kick: 32, logo: 34, bosluk: 36 },
  post: { g: 1080, y: 1350, pad: 80, ust: 120, alt: 1270, punto: [128, 112, 96], kick: 40, logo: 46, bosluk: 64 },
  // Story'de üst ~270, alt ~340 px Instagram arayüzünün altında kalır.
  story: { g: 1080, y: 1920, pad: 80, ust: 310, alt: 1580, punto: [136, 120, 104], kick: 44, logo: 48, bosluk: 64, not: "Haberin tamamı kifobu.com'da" },
};

/** Başlığı parçalara ayırır: "X: …" → üst etiket; bültende " — " sonrası (tarih) ayrı satır. */
export function bol(baslik: string, kategori: string) {
  let ana = baslik.trim();
  let kicker: string | null = null;
  let tarih: string | null = null;
  const k = ana.match(/^([^:]{2,32}):\s+(.+)$/);
  if (k) {
    kicker = k[1];
    ana = k[2][0].toLocaleUpperCase('tr-TR') + k[2].slice(1);
  }
  if (kategori === 'gunluk-bulten') {
    const p = ana.split(/\s+[—–]\s+/);
    if (p.length > 1) {
      ana = p[0];
      tarih = p.slice(1).join(' — ');
    }
  }
  return { kicker, ana, tarih };
}

// Dar kesimde boşluk ince kalır; kelime arasına yazı boyunun %6'sı kadar ek boşluk (tidsrøst'teki kıl boşluğu).
const ekBosluk = (boyut: number) => boyut * 0.06;
function en(s: string, a: MetinAyar) {
  return genislik(s, a) + (s.split(' ').length - 1) * (a.yuz === 'kapakDar' ? ekBosluk(a.boyut) : 0);
}
function yaz(s: string, x: number, taban: number, a: MetinAyar) {
  const f = font(a.yuz);
  const olcek = a.boyut / f.unitsPerEm;
  const harf = a.aralik ?? 0;
  let cx = a.hiza === 'end' ? x - en(s, a) : x;
  let yollar = '';
  const bosluk = f.glyphForCodePoint(32)?.id;
  for (const g of f.glyphsForString(s)) {
    const d = g.path.toSVG();
    if (d) yollar += `<path transform="translate(${cx.toFixed(1)} ${taban.toFixed(1)}) scale(${olcek} ${-olcek})" d="${d}"/>`;
    cx += g.advanceWidth * olcek + harf + (g.id === bosluk && a.yuz === 'kapakDar' ? ekBosluk(a.boyut) : 0);
  }
  return `<g fill="${a.renk}">${yollar}</g>`;
}
function sar(s: string, maks: number, a: MetinAyar) {
  const out: string[] = [];
  let satir = '';
  for (const kelime of s.split(/\s+/)) {
    const aday = satir ? `${satir} ${kelime}` : kelime;
    if (satir && en(aday, a) > maks) {
      out.push(satir);
      satir = kelime;
    } else satir = aday;
  }
  if (satir) out.push(satir);
  return out;
}

// Zemin renginin biraz açığı.
function acik(hex: string, oran: number) {
  const n = parseInt(hex.slice(1), 16);
  const k = (c: number) => Math.round(c + (255 - c) * oran);
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
}
// Nokta ızgarası: kartın tamamında, yazının arkasında; solda görünmez, sağa doğru belirginleşir.
function izgara(g: number, y: number, tahta: string) {
  const ara = 30;
  let o = '';
  for (let x = ara / 2; x < g; x += ara) {
    const f = Math.pow(x / g, 1.6);
    if (f < 0.04) continue;
    const renk = acik(tahta, 0.05 + 0.17 * f);
    for (let yy = ara / 2; yy < y; yy += ara) o += `<circle cx="${x}" cy="${yy}" r="2.4" fill="${renk}"/>`;
  }
  return o;
}

const satirAdim = (boyut: number) => boyut * 1.04;
const capH = (boyut: number) => boyut * 0.74;

/** Haber kartı (SVG). */
export function kartSvg({ baslik, kategori }: { baslik: string; kategori: string }, bicim: Bicim = 'kapak') {
  const o = OLCU[bicim];
  const renk = tahtaRengi(kategori);
  const ic = o.g - 2 * o.pad;
  const { kicker, ana, tarih } = bol(baslik, kategori);

  // Alt bant: tebeşir renginde kısa çizgi + logo (story'de sağda yönlendirme).
  const logoAyar: MetinAyar = { yuz: 'kapak', boyut: o.logo, renk: BEYAZ };
  const logoTaban = o.alt - o.logo * 0.06;
  const logoUst = o.alt - capH(o.logo) - o.logo * 0.06;
  let svg = `<rect x="${o.pad}" y="${(logoUst - 26).toFixed(0)}" width="72" height="7" fill="${renk.tebesir}"/>`;
  svg += yaz('kifobu', o.pad, logoTaban, logoAyar);
  if (o.not) svg += yaz(o.not, o.g - o.pad, logoTaban, { yuz: 'kapak', boyut: 38, renk: acik(renk.tahta, 0.75), hiza: 'end' });
  const metinAlt = logoUst - 26 - o.bosluk;

  // Başlık: uzunluğa göre 92/80/68 (kapak); sığmazsa 6'şar küçülür.
  let boyut = ana.length > 70 ? o.punto[2] : ana.length > 45 ? o.punto[1] : o.punto[0];
  const kickAyar: MetinAyar = { yuz: 'kapak', boyut: o.kick, renk: renk.tahta };
  let satir: string[];
  let yuk: number;
  for (;;) {
    const a: MetinAyar = { yuz: 'kapakDar', boyut, renk: BEYAZ };
    satir = sar(ana, ic, a);
    if (tarih) satir.push(tarih);
    yuk = (kicker ? capH(o.kick) + o.kick * 0.36 + 40 : 0) + (satir.length - 1) * satirAdim(boyut) + capH(boyut);
    if (metinAlt - yuk >= o.ust || boyut <= o.punto[2] * 0.8) break;
    boyut -= 6;
  }
  let y = metinAlt - yuk;
  if (kicker) {
    const k = kicker.toLocaleUpperCase('tr-TR');
    const px = o.kick * 0.32;
    const py = o.kick * 0.18;
    svg += `<rect x="${o.pad}" y="${(y - py).toFixed(1)}" width="${(en(k, kickAyar) + 2 * px).toFixed(1)}" height="${(capH(o.kick) + 2 * py).toFixed(1)}" fill="${renk.tebesir}"/>`;
    svg += yaz(k, o.pad + px, y + capH(o.kick), kickAyar);
    y += capH(o.kick) + o.kick * 0.36 + 40;
  }
  satir.forEach((l, i) => {
    const tarihSatiri = tarih !== null && i === satir.length - 1;
    svg += yaz(l, o.pad, y + capH(boyut) + i * satirAdim(boyut), { yuz: 'kapakDar', boyut, renk: tarihSatiri ? renk.tebesir : BEYAZ });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.g}" height="${o.y}" viewBox="0 0 ${o.g} ${o.y}"><rect width="${o.g}" height="${o.y}" fill="${renk.tahta}"/>${izgara(o.g, o.y, renk.tahta)}${svg}</svg>`;
}
