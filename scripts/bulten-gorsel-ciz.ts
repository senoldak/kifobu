import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create, type Font } from 'fontkitten';
import { BULTEN, type Girisim, type Platform, type Yakinda } from '../src/data/bulten.ts';
import { KIMLIK, kapandiMi, tohumIsaretiSvg, yuzdeSonda } from '../src/lib/kimlik.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ── SCHIBSTED GROTESK (Kimlik v2, BRAND.md; değişken yazı tipi) ───────────────
type Agirlik = 'normal' | 'orta' | 'kalin' | 'ekstra';
const AGIRLIK_DEGER: Record<Agirlik, number> = {
  normal: 400,
  orta: 600,
  kalin: 700,
  ekstra: 800,
};

let anaFont: Font | null = null;
const fontOnbellegi = new Map<Agirlik, Font>();

function font(agirlik: Agirlik = 'orta'): Font {
  let f = fontOnbellegi.get(agirlik);
  if (!f) {
    if (!anaFont) {
      anaFont = create(fs.readFileSync(path.join(rootDir, 'src/kapak/fontlar/SchibstedGrotesk[wght].ttf'))) as Font;
    }
    f = anaFont.getVariation({ wght: AGIRLIK_DEGER[agirlik] });
    fontOnbellegi.set(agirlik, f);
  }
  return f;
}

interface MetinAyar {
  agirlik?: Agirlik;
  boyut?: number;
  renk?: string;
  hiza?: 'start' | 'end' | 'center';
  aralik?: number;
}

function genislik(s: string, ayar: MetinAyar = {}) {
  const agirlik = ayar.agirlik ?? 'orta';
  const boyut = ayar.boyut ?? 19;
  const aralik = ayar.aralik ?? 0;
  const f = font(agirlik);
  const glifler = f.glyphsForString(s);
  const olcek = boyut / f.unitsPerEm;
  return glifler.reduce((t, g) => t + g.advanceWidth * olcek, 0) + aralik * Math.max(0, glifler.length - 1);
}

function metin(s: string, x: number, y: number, ayar: MetinAyar = {}) {
  const agirlik = ayar.agirlik ?? 'orta';
  const boyut = ayar.boyut ?? 19;
  const renk = ayar.renk ?? '#09090b';
  const aralik = ayar.aralik ?? 0;
  const f = font(agirlik);
  const olcek = boyut / f.unitsPerEm;
  const toplamGen = genislik(s, ayar);
  
  let cx = x;
  if (ayar.hiza === 'end') cx = x - toplamGen;
  else if (ayar.hiza === 'center') cx = x - toplamGen / 2;

  let yollar = '';
  for (const g of f.glyphsForString(s)) {
    const d = g.path.toSVG();
    if (d) yollar += `<path transform="translate(${cx.toFixed(1)} ${y}) scale(${olcek} ${-olcek})" d="${d}"/>`;
    cx += g.advanceWidth * olcek + aralik;
  }
  return `<g fill="${renk}">${yollar}</g>`;
}

function paraMetin(tutar: number, x: number, y: number, ayar: MetinAyar = {}) {
  const str = '₺' + tutar.toLocaleString('tr-TR');
  return metin(str, x, y, ayar);
}

export type GorselModu = 'post' | 'story';

// ── DİKEY ARALIK ÖLÇEĞİ ─────────────────────────────────────────────────────
// Görseldeki bütün dikey boşluklar bu tablodan gelir; çizim kodunda boşluk sayısı yazılmaz.
// Taban birim post 8, story 10 px; iki biçimde de katsayılar aynıdır:
// üst 3, başlık altı 2, bölüm 4, kart/şerit/kutu/iç 1,5, alt 4 birim.
// ust: üst bilgi → ilk bölüm başlığı; baslikAlti: sarı çizgi → bölüm içeriği; bolum: bölüm sonu → sonraki başlık;
// kart: kampanya kartları arası; serit: kart/şerit → şerit; kutu: kutu satırları arası;
// ic: platform bölümünde sayaç → dağılım çubuğu → platform kartları; alt: MKK kutusu → alt bant.
export const ARALIK = {
  post: { birim: 8, ust: 24, baslikAlti: 16, bolum: 32, kart: 12, serit: 12, kutu: 12, ic: 12, alt: 32 },
  story: { birim: 10, ust: 30, baslikAlti: 20, bolum: 40, kart: 15, serit: 15, kutu: 15, ic: 15, alt: 40 },
} as const;
// Gün çok doluysa boşluklar ortak bir katsayıyla en çok bu orana kadar kısılır (ritim korunur).
export const ARALIK_EN_AZ_OLCEK = 0.75;

// Kutu yükseklikleri ve sabit ölçüler (px). Kampanya kartı yalnız [kartMin, kartMax] arasında esner.
export const OLCU = {
  post: {
    basAlt: 146, altBantH: 52, kartMin: 86, kartMax: 118, seritH: 76, kutuH: 70, platKartH: 88,
    cubukH: 18, ilerlemeH: 7, mkkH: 64, kuralAlti: 10, kutuSutunEnCok: 6, yatayAralik: 12, kutuIcPay: 10,
  },
  story: {
    basAlt: 284, altBantH: 96, kartMin: 120, kartMax: 160, seritH: 96, kutuH: 80, platKartH: 116,
    cubukH: 22, ilerlemeH: 8, mkkH: 76, kuralAlti: 12, kutuSutunEnCok: 4, yatayAralik: 14, kutuIcPay: 14,
  },
} as const;

