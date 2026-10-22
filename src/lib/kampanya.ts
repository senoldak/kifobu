// Kampanya veritabanı (/kampanya/ ve /kampanya/<slug>/): günlük bültenin 18:00 kapanış kayıtlarından
// (src/data/arsiv/*.json) her kampanyanın künyesi ve günlük seyri çıkarılır. Rakam uydurulmaz: sayfada yalnız
// kayıtlarda olan değerler gösterilir. Saf TypeScript: birim testiyle sınanır.
import type { ArsivGirisim, ArsivKaydi } from './arsiv/tipler.ts';
import { slugTr } from './konular.ts';

export interface KampanyaGunu {
  tarih: string;
  sayi: number;
  bugun: number | null;
  alinan: number;
  yuzde: number;
  durum: string;
  veriAlinamadi: boolean;
  birikmis: boolean;
}

export interface Kampanya {
  slug: string;
  ad: string;
  /** PLATFORM_AYARLARI anahtarı (platform sayfasının adresi slugTr(platform)). */
  platform: string;
  url?: string;
  hedef: number;
  degerleme: number;
  ilkTarih: string;
  sonTarih: string;
  /** En son kayıttaki değerler. */
  son: ArsivGirisim;
  gunler: KampanyaGunu[];
}

const anahtar = (ad: string, platform: string) => `${slugTr(platform)}|${slugTr(ad)}`;

/** Kayıtlardan kampanya listesi; aynı adlı iki kampanya farklı platformdaysa adrese platform eklenir. */
export function kampanyalar(kayitlar: ArsivKaydi[]): Kampanya[] {
  const sirali = [...kayitlar].sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));
  const harita = new Map<string, Kampanya>();
  for (const k of sirali) {
    for (const g of k.girisimler) {
      const a = anahtar(g.ad, g.platform);
      let kp = harita.get(a);
      if (!kp) {
        kp = { slug: slugTr(g.ad), ad: g.ad, platform: g.platform, url: g.url, hedef: g.hedef, degerleme: g.degerleme, ilkTarih: k.tarih, sonTarih: k.tarih, son: g, gunler: [] };
        harita.set(a, kp);
      }
      kp.gunler.push({ tarih: k.tarih, sayi: k.sayi, bugun: g.bugun, alinan: g.alinan, yuzde: g.yuzde, durum: g.durum, veriAlinamadi: g.veriAlinamadi, birikmis: g.birikmis });
      kp.sonTarih = k.tarih;
      kp.son = g;
      kp.hedef = g.hedef;
      kp.degerleme = g.degerleme;
      if (g.url) kp.url = g.url;
    }
  }
  const liste = [...harita.values()];
  const sayac = new Map<string, number>();
  for (const kp of liste) sayac.set(kp.slug, (sayac.get(kp.slug) ?? 0) + 1);
  for (const kp of liste) if ((sayac.get(kp.slug) ?? 0) > 1) kp.slug = `${kp.slug}-${slugTr(kp.platform)}`;
  // En son görülen önce, sonra ada göre.
  return liste.sort((a, b) => (a.sonTarih < b.sonTarih ? 1 : a.sonTarih > b.sonTarih ? -1 : a.ad.localeCompare(b.ad, 'tr')));
}

/** Kampanyanın son kayıtta hedefe ulaşıp ulaşmadığı (kayıttaki yüzdeye göre). */
export const hedefeUlasti = (kp: Kampanya) => kp.son.yuzde >= 100;

/** Haberin künyesindeki girişim adı bu kampanyayla aynı mı? */
export const girisimEslesir = (kp: Kampanya, girisim?: string) => Boolean(girisim) && slugTr(girisim!) === slugTr(kp.ad);
