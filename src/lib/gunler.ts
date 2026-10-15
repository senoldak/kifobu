// Günlük bültenin kalıcı tarihli sayfaları (/gunluk-bulten/YYYY-AA-GG/): o günün 18:00 kampanya kaydı
// (src/data/arsiv/*.json), o gün yayımlanan bülten yazıları (sabah/öğle/gece) ve o günün haberleri.
// Saf TypeScript: birim testiyle sınanır.
import type { ArsivKaydi } from './arsiv/tipler.ts';
import { indekslenir } from './indeks.ts';

export interface GunAday {
  id: string;
  body?: string;
  data: { category: string; date: Date; draft?: boolean; noindex?: boolean };
}

/** 1. bültenin günü (src/lib/site.ts → SITE.kurulus ile aynı). */
export const KURULUS = '2022-08-10';

/** Tarihin İstanbul saatiyle günü: YYYY-AA-GG. */
export function istanbulGunu(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Günün bülten sayısı: kuruluş günü 1 (her gün bir bülten). */
export function bultenSayisi(gun: string, kurulus = KURULUS): number {
  return Math.round((Date.parse(`${gun}T00:00:00Z`) - Date.parse(`${kurulus}T00:00:00Z`)) / 86_400_000) + 1;
}

export const GUN_DESENI = /^\d{4}-\d{2}-\d{2}$/;

export interface BultenGunu<T extends GunAday> {
  tarih: string;
  sayi: number;
  kayit?: ArsivKaydi;
  /** O gün yayımlanan bülten yazıları (gunluk-bulten bölümü), saat sırasıyla. */
  bultenler: T[];
  /** O gün yayımlanan, arama motorlarına açık haberler (bülten yazıları hariç), en yeniden eskiye. */
  haberler: T[];
  /** Sayfa arama motorlarına açık mı: kampanya kaydı ya da en az 3 haber. */
  indeks: boolean;
}

/** Kampanya kaydı, bülten yazısı ya da en az 3 haberi olan her gün için bir sayfa; en yeni gün önce. */
export function bultenGunleri<T extends GunAday>(tum: T[], kayitlar: ArsivKaydi[]): BultenGunu<T>[] {
  const gunler = new Map<string, BultenGunu<T>>();
  const al = (tarih: string) => {
    let g = gunler.get(tarih);
    if (!g) {
      g = { tarih, sayi: bultenSayisi(tarih), bultenler: [], haberler: [], indeks: false };
      gunler.set(tarih, g);
    }
    return g;
  };
  for (const k of kayitlar) {
    const g = al(k.tarih);
    g.kayit = k;
    g.sayi = k.sayi;
  }
  for (const h of tum) if (h.data.category === 'gunluk-bulten' && !h.data.draft) al(istanbulGunu(h.data.date)).bultenler.push(h);
  for (const h of tum) {
    if (h.data.category === 'gunluk-bulten') continue;
    if (!indekslenir({ draft: h.data.draft, noindex: h.data.noindex, govde: h.body })) continue;
    al(istanbulGunu(h.data.date)).haberler.push(h);
  }
  // Kampanya kaydı ve bülten yazısı olmayan gün, en az 3 haberi varsa sayfa olur (o günün haber dökümü).
  const liste = [...gunler.values()]
    .filter((g) => g.kayit || g.bultenler.length > 0 || g.haberler.length >= 3)
    .sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
  for (const g of liste) {
    g.bultenler.sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf());
    g.haberler.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
    g.indeks = Boolean(g.kayit) || g.haberler.length >= 3;
  }
  return liste;
}

/** Bülten yazısının yayımlandığı günün kalıcı sayfası. */
export const gunUrl = (tarih: string) => `/gunluk-bulten/${tarih}/`;
