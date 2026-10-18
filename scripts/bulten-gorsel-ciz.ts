import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { create, type Font } from 'fontkitten';
import { BULTEN, type Girisim, type Platform, type Yakinda } from '../src/data/bulten.ts';
import { KIMLIK, tohumIsaretiSvg, yuzdeSonda } from '../src/lib/kimlik.ts';

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

// İlerleme çubuğu renkleri
const cubukRengi = (y: number) => {
  if (y >= 100) return '#10b981'; // Canlı Zümrüt Yeşili
  if (y >= 50) return '#0284c7';  // Kurumsal Okyanus Mavisi
  return '#6366f1';               // İndigo
};

export function bultenSvgCiz(mod: GorselModu = 'post'): string {
  const w = 1080;
  const h = mod === 'story' ? 1920 : 1350;
  const paddingX = 56;
  const icGenislik = w - paddingX * 2; // 968 px

  const b = {
    ...BULTEN,
    // KURAL: Eğer bir girişim aktif girişimler satırında fonlamadaysa, ön talep / yakında alanından otomatik çıkarılır
    yakinda: BULTEN.yakinda.filter(
      (y) => !BULTEN.girisimler.some((g) => g.ad.trim().toLowerCase() === y.ad.trim().toLowerCase())
    ),
  };
  const platformToplami = b.platformlar.liste.reduce((s, p) => s + p.toplam, 0) || 1;

  // ── DİNAMİK DİKEY DAĞILIM VE BOŞLUKSUZ YAYILIM KURALI ───────────────────
  const footerH = mod === 'story' ? 96 : 52;
  const footerY = h - footerH;
  // MKK kutusu ile alt bant arasında en az bir satır boşluk (sahibin isteği).
  const hedefAltBosluk = mod === 'story' ? 56 : 40;
  const hedefMkkAlt = footerY - hedefAltBosluk;

  // Başlıklar ve sabit yükseklikler
  const fSize = mod === 'story' ? 24 : 19;
  const paddingTop = mod === 'story' ? 190 : 54;
  const baslikBloguH = mod === 'story' ? 195 : 155;
  const startContentY = paddingTop + baslikBloguH;

  const titleGap = 32;
  const sayacH = mod === 'story' ? 68 : 58;
  const platBarH = mod === 'story' ? 22 : 18;
  const platKartH = mod === 'story' ? 104 : 90;
  const yakindaH = mod === 'story' ? 82 : 68;
  const mkkKartH = mod === 'story' ? 76 : 64;

  const nGirisim = b.girisimler.length;
  // Kesin Sabitler Toplamı: 4 bölüm başlığı (4 * titleGap), sayaçlar, platform barı, platform kartları, yakında kartları ve MKK kartı
  const sabitler = (4 * titleGap) + sayacH + (platBarH + 22) + platKartH + yakindaH + mkkKartH;
  // Dikeyde tam hedefMkkAlt noktasına kadar doldurulacak toplam serbest alan
  const dagitilacakAlan = (hedefMkkAlt - startContentY) - sabitler;

  // 3 bölüm arası boşluk (Girişimler->Platformlar, Platformlar->ÖnTalep, ÖnTalep->MKK)
  const toplamSecGap = Math.round(dagitilacakAlan * 0.26);
  const secGap = Math.round(toplamSecGap / 3);

  // Girişim kartları ve kart arası boşluklar (kalan alanın %100'ünü tam tüketir, fark 0 px)
  const girisimAlani = dagitilacakAlan - (secGap * 3);
  const cardH = Math.round((girisimAlani * 0.82) / nGirisim);
  const gapGirisim = nGirisim > 1 ? Math.round((girisimAlani - (nGirisim * cardH)) / (nGirisim - 1)) : 0;

  let currentY = paddingTop;
  let body = '';

  // ── 1. ÜST BAŞLIK, TARİH VE LOGO ─────────────────────────────────────────
  const logoBoyut = mod === 'story' ? 92 : 80;
  const logoY = currentY + (mod === 'story' ? 4 : 5);
  const logoX = w - paddingX - logoBoyut;

  // Sağ üst: tohum işareti ve altında "kifobu" (Kimlik v2).
  const isaretBoyu = logoBoyut - 22;
  const isaretX = logoX + (logoBoyut - isaretBoyu) / 2;
  body += tohumIsaretiSvg({ boyut: isaretBoyu, kucuk: true }).replace('<svg ', `<svg x="${isaretX}" y="${logoY - 6}" `);
  body += metin('kifobu', logoX + logoBoyut / 2, logoY + isaretBoyu + 18, { agirlik: 'orta', boyut: mod === 'story' ? 24 : 21, renk: KIMLIK.murekkep, hiza: 'center', aralik: -0.6 });

  // Ana Başlık: Post: 40px, Story: 42px
  const baslikBoyut = mod === 'story' ? 42 : 40;
  const baslikY = currentY + 44;
  let baslikCurX = paddingX;

  body += metin('GÜNLÜK ', baslikCurX, baslikY, { agirlik: 'normal', boyut: baslikBoyut, renk: '#09090b' });
  baslikCurX += genislik('GÜNLÜK ', { agirlik: 'normal', boyut: baslikBoyut });

  body += metin('KİTLE FONLAMA ', baslikCurX, baslikY, { agirlik: 'ekstra', boyut: baslikBoyut, renk: '#09090b' });
  baslikCurX += genislik('KİTLE FONLAMA ', { agirlik: 'ekstra', boyut: baslikBoyut });

  body += metin('BÜLTENİ', baslikCurX, baslikY, { agirlik: 'normal', boyut: baslikBoyut, renk: '#09090b' });

  // Tarih / Bülten No: Post: 25px, Story: 27px
  const tarihBoyut = mod === 'story' ? 27 : 25;
  const tarihMetni = `${b.tarih} / ${b.sayi}`;
  body += metin(tarihMetni, paddingX, currentY + 84, { agirlik: 'orta', boyut: tarihBoyut, renk: '#64748b' });

  currentY += baslikBloguH;

  // ── 2. GİRİŞİMLER BÖLÜMÜ ───────────────────────────────────────────────
  body += metin('GİRİŞİMLER', paddingX, currentY, { agirlik: 'ekstra', boyut: fSize, renk: '#334155', aralik: 0.5 });
  body += `<line x1="${paddingX}" y1="${currentY + 12}" x2="${w - paddingX}" y2="${currentY + 12}" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" />`;

  currentY += titleGap;

  const c1X = paddingX + 22;
  const pipe2X = paddingX + Math.round(icGenislik * (mod === 'story' ? 0.39 : 0.38));
  const pipe3X = paddingX + Math.round(icGenislik * (mod === 'story' ? 0.70 : 0.69));
  const c4RightX = paddingX + icGenislik - 20;

  b.girisimler.forEach((g, idx) => {
    const yuzdeOran = Math.min(Math.max(g.yuzde, 0), 100);
    const cRengi = cubukRengi(g.yuzde);
    const dolguW = (icGenislik * yuzdeOran) / 100;

    // Premium Kart Arka Planı + İnce Kenar Çizgisi
    body += `<rect x="${paddingX}" y="${currentY}" width="${icGenislik}" height="${cardH}" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.2" />`;
    
    // Sol platform renk şeridi
    const platRenk = b.platformlar.liste.find(p => p.ad.toLowerCase() === g.platform.toLowerCase())?.renk || '#cbd5e1';
    body += `<rect x="${paddingX}" y="${currentY}" width="5" height="${cardH}" rx="2.5" fill="${platRenk}" />`;

    const r1Y = currentY + Math.round(cardH * 0.31);
    const barY = currentY + Math.round(cardH * 0.46);
    const r2Y = currentY + Math.round(cardH * 0.80);

    // ── SATIR 1 ──────────────────────────────────────────────────────────
    // Sütun 1: Girişim Adı (Story: fSize)
    body += metin(g.ad, c1X, r1Y, { agirlik: 'ekstra', boyut: fSize, renk: '#09090b' });

    // Sütun 2: [bugün] | [₺...]  (19px - Tam | eksenine göre hizalı)
    body += metin('bugün', pipe2X - 10, r1Y, { agirlik: 'orta', boyut: 19, renk: '#64748b', hiza: 'end' });
    body += metin('|', pipe2X, r1Y, { agirlik: 'orta', boyut: 19, renk: '#cbd5e1', hiza: 'middle' });
    const bugunRenk = g.bugun > 0 ? '#10b981' : '#09090b';
    body += paraMetin(g.bugun, pipe2X + 10, r1Y, { agirlik: 'kalin', boyut: 19, renk: bugunRenk });

    // Sütun 3: [₺...] | [alınan]  (19px - Tam | eksenine göre hizalı)
    const alinanStr = '₺' + g.alinan.toLocaleString('tr-TR');
    const alinanGen = genislik(alinanStr, { agirlik: 'kalin', boyut: 19 });
    body += paraMetin(g.alinan, pipe3X - 10 - alinanGen, r1Y, { agirlik: 'kalin', boyut: 19, renk: '#09090b' });
    body += metin('|', pipe3X, r1Y, { agirlik: 'orta', boyut: 19, renk: '#cbd5e1', hiza: 'middle' });
    body += metin('alınan', pipe3X + 10, r1Y, { agirlik: 'orta', boyut: 19, renk: '#64748b' });

    // Sütun 4: Yüzde Rozeti (Sağa dayalı)
    const yuzdeStr = yuzdeSonda(g.yuzde);
    const yuzdeW = genislik(yuzdeStr, { agirlik: 'ekstra', boyut: fSize });
    const rozetH = mod === 'story' ? 32 : 26;
    const rozetY = currentY + (mod === 'story' ? 14 : 12);
    const rozetX = c4RightX - yuzdeW - 14;
    body += `<rect x="${rozetX}" y="${rozetY}" width="${yuzdeW + 14}" height="${rozetH}" rx="6" fill="${cRengi}18" />`;
    body += metin(yuzdeStr, rozetX + 7, r1Y + (mod === 'story' ? 0 : 1), { agirlik: 'ekstra', boyut: fSize, renk: cRengi });

    // İlerleme Barı (Yuvarlak Hatlı)
    body += `<rect x="${paddingX + 22}" y="${barY}" width="${icGenislik - 44}" height="7" rx="3.5" fill="#f1f5f9" />`;
    if (dolguW > 0) {
      body += `<rect x="${paddingX + 22}" y="${barY}" width="${Math.max(dolguW - 44, 7)}" height="7" rx="3.5" fill="${cRengi}" />`;
    }

    // ── SATIR 2 ──────────────────────────────────────────────────────────
    // Sütun 1: Platform Adı (Story: fSize)
    body += metin(g.platform, c1X, r2Y, { agirlik: 'kalin', boyut: fSize, renk: platRenk });

    // Sütun 2: [değerleme] | [₺...]  (19px - Tam | eksenine göre hizalı)
    body += metin('değerleme', pipe2X - 10, r2Y, { agirlik: 'orta', boyut: 19, renk: '#64748b', hiza: 'end' });
    body += metin('|', pipe2X, r2Y, { agirlik: 'orta', boyut: 19, renk: '#cbd5e1', hiza: 'middle' });
    body += paraMetin(g.degerleme, pipe2X + 10, r2Y, { agirlik: 'kalin', boyut: 19, renk: '#09090b' });

    // Sütun 3: [₺... / FONLANDI] | [kalan]  (19px - Tam | eksenine göre hizalı)
    if (g.kalan === null) {
      body += metin('FONLANDI', pipe3X - 10, r2Y, { agirlik: 'ekstra', boyut: 19, renk: '#10b981', hiza: 'end' });
    } else {
      const kalStr = '₺' + g.kalan.toLocaleString('tr-TR');
      const kalGen = genislik(kalStr, { agirlik: 'kalin', boyut: 19 });
      body += paraMetin(g.kalan, pipe3X - 10 - kalGen, r2Y, { agirlik: 'kalin', boyut: 19, renk: '#09090b' });
    }
    body += metin('|', pipe3X, r2Y, { agirlik: 'orta', boyut: 19, renk: '#cbd5e1', hiza: 'middle' });
    body += metin('kalan', pipe3X + 10, r2Y, { agirlik: 'orta', boyut: 19, renk: '#64748b' });

    // Sütun 4: Durum (Sağa dayalı)
    const durumRenk = g.durum === 'SONA ERDİ' ? '#64748b' : (g.durum.includes('GÜN') ? '#e11d48' : '#09090b');
    body += metin(g.durum, c4RightX, r2Y, { agirlik: 'kalin', boyut: fSize, renk: durumRenk, hiza: 'end' });

    currentY += cardH + (idx < nGirisim - 1 ? gapGirisim : 0);
  });

  // Bölüm Geçişi: Girişimler -> Platformlar (Dinamik secGap)
  currentY += secGap;

  // ── 3. PLATFORMLAR BÖLÜMÜ ──────────────────────────────────────────────
  body += metin('PLATFORMLAR', paddingX, currentY, { agirlik: 'ekstra', boyut: fSize, renk: '#334155', aralik: 0.5 });
  body += `<line x1="${paddingX}" y1="${currentY + 12}" x2="${w - paddingX}" y2="${currentY + 12}" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" />`;

  currentY += titleGap;

  // Sayaç Metinleri (Çerçevesiz, minimalist, dağılım çubuğuna yakın)
  // Sol: bugün
  body += metin('bugün', paddingX, currentY + (mod === 'story' ? 24 : 20), { agirlik: 'orta', boyut: fSize, renk: '#64748b' });
  body += paraMetin(b.platformlar.bugun, paddingX, currentY + (mod === 'story' ? 56 : 48), { agirlik: 'ekstra', boyut: fSize, renk: '#10b981' });

  // Sağ: toplam
  body += metin('toplam', w - paddingX, currentY + (mod === 'story' ? 24 : 20), { agirlik: 'orta', boyut: fSize, renk: '#64748b', hiza: 'end' });
  body += paraMetin(b.platformlar.toplam, w - paddingX, currentY + (mod === 'story' ? 56 : 48), { agirlik: 'ekstra', boyut: fSize, renk: '#09090b', hiza: 'end' });

  currentY += sayacH;

  // Segmentli Dağılım Çubuğu
  let segX = paddingX;
  let barSegments = '';
  b.platformlar.liste.forEach((p) => {
    const segW = (icGenislik * p.toplam) / platformToplami;
    barSegments += `<rect x="${segX}" y="${currentY}" width="${segW}" height="${platBarH}" fill="${p.renk}" />`;
    segX += segW;
  });

  body += `
    <g>
      <clipPath id="barClip${mod}">
        <rect x="${paddingX}" y="${currentY}" width="${icGenislik}" height="${platBarH}" rx="5" />
      </clipPath>
      <g clip-path="url(#barClip${mod})">
        ${barSegments}
      </g>
    </g>
  `;

  currentY += platBarH + 22;

  // Platform Kartları (Ayrı Modern Kartlar - 3 Satır: Ad, Toplam Yatırım, Girişim Sayısı)
  const platSayi = b.platformlar.liste.length;
  const platSutunW = (icGenislik - (platSayi - 1) * 14) / platSayi;

  b.platformlar.liste.forEach((p, idx) => {
    const px = paddingX + idx * (platSutunW + 14);
    const centerX = px + platSutunW / 2;
    body += `<rect x="${px}" y="${currentY}" width="${platSutunW}" height="${platKartH}" rx="8" fill="${p.renk}18" stroke="${p.renk}40" stroke-width="1.2" />`;
    
    // 1. Satır: Platform adı (Ortalanmış, renkli nokta ile birlikte)
    const adGen = genislik(p.ad, { agirlik: 'kalin', boyut: fSize });
    const noktaR = 4.5;
    const baslikBlokW = noktaR * 2 + 8 + adGen;
    const noktaX = centerX - baslikBlokW / 2 + noktaR;
    const adX = noktaX + noktaR + 8;
    body += `<circle cx="${noktaX}" cy="${currentY + (mod === 'story' ? 24 : 21)}" r="${noktaR}" fill="${p.renk}" />`;
    body += metin(p.ad, adX, currentY + (mod === 'story' ? 30 : 27), { agirlik: 'kalin', boyut: fSize, renk: '#09090b' });

    // 2. Satır: Toplam yatırım (Ortalanmış)
    const tutarStr = '₺' + p.toplam.toLocaleString('tr-TR');
    const tutarGen = genislik(tutarStr, { agirlik: 'ekstra', boyut: fSize });
    body += paraMetin(p.toplam, centerX - tutarGen / 2, currentY + (mod === 'story' ? 61 : 53), { agirlik: 'ekstra', boyut: fSize, renk: '#09090b' });

    // 3. Satır: Girişim sayısı (Ortalanmış)
    body += metin(`${p.girisim} girişim`, centerX, currentY + (mod === 'story' ? 90 : 78), { agirlik: 'orta', boyut: fSize, renk: '#64748b', hiza: 'center' });
  });

  currentY += platKartH;

  // Bölüm Geçişi: Platformlar -> Ön Talep & Yakında (Dinamik secGap)
  currentY += secGap;

  // ── 4. ÖN TALEP & YAKINDA ──────────────────────────────────────────────
  body += metin('ÖN TALEP & YAKINDA', paddingX, currentY, { agirlik: 'ekstra', boyut: fSize, renk: '#334155', aralik: 0.5 });
  body += `<line x1="${paddingX}" y1="${currentY + 12}" x2="${w - paddingX}" y2="${currentY + 12}" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" />`;

  currentY += titleGap;

  const yakindaSayi = b.yakinda.length;
  const yakindaW = (icGenislik - (Math.min(yakindaSayi, 3) - 1) * 14) / Math.min(yakindaSayi, 3);

  b.yakinda.slice(0, 3).forEach((y, idx) => {
    const yx = paddingX + idx * (yakindaW + 14);
    const centerX = yx + yakindaW / 2;
    body += `<rect x="${yx}" y="${currentY}" width="${yakindaW}" height="${yakindaH}" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />`;
    body += metin(y.ad, centerX, currentY + (mod === 'story' ? 35 : 30), { agirlik: 'kalin', boyut: fSize, renk: '#09090b', hiza: 'center' });
    body += metin(y.platform, centerX, currentY + (mod === 'story' ? 66 : 55), { agirlik: 'orta', boyut: fSize, renk: '#64748b', hiza: 'center' });
  });

  currentY += yakindaH;

  // Bölüm Geçişi: Ön Talep & Yakında -> MKK Verileri (Dinamik secGap)
  currentY += secGap;

  // ── 5. MKK VERİLERİ ───────────────────────────────────────────────────
  body += metin('MKK VERİLERİ', paddingX, currentY, { agirlik: 'ekstra', boyut: fSize, renk: '#334155', aralik: 0.5 });
  body += `<line x1="${paddingX}" y1="${currentY + 12}" x2="${w - paddingX}" y2="${currentY + 12}" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" />`;

  currentY += titleGap;

  // Açık Renk Kart Tasarımı (Ön Talep gibi f8fafc zeminli ve modern)
  body += `<rect x="${paddingX}" y="${currentY}" width="${icGenislik}" height="${mkkKartH}" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.2" />`;
  const mkkAlt = currentY + mkkKartH;
  const mkkY = currentY + (mod === 'story' ? 46 : 41);

  // 4 Öğeli Dengeli Eşit Boşluklu Dağılım (Çizgisiz, ferah ve tam dengeli)
  const mkkOgeler = [
    { label: 'platform: ', val: String(b.mkk.platform), agirlik: 'kalin' as const },
    { label: 'yatırımcı sayısı: ', val: b.mkk.yatirimci.toLocaleString('tr-TR'), agirlik: 'kalin' as const },
    { label: 'kaydileşen şirket: ', val: String(b.mkk.sirket), agirlik: 'kalin' as const },
    { label: 'toplanan fon: ', val: b.mkk.fon, agirlik: 'ekstra' as const }
  ];

  const mkkGenislikler = mkkOgeler.map(it => {
    const lG = genislik(it.label, { agirlik: 'orta', boyut: 19 });
    const vG = genislik(it.val, { agirlik: it.agirlik, boyut: 19 });
    return { lG, vG, total: lG + vG };
  });

  const toplamMetinGenisligi = mkkGenislikler.reduce((s, g) => s + g.total, 0);
  const esitBosluk = (icGenislik - toplamMetinGenisligi) / 5;

  let mkkCurX = paddingX + esitBosluk;
  mkkOgeler.forEach((item, idx) => {
    const { lG, total } = mkkGenislikler[idx];
    body += metin(item.label, mkkCurX, mkkY, { agirlik: 'orta', boyut: 19, renk: '#64748b' });
    body += metin(item.val, mkkCurX + lG, mkkY, { agirlik: item.agirlik, boyut: 19, renk: '#09090b' });
    mkkCurX += total + esitBosluk;
  });

  // ── 6. EN ALT İMZA ŞERİDİ ─────────────────────────────────────────────
  body += `<rect x="0" y="${footerY}" width="${w}" height="${footerH}" fill="#fef3c7" />`;
  const imzaMetni = 'kifobu.com   |   x.com/kifobu   |   instagram.com/kifobu   |   linkedin.com/in/kifobu';
  const imzaGen = genislik(imzaMetni, { agirlik: 'kalin', boyut: fSize });
  const imzaX = (w - imzaGen) / 2;
  body += metin(imzaMetni, imzaX, footerY + (mod === 'story' ? 56 : 33), { agirlik: 'kalin', boyut: fSize, renk: '#854d0e' });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-tarih="${tarihMetni}" data-mkk-alt="${mkkAlt}" data-alt-ust="${footerY}">
      <!-- Temiz Minimal Zemin -->
      <rect width="${w}" height="${h}" fill="#f8fafc" />

      <!-- Üst Sarı Marka Şeridi -->
      <rect x="0" y="0" width="${w}" height="28" fill="#eab308" />

      <!-- İçerik -->
      ${body}
    </svg>
  `;
}
