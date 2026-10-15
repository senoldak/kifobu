// Konu, platform, kampanya ve bülten günü sayfalarının ortak verisi (Astro tarafı). Kurallar saf modüllerde:
// src/lib/konular.ts, kampanya.ts, gunler.ts. Bu dosya yalnız içerik koleksiyonunu ve arşiv kayıtlarını bağlar.
import { getNews, type Haber } from './news';
import { arsivKayitlari } from './arsiv/yukle.ts';
import { kampanyalar, girisimEslesir, type Kampanya } from './kampanya.ts';
import { platformHaberleri, platformlar, platformSayfasi, platformEslesir, slugTr, yayimlananKonular, type Konu, type Platform } from './konular.ts';
import { bultenGunleri } from './gunler.ts';

export interface PlatformSayfasi {
  platform: Platform;
  haberler: Haber[];
  kampanyalar: Kampanya[];
  indeks: boolean;
}

export async function dizinVerisi() {
  const news = await getNews();
  const kayitlar = arsivKayitlari();
  const kps = kampanyalar(kayitlar);
  const konular = yayimlananKonular(news);
  const plats: PlatformSayfasi[] = platformlar(news.map((h) => h.data.platform).filter((x): x is string => Boolean(x)))
    .map((platform) => {
      const haberler = platformHaberleri(platform, news);
      const pk = kps.filter((k) => slugTr(k.platform) === platform.slug);
      const { uret, indeks } = platformSayfasi(haberler.length, pk.length);
      return uret ? { platform, haberler, kampanyalar: pk, indeks } : undefined;
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
