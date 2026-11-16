// Konu, platform, kampanya ve bülten günü sayfalarının ortak verisi (Astro tarafı). Kurallar saf modüllerde:
// src/lib/konular.ts, kampanya.ts, gunler.ts. Bu dosya yalnız içerik koleksiyonunu ve arşiv kayıtlarını bağlar.
import { getNews, type Haber } from './news';
import { arsivKayitlari } from './arsiv/yukle.ts';
import { kampanyalar, girisimEslesir, type Kampanya } from './kampanya.ts';
import { platformHaberleri, platformlar, platformSayfasi, platformEslesir, slugTr, yayimlananKonular, type Konu, type Platform } from './konular.ts';
import { bultenGunleri, istanbulGunu } from './gunler.ts';
import { ceyrekOzeti, veriliCeyrekler, type CeyrekOzeti } from './rapor.ts';
import { gecmisGirisimler, type GecmisGirisim, type GecmisKampanya } from './kampanya-gecmis.ts';
import gecmisVeri from '../data/kampanya-gecmis.json';

export interface PlatformSayfasi {
  platform: Platform;
  haberler: Haber[];
  kampanyalar: Kampanya[];
  /** Kapanmış kampanyalar (src/data/kampanya-gecmis.json); varsa sayfa üretilir, künyedeki platform adı buraya bağlanır. */
  gecmis: GecmisKampanya[];
  indeks: boolean;
}

export async function dizinVerisi() {
  const news = await getNews();
  const kayitlar = arsivKayitlari();
  const kps = kampanyalar(kayitlar);
  const konular = yayimlananKonular(news);
  const gecmisler = gecmisVeri.kampanyalar as GecmisKampanya[];
  // Kayıttaki platform anahtarları küçük harf (fonbulucu): haberde ya da ayarda adı yoksa baş harfi büyütülür.
  const gecmisAdlari = [...new Set(gecmisler.map((k) => k.platform))].map((p) => p.charAt(0).toLocaleUpperCase('tr-TR') + p.slice(1));
  const plats: PlatformSayfasi[] = platformlar([...news.map((h) => h.data.platform).filter((x): x is string => Boolean(x)), ...gecmisAdlari])
    .map((platform) => {
      const haberler = platformHaberleri(platform, news);
      const pk = kps.filter((k) => slugTr(k.platform) === platform.slug);
      const gecmis = gecmisler.filter((k) => slugTr(k.platform) === platform.slug);
      const { uret, indeks } = platformSayfasi(haberler.length, pk.length + gecmis.length);
      return uret ? { platform, haberler, kampanyalar: pk, gecmis, indeks } : undefined;
    })
    .filter((x): x is PlatformSayfasi => Boolean(x))
    .sort((a, b) => b.haberler.length + b.kampanyalar.length - (a.haberler.length + a.kampanyalar.length) || a.platform.ad.localeCompare(b.platform.ad, 'tr'));
  const gunler = bultenGunleri(news, kayitlar);
  return { news, kayitlar, kampanyalar: kps, konular, platformlar: plats, gunler };
}

/** Haber sayfasının altındaki "Konular" satırı: sayfası üretilmiş konu, platform ve kampanya bağlantıları. */
export function haberBaglantilari(
  haber: Haber,
  veri: { konular: { konu: Konu; haberler: Haber[] }[]; platformlar: PlatformSayfasi[]; kampanyalar: Kampanya[] },
): { ad: string; url: string }[] {
  const out: { ad: string; url: string }[] = [];
  for (const k of veri.kampanyalar) if (girisimEslesir(k, haber.data.girisim)) out.push({ ad: `${k.ad} kampanyası`, url: `/kampanya/${k.slug}/` });
  for (const p of veri.platformlar) if (platformEslesir(p.platform, haber)) out.push({ ad: p.platform.ad, url: `/platform/${p.platform.slug}/` });
  for (const { konu, haberler } of veri.konular) if (haberler.some((h) => h.id === haber.id)) out.push({ ad: konu.ad, url: `/konu/${konu.slug}/` });
  return out;
}

export const platformUrl = (anahtar: string) => `/platform/${slugTr(anahtar)}/`;

// /girisim/<slug>/ sayfası olan adlar (sayfadaki eşleşmeyle aynı: girişimin slug'ı ve her kampanyasının adı).
let girisimHaritasi: Map<string, GecmisGirisim> | undefined;
/** Adı kampanya kaydındaki bir girişime uyan girişim (sayfası /girisim/<slug>/). */
export function gecmisGirisim(ad: string): GecmisGirisim | undefined {
  if (!girisimHaritasi) {
    girisimHaritasi = new Map();
    for (const g of gecmisGirisimler(gecmisVeri.kampanyalar as GecmisKampanya[]))
      for (const a of [g.slug, ...g.kampanyalar.map((k) => slugTr(k.ad))]) if (!girisimHaritasi.has(a)) girisimHaritasi.set(a, g);
  }
  return girisimHaritasi.get(slugTr(ad));
}
const girisimSayfasi = (ad: string) => {
  const g = gecmisGirisim(ad);
  return g ? `/girisim/${g.slug}/` : undefined;
};

/** Künyedeki girişim ve platform adlarının sayfaları; sayfası üretilmeyen ad bağlantısız kalır. */
export function kunyeBaglantilari(
  haber: Haber,
  veri: { platformlar: PlatformSayfasi[]; kampanyalar: Kampanya[] },
): { girisim?: string; platform?: string } {
  const { girisim, platform } = haber.data;
  const out: { girisim?: string; platform?: string } = {};
  if (girisim) {
    const canli = veri.kampanyalar.find((k) => girisimEslesir(k, girisim));
    out.girisim = girisimSayfasi(girisim) ?? (canli ? `/kampanya/${canli.slug}/` : undefined);
  }
  const platformAdi = platform ?? (girisim ? gecmisGirisim(girisim)?.kampanyalar.at(-1)?.platform : undefined);
  if (platformAdi) {
    const p = veri.platformlar.find((x) => x.platform.slug === slugTr(platformAdi));
    if (p) out.platform = `/platform/${p.platform.slug}/`;
  }
  return out;
}

/**
 * Yayımlanacak çeyrek raporları (/rapor/, /rapor/YYYY-cN/ ve .png/.csv uçları), en yeni önce.
 * RAPOR_BUGUN=YYYY-AA-GG yalnız yerel denemede bugünü değiştirir (bitmemiş çeyreği bitmiş saymak için); CI'da tanımlı değildir.
 */
export async function yayimlananRaporlar(): Promise<{ news: Haber[]; raporlar: CeyrekOzeti[] }> {
  const { news, kayitlar } = await dizinVerisi();
  const bugun = process.env.RAPOR_BUGUN || istanbulGunu(new Date());
  const gunler = [...news.map((h) => istanbulGunu(h.data.date)), ...kayitlar.map((k) => k.tarih)];
  const raporlar = veriliCeyrekler(gunler)
    .map((c) => ceyrekOzeti(news, kayitlar, c, bugun))
    .filter((o) => o.yayimlanir);
  return { news, raporlar };
}