// Yazı boyutları: her biçimde ad (girişim/platform adı, yüzde, öne çıkan tutar), etiket ve değer için tek boyut.
// *Satir = iki/üç satırlı kutularda taban çizgileri arası mesafe.
const TIPO = {
  post: { baslik: 19, ad: 19, etiket: 19, deger: 19, kutuSatir: 26, seritSatir: 30, platSatir: 26, sayacSatir: 30, enAzAd: 15 },
  story: { baslik: 24, ad: 24, etiket: 19, deger: 19, kutuSatir: 30, seritSatir: 38, platSatir: 32, sayacSatir: 36, enAzAd: 19 },
} as const;

// Schibsted Grotesk ölçüleri (em oranı): büyük harf yüksekliği, alt uzantı (g, p, ş), İ noktasının tepesi.
const BUYUK_HARF = 0.703;
const ALT_UZANTI = 0.21;
const NOKTA_TEPE = 0.96;

// İlerleme çubuğu renkleri
const cubukRengi = (y: number) => {
  if (y >= 100) return '#10b981'; // Canlı Zümrüt Yeşili
  if (y >= 50) return '#0284c7';  // Kurumsal Okyanus Mavisi
  return '#6366f1';               // İndigo
};

// SVG'ye yazılan konumlar: bir ondalık.
const yaz = (v: number) => String(Math.round(v * 10) / 10);

