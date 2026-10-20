import { yuzdeKesik } from './kimlik.ts';
export const SITE = {
  name: 'kifobu',
  tagline: 'Ulaşılabilir ve anlaşılır veri',
  description: 'Girişimler, girişim yatırımları ve kitle fonlaması: haberler ve günlük bülten.',
  locale: 'tr-TR',
  // 1. bültenin yayımlandığı gün (YYYY-AA-GG). Üst banttaki "Bülten 1.523" sayacı buradan hesaplanır
  // (10 Ekim 2026 = 1.523. bülten). Her gün bir bülten varsayılır.
  kurulus: '2022-08-10',
  // Boş bırakılan hesaplar sitede gösterilmez.
  social: {
    x: 'https://x.com/kifobu',
    instagram: 'https://www.instagram.com/kifobu/',
    linkedin: 'https://www.linkedin.com/company/kifobu',
    youtube: 'https://www.youtube.com/@kifobu',
    telegram: 'https://t.me/kifobu',
    facebook: 'https://www.facebook.com/kifobucom',
  },
};

// emekli: kifobu'nun konusu dışında kalan eski genel haber bölümleri (2026-10-15). Bot bunlara yazmaz, menüde ve
// anasayfada görünmezler; eski haberlerin adresleri bozulmasın diye sayfaları ve şemadaki değerleri durur.
export const CATEGORIES = [
  { slug: 'gunluk-bulten', name: 'Günlük Bülten' },
  { slug: 'kampanyalar', name: 'Kampanyalar', veri: '/kampanya/' },
  { slug: 'platformlar', name: 'Platformlar', veri: '/platform/' },
  { slug: 'yatirimlar', name: 'Yatırımlar' },
  { slug: 'girisimler', name: 'Girişimler' },
  { slug: 'mevzuat', name: 'Mevzuat' },
  { slug: 'analiz', name: 'Analiz' },
  { slug: 'gundem', name: 'Gündem', emekli: true },
  { slug: 'yapay-zeka', name: 'Yapay Zekâ', emekli: true },
  { slug: 'donanim', name: 'Donanım', emekli: true },
  { slug: 'dunya', name: 'Dünya', emekli: true },
] as const;

/** Menüde ve anasayfada gösterilen (emekli olmayan) bölümler. */
export const ACIK_KATEGORILER = CATEGORIES.filter((c) => !('emekli' in c && c.emekli));

/** Menüdeki adres: veri sayfası olan bölümler (kampanya ve platform dizinleri) oraya gider; haberleri dizinden ve
 * bölüm sayfasından okunur. */
export const menuAdresi = (c: (typeof CATEGORIES)[number]) => ('veri' in c ? c.veri : `/${c.slug}/`);

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

// Kampanya durumu: tahtada renk değil tebeşir işaretiyle gösterilir.
export const DURUMLAR = {
  yeni: 'Yeni açıldı',
  suruyor: 'Sürüyor',
  basarili: 'Hedefe ulaştı',
  basarisiz: 'Hedefe ulaşamadan kapandı',
} as const;

export type Durum = keyof typeof DURUMLAR;

export const RISK_NOTU =
  'kifobu kampanya verilerini bilgi amacıyla yayımlar; yatırım tavsiyesi değildir. Kitle fonlaması yatırımları sermaye kaybı riski taşır.';

export function formatDate(date: Date, withTime = false) {
  return date.toLocaleString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Europe/Istanbul',
  });
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString(SITE.locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
}

export function formatNumber(n: number) {
  return n.toLocaleString(SITE.locale, { maximumFractionDigits: 0 });
}

// Para birimleri: kitle fonlama kampanyaları çoğunlukla lira, girişim yatırımları çoğunlukla dolar.
export const PARA_BIRIMLERI = {
  TRY: { simge: '₺', ad: 'lira' },
  USD: { simge: '$', ad: 'dolar' },
  EUR: { simge: '€', ad: 'avro' },
  GBP: { simge: '£', ad: 'sterlin' },
} as const;

export type ParaBirimi = keyof typeof PARA_BIRIMLERI;

/** Yatırımcı listesinin ilki (öncü yatırımcı); tahtada ve kapakta yer dar. */
export const ilkYatirimci = (s?: string) => s?.split(/,|;| ve /)[0]?.trim() || undefined;

export const paraSimgesi = (pb: string = 'TRY') => PARA_BIRIMLERI[pb as ParaBirimi]?.simge ?? pb;

export function formatMoney(n: number, pb: string = 'TRY') {
  return `${paraSimgesi(pb)}${formatNumber(n)}`;
}

/** Kısa tutar: 6,25 milyon lira / 850 bin dolar */
export function formatMoneyShort(n: number, pb: string = 'TRY') {
  const ad = PARA_BIRIMLERI[pb as ParaBirimi]?.ad ?? pb;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString(SITE.locale, { maximumFractionDigits: 2 })} milyar ${ad}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(SITE.locale, { maximumFractionDigits: 2 })} milyon ${ad}`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(SITE.locale, { maximumFractionDigits: 0 })} bin ${ad}`;
  return formatMoney(n, pb);
}


/** Hedefe oran, BRAND.md §9 yazımıyla ("%71,02"; iki ondalık, kesilerek). */
export function percentOf(toplanan?: number, hedef?: number) {
  if (!toplanan || !hedef) return undefined;
  return yuzdeKesik((toplanan / hedef) * 100);
}

/** Kuruluştan bugüne kaçıncı gün (kuruluş günü 1. gün). */
export function dayNumber(now = new Date()) {
  if (!SITE.kurulus) return undefined;
  const start = Date.parse(`${SITE.kurulus}T00:00:00+03:00`);
  if (Number.isNaN(start)) return undefined;
  return Math.floor((now.valueOf() - start) / 86_400_000) + 1;
}