export function bultenSvgCiz(mod: GorselModu = 'post', veri: typeof BULTEN = BULTEN): string {
  const w = 1080;
  const h = mod === 'story' ? 1920 : 1350;
  const paddingX = 56;
  const icGenislik = w - paddingX * 2; // 968 px
  const A = ARALIK[mod];
  const O = OLCU[mod];
  const T = TIPO[mod];
  const buyuk = (boyut: number) => boyut * BUYUK_HARF;
  const inis = (boyut: number) => boyut * ALT_UZANTI;

  const b = {
    ...veri,
    // KURAL: Eğer bir girişim aktif girişimler satırında fonlamadaysa, ön talep / yakında alanından otomatik çıkarılır
    yakinda: veri.yakinda.filter(
      (y) => !veri.girisimler.some((g) => g.ad.trim().toLowerCase() === y.ad.trim().toLowerCase())
    ),
  };
  const platformToplami = b.platformlar.liste.reduce((s, p) => s + p.toplam, 0) || 1;

  const footerH = O.altBantH;
  const footerY = h - footerH;

  // Ön talebi rakamlı olanlar (hedef ve/veya ön talep tutarı) kampanya kartlarının altında tam genişlik şerit olarak çizilir;
  // rakamsızlar "ön talep & yakında" kutularında kalır. Aynı kampanya hem şerit hem kutu olmaz.
  const seritler = b.yakinda.filter((y) => y.onTalep || y.hedef);
  const kutular = b.yakinda.filter((y) => !(y.onTalep || y.hedef));
  // Kartlar önce açık kampanyalar, sonra bitenler (her grup kendi sırasıyla).
  const aciklar = b.girisimler.filter((g) => !kapandiMi(g.durum));
  const bitenler = b.girisimler.filter((g) => kapandiMi(g.durum));
  const nKutu = kutular.length;

  // ── KUTU IZGARASI: en az satır, satırlara eşit dağılım ─────────────────
  // Sütun sayısı (post en çok 6, story 4), en uzun ad ve platform tam boyutta sığacak kadar olur; sığmazsa satır eklenir.
  const kutuGerekenW = kutular.reduce(
    (m, y) => Math.max(m, genislik(y.ad, { agirlik: 'kalin', boyut: T.ad }), genislik(y.platform, { agirlik: 'orta', boyut: T.etiket })),
    0,
  ) + O.kutuIcPay * 2;
  const kutuW = (sutun: number) => (icGenislik - (sutun - 1) * O.yatayAralik) / sutun;
  let kutuSutun = Math.max(1, Math.min(nKutu, O.kutuSutunEnCok));
  while (kutuSutun > 1 && kutuW(kutuSutun) < kutuGerekenW) kutuSutun--;
  const kutuSatirTam = nKutu ? Math.ceil(nKutu / kutuSutun) : 0;
  if (kutuSatirTam) kutuSutun = Math.ceil(nKutu / kutuSatirTam); // 7 kutu → 4 + 3, 5 + 2 değil

  // ── SABİT YÜKSEKLİKLER ─────────────────────────────────────────────────
  const paddingTop = mod === 'story' ? 190 : 54; // üst bilginin en az üst payı (story: Instagram üst katmanı)
  const ustBilgiH = O.basAlt - paddingTop; // başlık, tarih ve logo
  const baslikTaban = Math.round(T.baslik * NOKTA_TEPE); // başlık bloğunun tepesi (İ noktası) → taban çizgisi
  const baslikH = baslikTaban + O.kuralAlti + 2; // sarı çizginin alt kenarına kadar
  const sayacH = Math.round(buyuk(T.etiket) + T.sayacSatir + inis(T.ad));
  const tasmaSatirH = Math.round(buyuk(T.etiket) + inis(T.etiket)); // "+N ön talep daha" satırı
  const butce = footerY - paddingTop - ustBilgiH;

  // ── SIĞDIRMA ADAYLARI (öncelik sırası) ─────────────────────────────────
  // Yer yetmezse en düşük öncelikten başlayarak eksiltilir: önce yakında kutuları (en az bir satır kalır,
  // sığmayanların yerine "+N kampanya" kutusu), sonra biten kampanyalar (sondan), sonra ikiden fazla şerit,
  // en son kalan şeritler ("+N ön talep daha" satırı). Açık kampanyalar hiçbir zaman düşmez.
  interface Aday { biten: number; serit: number; kutuSatir: number }
  const adaylar: Aday[] = [];
  const aday: Aday = { biten: bitenler.length, serit: seritler.length, kutuSatir: kutuSatirTam };
  adaylar.push({ ...aday });
  while (aday.kutuSatir > 1) { aday.kutuSatir--; adaylar.push({ ...aday }); }
  while (aday.biten > 0) { aday.biten--; adaylar.push({ ...aday }); }
  if (aday.serit > 2) { aday.serit = 2; adaylar.push({ ...aday }); }
  while (aday.serit > 0) { aday.serit--; adaylar.push({ ...aday }); }

  const olc = (a: Aday) => {
    const nGirisim = aciklar.length + a.biten;
    // Hiç şerit kalmazsa ve "+N" kutusu zaten varsa, gizlenen şeritler o kutuda sayılır (ayrı satır açılmaz).
    const tasma = a.serit < seritler.length && !(a.serit === 0 && a.kutuSatir < kutuSatirTam);
    const bolumSayisi = a.kutuSatir ? 4 : 3;
    const sabitH =
      bolumSayisi * baslikH + a.serit * O.seritH + (tasma ? tasmaSatirH : 0) + sayacH + O.cubukH + O.platKartH +
      a.kutuSatir * O.kutuH + O.mkkH;
    // Kartlardan sonraki şerit ve taşma satırı, kart aralığıyla ayrılır.
    const seritOgesi = a.serit + (tasma ? 1 : 0);
    const boslukH =
      A.ust + A.alt + (bolumSayisi - 1) * A.bolum + bolumSayisi * A.baslikAlti +
      Math.max(0, nGirisim - 1) * A.kart + (nGirisim ? seritOgesi : Math.max(0, seritOgesi - 1)) * A.serit +
      2 * A.ic + Math.max(0, a.kutuSatir - 1) * A.kutu;
    return { nGirisim, sabitH, boslukH, toplam: (kartH: number, olcek: number) => sabitH + nGirisim * kartH + boslukH * olcek };
  };

  // İlk sığan aday seçilir (kart en kısa, boşluk 0,75 iken). Hiçbiri sığmazsa son aday (yalnız açık kampanyalar
  // + bir kutu satırı) ve gerekirse 0,75'in altına inen boşluk ölçeği: bu, gündelik düzende beklenmeyen bir uç durumdur.
  let secilen = adaylar[adaylar.length - 1];
  for (const a of adaylar) {
    if (olc(a).toplam(O.kartMin, ARALIK_EN_AZ_OLCEK) <= butce) { secilen = a; break; }
  }
  const { nGirisim, sabitH, boslukH, toplam } = olc(secilen);
  const girisimler = [...aciklar, ...bitenler.slice(0, secilen.biten)];
  const gosterilenSerit = seritler.slice(0, secilen.serit);
  const gizliSerit = seritler.length - secilen.serit;
  const kutuSatir = secilen.kutuSatir;
  const kutuKirpik = kutuSatir < kutuSatirTam;
  const gosterilenKutu = kutuKirpik ? kutular.slice(0, kutuSatir * kutuSutun - 1) : kutular;
  const gizliKutu = nKutu - gosterilenKutu.length;
  const seritKutuda = gizliSerit > 0 && secilen.serit === 0 && kutuKirpik; // şerit sayısı "+N" kutusuna katılır
  const artiSayisi = gizliKutu + (seritKutuda ? gizliSerit : 0);
  const gizlenen = gizliKutu + (bitenler.length - secilen.biten) + gizliSerit;

  // ── YERLEŞTİRME (belirlenimci) ──────────────────────────────────────────
  // 0) kart en yüksekte (kartMax) sığıyorsa artan yer, üst bilgi + içerik tek blok sayılarak
  //    blokun üstüne ve altına eşit dağılır (bölümlerin arasına hiç girmez);
  // 1) sığmıyorsa kart yüksekliği kartMin'e doğru iner;
  // 2) yine sığmıyorsa bütün boşluklar ortak katsayıyla kısılır (en az 0,75);
  // 3) yine sığmıyorsa yukarıdaki öncelik sırasıyla öğe eksiltilir (genişlik ve ritim aynen kalır).
  // Kutu ızgarası zaten en geniş sığan sütunla kurulur; ayrı bir "sütun artır" adımına gerek kalmaz.
  let kartH: number = O.kartMax;
  let olcek = 1;
  let sikistirma = gizlenen ? 3 : 0;
  if (toplam(kartH, 1) > butce) {
    sikistirma = Math.max(sikistirma, 1);
    kartH = nGirisim ? Math.floor(O.kartMax - (toplam(O.kartMax, 1) - butce) / nGirisim) : O.kartMax;
    if (kartH < O.kartMin) {
      kartH = O.kartMin;
      sikistirma = Math.max(sikistirma, 2);
      olcek = Math.floor(((butce - sabitH - nGirisim * kartH) / boslukH) * 1000) / 1000;
    }
  }
  const bos = Math.max(0, butce - toplam(kartH, olcek));
  const bosUst = Math.floor(bos / 2);
  const ara = (deger: number) => deger * olcek; // ölçeklenmiş boşluk

  // Blok kaydı (test ve denetim için): her üst düzey kutunun yeri, genişliği ve yüksekliği.
  const bloklar: { ad: string; x: number; y: number; w: number; h: number }[] = [];
  const blok = (ad: string, y: number, yukseklik: number, x = paddingX, gen = icGenislik) =>
    bloklar.push({ ad, x, y, w: gen, h: yukseklik });

  let body = '';
  let ic = '';

  // ── 1. ÜST BAŞLIK, TARİH VE LOGO ─────────────────────────────────────────
  // Üst bilgi içerikle tek blok: artan yerin yarısı üst bilginin üstüne gelir.
  const ustY = paddingTop + bosUst;
  const basAlt = ustY + ustBilgiH;
  const logoBoyut = mod === 'story' ? 92 : 80;
  const logoY = ustY + (mod === 'story' ? 4 : 5);
  const logoX = w - paddingX - logoBoyut;

  // Sağ üst: tohum işareti ve altında "kifobu" (Kimlik v2).
  const isaretBoyu = logoBoyut - 22;
  const isaretX = logoX + (logoBoyut - isaretBoyu) / 2;
  body += tohumIsaretiSvg({ boyut: isaretBoyu, kucuk: true }).replace('<svg ', `<svg x="${isaretX}" y="${logoY - 6}" `);
  body += metin('kifobu', logoX + logoBoyut / 2, logoY + isaretBoyu + 18, { agirlik: 'orta', boyut: mod === 'story' ? 24 : 21, renk: KIMLIK.murekkep, hiza: 'center', aralik: -0.6 });

  // Ana Başlık: Post: 40px, Story: 42px
  const baslikBoyut = mod === 'story' ? 42 : 40;
  const baslikY = ustY + 44;
  let baslikCurX = paddingX;

  body += metin('GÜNLÜK ', baslikCurX, baslikY, { agirlik: 'normal', boyut: baslikBoyut, renk: '#09090b' });
  baslikCurX += genislik('GÜNLÜK ', { agirlik: 'normal', boyut: baslikBoyut });

  body += metin('KİTLE FONLAMA ', baslikCurX, baslikY, { agirlik: 'ekstra', boyut: baslikBoyut, renk: '#09090b' });
  baslikCurX += genislik('KİTLE FONLAMA ', { agirlik: 'ekstra', boyut: baslikBoyut });

  body += metin('BÜLTENİ', baslikCurX, baslikY, { agirlik: 'normal', boyut: baslikBoyut, renk: '#09090b' });

  // Tarih / Bülten No: Post: 25px, Story: 27px
  const tarihBoyut = mod === 'story' ? 27 : 25;
  const tarihMetni = `${b.tarih} / ${b.sayi}`;
  body += metin(tarihMetni, paddingX, ustY + 84, { agirlik: 'orta', boyut: tarihBoyut, renk: '#64748b' });
  // Logonun tepesi ustY − 2'ye kadar çıkar.
  blok('ust-bilgi', ustY - 2, ustBilgiH + 2, paddingX, icGenislik);

  // İçeriğin başladığı yer: üst bilgi + üst boşluk.
  let currentY = basAlt + ara(A.ust);

  // Bölüm başlığı: metin + sarı çizgi + sabit başlık altı boşluğu. Her bölümde aynı.
  const bolumBasligi = (ad: string, ilk = false) => {
    if (!ilk) currentY += ara(A.bolum);
    blok(`baslik:${ad}`, currentY, baslikH);
    const taban = currentY + baslikTaban;
    const cizgiY = yaz(taban + O.kuralAlti);
    ic += metin(ad, paddingX, taban, { agirlik: 'ekstra', boyut: T.baslik, renk: '#334155', aralik: 0.5 });
    ic += `<line x1="${paddingX}" y1="${cizgiY}" x2="${w - paddingX}" y2="${cizgiY}" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" />`;
    currentY += baslikH + ara(A.baslikAlti);
  };

  // Etiket | değer çifti; ayraç tam eksende, iki yanda eşit pay.
  const ayracPay = 10;
  const ayrac = (x: number, y: number) => metin('|', x, y, { agirlik: 'orta', boyut: T.etiket, renk: '#cbd5e1', hiza: 'center' });
  const etiketli = (deger: string | null, etiket: string, x: number, y: number, degerRenk = '#09090b', degerSolda = false) => {
    let s = '';
    const d = deger ?? '—'; // okunamayan değer uydurulmaz
    if (degerSolda) {
      s += metin(d, x - ayracPay, y, { agirlik: 'kalin', boyut: T.deger, renk: degerRenk, hiza: 'end' });
      s += ayrac(x, y);
      s += metin(etiket, x + ayracPay, y, { agirlik: 'orta', boyut: T.etiket, renk: '#64748b' });
    } else {
      s += metin(etiket, x - ayracPay, y, { agirlik: 'orta', boyut: T.etiket, renk: '#64748b', hiza: 'end' });
      s += ayrac(x, y);
      s += metin(d, x + ayracPay, y, { agirlik: 'kalin', boyut: T.deger, renk: degerRenk });
    }
    return s;
  };
  const tlMetni = (n?: number | null) => (n ? '₺' + n.toLocaleString('tr-TR') : null);

  // ── 2. GİRİŞİMLER BÖLÜMÜ ───────────────────────────────────────────────
  bolumBasligi('GİRİŞİMLER', true);

  const c1X = paddingX + 22;
  const pipe2X = paddingX + Math.round(icGenislik * (mod === 'story' ? 0.39 : 0.38));
  const pipe3X = paddingX + Math.round(icGenislik * (mod === 'story' ? 0.70 : 0.69));
  const c4RightX = paddingX + icGenislik - 20;
  const cubukX = paddingX + 22;
  const cubukW = icGenislik - 44;

  // Kart içi: iki satır ve aradaki ilerleme çubuğu dikeyde ortalanır; artan yerin %30'u üst ve alt paya,
  // %20'şer çubuğun iki yanına gider. kartMin'de bile satırlar çubuğa 8 px'ten, kenara 13 px'ten yakın olmaz.
  const satirUst = buyuk(T.ad);
  const satirAlt = Math.max(inis(T.ad), inis(T.etiket));
  const kartSabit = satirUst + satirAlt + O.ilerlemeH + satirUst + satirAlt;
  const kartBos = kartH - kartSabit;
  const kartPay = kartBos * 0.3;
  const cubukPay = kartBos * 0.2;

  girisimler.forEach((g, idx) => {
    if (idx > 0) currentY += ara(A.kart);
    blok(`kart:${g.ad}`, currentY, kartH);
    const yuzdeOran = Math.min(Math.max(g.yuzde, 0), 100);
    const cRengi = cubukRengi(g.yuzde);
    const platRenk = b.platformlar.liste.find(p => p.ad.toLowerCase() === g.platform.toLowerCase())?.renk || '#cbd5e1';

    // Kart zemini; soldaki platform şeridi kartın yuvarlak köşesine kırpılır.
    const kirpId = `kart${mod}${idx}`;
    ic += `<clipPath id="${kirpId}"><rect x="${paddingX}" y="${yaz(currentY)}" width="${icGenislik}" height="${kartH}" rx="10" /></clipPath>`;
    ic += `<rect x="${paddingX}" y="${yaz(currentY)}" width="${icGenislik}" height="${kartH}" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.2" />`;
    ic += `<rect x="${paddingX}" y="${yaz(currentY)}" width="5" height="${kartH}" fill="${platRenk}" clip-path="url(#${kirpId})" />`;

    const r1Y = currentY + kartPay + satirUst;
    const barY = r1Y + satirAlt + cubukPay;
    const r2Y = barY + O.ilerlemeH + cubukPay + satirUst;

    // ── SATIR 1: ad · bugün | ₺ · ₺ | alınan · yüzde
    ic += metin(g.ad, c1X, r1Y, { agirlik: 'ekstra', boyut: T.ad, renk: '#09090b' });
    ic += etiketli('₺' + g.bugun.toLocaleString('tr-TR'), 'bugün', pipe2X, r1Y, g.bugun > 0 ? '#10b981' : '#09090b');
    ic += etiketli('₺' + g.alinan.toLocaleString('tr-TR'), 'alınan', pipe3X, r1Y, '#09090b', true);
    ic += metin(yuzdeSonda(g.yuzde), c4RightX, r1Y, { agirlik: 'ekstra', boyut: T.ad, renk: cRengi, hiza: 'end' });

    // İlerleme çubuğu: dolgu, zeminin genişliğiyle orantılı.
    const ilerlemeR = O.ilerlemeH / 2;
    ic += `<rect x="${cubukX}" y="${yaz(barY)}" width="${cubukW}" height="${O.ilerlemeH}" rx="${ilerlemeR}" fill="#f1f5f9" />`;
    if (yuzdeOran > 0) {
      ic += `<rect x="${cubukX}" y="${yaz(barY)}" width="${yaz(Math.max((cubukW * yuzdeOran) / 100, O.ilerlemeH))}" height="${O.ilerlemeH}" rx="${ilerlemeR}" fill="${cRengi}" />`;
    }

    // ── SATIR 2: platform · değerleme | ₺ · ₺/FONLANDI | kalan · durum
    ic += metin(g.platform, c1X, r2Y, { agirlik: 'kalin', boyut: T.ad, renk: platRenk });
    // Değerleme okunamadıysa 0 yazılmaz, "—" çizilir.
    ic += `<g data-degerleme="${g.degerleme > 0 ? g.degerleme : '—'}">`;
    ic += etiketli(g.degerleme > 0 ? tlMetni(g.degerleme) : '—', 'değerleme', pipe2X, r2Y);
    ic += '</g>';
    if (g.kalan === null) {
      ic += etiketli('FONLANDI', 'kalan', pipe3X, r2Y, '#10b981', true);
    } else {
      ic += etiketli('₺' + g.kalan.toLocaleString('tr-TR'), 'kalan', pipe3X, r2Y, '#09090b', true);
    }
    const durumRenk = kapandiMi(g.durum) ? '#64748b' : (g.durum.includes('GÜN') ? '#e11d48' : '#09090b');
    ic += metin(g.durum, c4RightX, r2Y, { agirlik: 'kalin', boyut: T.ad, renk: durumRenk, hiza: 'end' });

    currentY += kartH;
  });

  // ── 2b. ÖN TALEP ŞERİDİ ────────────────────────────────────────────────
  // Kampanya kartının ızgarası (aynı sütunlar); çubuk ve yüzde yok, kesik amber kenar = henüz yatırıma açılmadı.
  const seritPay = (O.seritH - (satirUst + T.seritSatir + satirAlt)) / 2;
  gosterilenSerit.forEach((y, idx) => {
    if (idx > 0 || nGirisim > 0) currentY += ara(A.serit);
    blok(`serit:${y.ad}`, currentY, O.seritH);
    const renk = y.renk || '#94a3b8';
    const kirpId = `serit${mod}${idx}`;
    ic += `<clipPath id="${kirpId}"><rect x="${paddingX}" y="${yaz(currentY)}" width="${icGenislik}" height="${O.seritH}" rx="10" /></clipPath>`;
    ic += `<rect data-on-talep="${y.ad.replace(/[&"<>]/g, '')}" x="${paddingX}" y="${yaz(currentY)}" width="${icGenislik}" height="${O.seritH}" rx="10" fill="#fffdf7" stroke="#f2c94c" stroke-width="1.4" stroke-dasharray="7 5" />`;
    ic += `<rect x="${paddingX}" y="${yaz(currentY)}" width="5" height="${O.seritH}" fill="${renk}" opacity="0.55" clip-path="url(#${kirpId})" />`;
    const s1 = currentY + seritPay + satirUst;
    const s2 = s1 + T.seritSatir;
    ic += metin(y.ad, c1X, s1, { agirlik: 'ekstra', boyut: T.ad, renk: '#09090b' });
    ic += etiketli(tlMetni(y.hedef), 'hedef', pipe2X, s1);
    ic += etiketli(tlMetni(y.onTalep), 'talep tutarı', pipe3X, s1, '#b45309', true);
    ic += metin(y.platform, c1X, s2, { agirlik: 'kalin', boyut: T.ad, renk });
    ic += etiketli(tlMetni(y.degerleme), 'değerleme', pipe2X, s2);
    ic += etiketli(y.onTalepKisi ? y.onTalepKisi.toLocaleString('tr-TR') : null, 'talep sayısı', pipe3X, s2, '#09090b', true);
    // Sağ sütun: kampanya kartının durum yazısı gibi "ön talep", şeridin dikey ortasında (büyük harf yüksekliğinin ortası).
    const durumY = currentY + O.seritH / 2 + buyuk(T.ad) / 2;
    ic += `<g data-serit-durum="ön talep">${metin('ön talep', c4RightX, durumY, { agirlik: 'kalin', boyut: T.ad, renk: '#b45309', hiza: 'end' })}</g>`;
    currentY += O.seritH;
  });
  // Sığmayan şeritler tek satırda sayılır (kart ızgarasının ilk sütunu hizasında).
  if (gizliSerit && !seritKutuda) {
    if (nGirisim > 0 || gosterilenSerit.length) currentY += ara(A.serit);
    blok('serit-tasma', currentY, tasmaSatirH);
    ic += `<g data-serit-tasma="${gizliSerit}">${metin(`+${gizliSerit} ön talep daha`, c1X, currentY + buyuk(T.etiket), { agirlik: 'orta', boyut: T.etiket, renk: '#b45309' })}</g>`;
    currentY += tasmaSatirH;
  }

  // ── 3. PLATFORMLAR BÖLÜMÜ ──────────────────────────────────────────────
  bolumBasligi('PLATFORMLAR');

  // Sayaçlar: üstte etiket, altta tutar (sol bugün, sağ toplam).
  blok('sayac', currentY, sayacH);
  const sayacEtiketY = currentY + buyuk(T.etiket);
  const sayacDegerY = sayacEtiketY + T.sayacSatir;
  ic += metin('bugün', paddingX, sayacEtiketY, { agirlik: 'orta', boyut: T.etiket, renk: '#64748b' });
  ic += paraMetin(b.platformlar.bugun, paddingX, sayacDegerY, { agirlik: 'ekstra', boyut: T.ad, renk: '#10b981' });
  ic += metin('toplam', w - paddingX, sayacEtiketY, { agirlik: 'orta', boyut: T.etiket, renk: '#64748b', hiza: 'end' });
  ic += paraMetin(b.platformlar.toplam, w - paddingX, sayacDegerY, { agirlik: 'ekstra', boyut: T.ad, renk: '#09090b', hiza: 'end' });
  currentY += sayacH + ara(A.ic);

  // Segmentli dağılım çubuğu
  blok('dagilim', currentY, O.cubukH);
  let segX = paddingX;
  let barSegments = '';
  b.platformlar.liste.forEach((p) => {
    const segW = (icGenislik * p.toplam) / platformToplami;
    barSegments += `<rect x="${yaz(segX)}" y="${yaz(currentY)}" width="${yaz(segW)}" height="${O.cubukH}" fill="${p.renk}" />`;
    segX += segW;
  });
  ic += `<g><clipPath id="barClip${mod}"><rect x="${paddingX}" y="${yaz(currentY)}" width="${icGenislik}" height="${O.cubukH}" rx="5" /></clipPath><g clip-path="url(#barClip${mod})">${barSegments}</g></g>`;
  currentY += O.cubukH + ara(A.ic);

  // Platform kartları: ad, toplam yatırım, girişim sayısı (üç satır, dikeyde ortalı).
  blok('platformlar', currentY, O.platKartH);
  const platSayi = Math.max(1, b.platformlar.liste.length);
  const platSutunW = (icGenislik - (platSayi - 1) * O.yatayAralik) / platSayi;
  const platPay = (O.platKartH - (buyuk(T.ad) + 2 * T.platSatir + inis(T.etiket))) / 2;
  b.platformlar.liste.forEach((p, idx) => {
    const px = paddingX + idx * (platSutunW + O.yatayAralik);
    const centerX = px + platSutunW / 2;
    ic += `<rect x="${yaz(px)}" y="${yaz(currentY)}" width="${yaz(platSutunW)}" height="${O.platKartH}" rx="8" fill="${p.renk}18" stroke="${p.renk}40" stroke-width="1.2" />`;
    const adY = currentY + platPay + buyuk(T.ad);

    // 1. satır: renkli nokta + ad, birlikte ortalı
    const adGen = genislik(p.ad, { agirlik: 'kalin', boyut: T.ad });
    const noktaR = 4.5;
    const baslikBlokW = noktaR * 2 + 8 + adGen;
    const noktaX = centerX - baslikBlokW / 2 + noktaR;
    ic += `<circle cx="${yaz(noktaX)}" cy="${yaz(adY - buyuk(T.ad) / 2)}" r="${noktaR}" fill="${p.renk}" />`;
    ic += metin(p.ad, noktaX + noktaR + 8, adY, { agirlik: 'kalin', boyut: T.ad, renk: '#09090b' });
    // 2. satır: toplam yatırım
    ic += metin('₺' + p.toplam.toLocaleString('tr-TR'), centerX, adY + T.platSatir, { agirlik: 'ekstra', boyut: T.ad, renk: '#09090b', hiza: 'center' });
    // 3. satır: girişim sayısı
    ic += metin(`${p.girisim} girişim`, centerX, adY + 2 * T.platSatir, { agirlik: 'orta', boyut: T.etiket, renk: '#64748b', hiza: 'center' });
  });
  currentY += O.platKartH;

  // ── 4. ÖN TALEP & YAKINDA (yalnız rakamsız kutular; kutu yoksa bölüm hiç çizilmez) ──────
  if (kutuSatir) {
    bolumBasligi('ÖN TALEP & YAKINDA');
    const yakindaW = kutuW(kutuSutun);
    // Tek sütunda bile sığmayan ad küçültülür (kesilmez), en az T.enAzAd boyutuna kadar.
    const sigdir = (s: string, agirlik: Agirlik, boyut: number) => {
      const sinir = yakindaW - O.kutuIcPay * 2;
      const gen = genislik(s, { agirlik, boyut });
      return gen > sinir ? Math.max(T.enAzAd, Math.floor(boyut * (sinir / gen) * 10) / 10) : boyut;
    };
    const kutuPay = (O.kutuH - (buyuk(T.ad) + T.kutuSatir + inis(T.etiket))) / 2;
    // Sığmayan kutuların yerine son kutu: "+N kampanya / yakında".
    const kutuListesi: { ad: string; platform: string; arti?: number }[] = artiSayisi
      ? [...gosterilenKutu, { ad: `+${artiSayisi} kampanya`, platform: 'yakında', arti: artiSayisi }]
      : gosterilenKutu;
    for (let satir = 0; satir < kutuSatir; satir++) {
      if (satir > 0) currentY += ara(A.kutu);
      blok(`kutu-satiri:${satir}`, currentY, O.kutuH);
      const adY = currentY + kutuPay + buyuk(T.ad);
      kutuListesi.slice(satir * kutuSutun, (satir + 1) * kutuSutun).forEach((y, sira) => {
        const yx = paddingX + sira * (yakindaW + O.yatayAralik);
        const centerX = yx + yakindaW / 2;
        const kanca = y.arti ? `data-yakinda-arti="${y.arti}"` : `data-yakinda="${y.ad.replace(/[&"<>]/g, '')}"`;
        ic += `<rect ${kanca} x="${yaz(yx)}" y="${yaz(currentY)}" width="${yaz(yakindaW)}" height="${O.kutuH}" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />`;
        ic += metin(y.ad, centerX, adY, { agirlik: 'kalin', boyut: sigdir(y.ad, 'kalin', T.ad), renk: '#09090b', hiza: 'center' });
        ic += metin(y.platform, centerX, adY + T.kutuSatir, { agirlik: 'orta', boyut: sigdir(y.platform, 'orta', T.etiket), renk: '#64748b', hiza: 'center' });
      });
      currentY += O.kutuH;
    }
  }

  // ── 5. MKK VERİLERİ ───────────────────────────────────────────────────
  bolumBasligi('MKK VERİLERİ');
  blok('mkk', currentY, O.mkkH);
  ic += `<rect x="${paddingX}" y="${yaz(currentY)}" width="${icGenislik}" height="${O.mkkH}" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2" />`;
  const mkkY = currentY + (O.mkkH - buyuk(T.deger) - inis(T.deger)) / 2 + buyuk(T.deger);

  // Dört öğe, aralarında ve kenarlarda eşit boşluk.
  const mkkOgeler = [
    { label: 'platform: ', val: String(b.mkk.platform), agirlik: 'kalin' as const },
    { label: 'yatırımcı sayısı: ', val: b.mkk.yatirimci.toLocaleString('tr-TR'), agirlik: 'kalin' as const },
    { label: 'kaydileşen şirket: ', val: String(b.mkk.sirket), agirlik: 'kalin' as const },
    { label: 'toplanan fon: ', val: b.mkk.fon, agirlik: 'ekstra' as const },
  ];
  const mkkGenislikler = mkkOgeler.map((it) => {
    const lG = genislik(it.label, { agirlik: 'orta', boyut: T.etiket });
    const vG = genislik(it.val, { agirlik: it.agirlik, boyut: T.deger });
    return { lG, total: lG + vG };
  });
  const toplamMetinGenisligi = mkkGenislikler.reduce((s, g) => s + g.total, 0);
  const esitBosluk = (icGenislik - toplamMetinGenisligi) / 5;
  let mkkCurX = paddingX + esitBosluk;
  mkkOgeler.forEach((item, idx) => {
    const { lG, total } = mkkGenislikler[idx];
    ic += metin(item.label, mkkCurX, mkkY, { agirlik: 'orta', boyut: T.etiket, renk: '#64748b' });
    ic += metin(item.val, mkkCurX + lG, mkkY, { agirlik: item.agirlik, boyut: T.deger, renk: '#09090b' });
    mkkCurX += total + esitBosluk;
  });
  currentY += O.mkkH;

  const mkkAlt = currentY;
  blok('alt-bant', footerY, footerH, 0, w);
  body += ic;

  // ── 6. EN ALT İMZA ŞERİDİ ─────────────────────────────────────────────
  body += `<rect x="0" y="${footerY}" width="${w}" height="${footerH}" fill="#fef3c7" />`;
  const imzaMetni = 'kifobu.com   |   x.com/kifobu   |   instagram.com/kifobu   |   linkedin.com/in/kifobu';
  const imzaGen = genislik(imzaMetni, { agirlik: 'kalin', boyut: T.baslik });
  const imzaX = (w - imzaGen) / 2;
  body += metin(imzaMetni, imzaX, footerY + (mod === 'story' ? 56 : 33), { agirlik: 'kalin', boyut: T.baslik, renk: '#854d0e' });

  // Testlerin okuduğu kancalar. data-bloklar = "ad;x;y;genişlik;yükseklik|…" (tuval koordinatı, yukarıdan aşağı).
  const bloklarAttr = bloklar
    .map((k) => `${k.ad.replace(/[&"<>|;]/g, '')};${yaz(k.x)};${yaz(k.y)};${yaz(k.w)};${yaz(k.h)}`)
    .join('|');
  const ozellikler = [
    `data-tarih="${tarihMetni}"`,
    `data-mkk-alt="${yaz(mkkAlt)}"`,
    `data-alt-ust="${footerY}"`,
    `data-kart-h="${kartH}"`,
    `data-bolum-aralik="${yaz(ara(A.bolum))}"`,
    `data-kart-aralik="${yaz(ara(A.kart))}"`,
    `data-baslik-alti="${yaz(ara(A.baslikAlti))}"`,
    `data-aralik-olcek="${olcek}"`,
    `data-gizlenen="${gizlenen}"`,
    `data-sikistirma="${sikistirma}"`,
    `data-kutu-sutun="${nKutu ? kutuSutun : 0}"`,
    `data-bloklar="${bloklarAttr}"`,
  ].join(' ');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" ${ozellikler}>
      <!-- Temiz Minimal Zemin -->
      <rect width="${w}" height="${h}" fill="#f8fafc" />

      <!-- Üst Sarı Marka Şeridi -->
      <rect x="0" y="0" width="${w}" height="28" fill="#eab308" />

      <!-- İçerik -->
      ${body}
    </svg>
  `;
}
