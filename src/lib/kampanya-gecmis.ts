// Kapanmış kampanyalar (src/data/kampanya-gecmis.json, 2021–2026): /girisim/<slug>/ sayfaları ve kampanya dizinindeki
// "Bütün kampanyalar" tablosu. Aynı girişimin kampanyaları (turları) tek sayfada toplanır. Saf TypeScript; birim testli.
import { slugTr } from './konular.ts';

export interface GecmisKampanya {
  /** Girişimi tanıtan anahtar: aynı anahtarlı kampanyalar aynı girişimin turlarıdır. */
  anahtar: string;
  ad: string;
  /** Birden çok kampanyası olan girişimde 1'den başlayan tur sırası; tek kampanyada null. */
  tur: number | null;
  platform: string;
  durum: 'fonlandi' | 'fonlanamadi';
  baslangic: string;
  bitis: string | null;
  hedef: number;
  alinan: number;
  /** Kampanyada ilan edilen pay arz oranı (0–1). */
  payArz: number | null;
  yatirimci: number | null;
  nitelikli: number | null;
  sermaye: number | null;
  payFiyati: number | null;
  payGrubu: string | null;
  fonAktarim: string | null;
  sirket: string | null;
  url: string | null;
}

export interface GecmisGirisim {
  slug: string;
  ad: string;
  sirket: string | null;
  /** Başlangıç tarihine göre eskiden yeniye. */
  kampanyalar: GecmisKampanya[];
}

/** Gerçekleşme yüzdesi (100 = hedef). */
export const gerceklesme = (k: Pick<GecmisKampanya, 'hedef' | 'alinan'>) => (k.hedef > 0 ? (k.alinan / k.hedef) * 100 : null);

/** Fonlama sonrası değerleme: hedef ÷ ilan edilen pay arz oranı. */
export const degerleme = (k: Pick<GecmisKampanya, 'hedef' | 'payArz'>) => (k.payArz && k.payArz > 0 ? k.hedef / k.payArz : null);

/** Yatırımcı başına ortalama tutar. */
export const ortalamaYatirim = (k: Pick<GecmisKampanya, 'alinan' | 'yatirimci'>) => (k.yatirimci && k.yatirimci > 0 ? k.alinan / k.yatirimci : null);

/** Kampanyalardan girişim listesi. Aynı slug'a düşen farklı girişimlere platform eki verilir. */
export function gecmisGirisimler(kampanyalar: GecmisKampanya[]): GecmisGirisim[] {
  const gruplar = new Map<string, GecmisKampanya[]>();
  for (const k of kampanyalar) gruplar.set(k.anahtar, [...(gruplar.get(k.anahtar) ?? []), k]);
  const liste: GecmisGirisim[] = [...gruplar.values()].map((g) => {
    const sirali = [...g].sort((a, b) => (a.baslangic < b.baslangic ? -1 : a.baslangic > b.baslangic ? 1 : 0));
    const son = sirali[sirali.length - 1];
    return { slug: slugTr(son.ad), ad: son.ad, sirket: [...sirali].reverse().find((k) => k.sirket)?.sirket ?? null, kampanyalar: sirali };
  });
  const sayac = new Map<string, number>();
  for (const g of liste) sayac.set(g.slug, (sayac.get(g.slug) ?? 0) + 1);
  for (const g of liste) if ((sayac.get(g.slug) ?? 0) > 1) g.slug = `${g.slug}-${slugTr(g.kampanyalar[0].platform)}`;
  return liste.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

/** Kampanyanın girişim sayfasındaki çapası (tur bölümü). */
export const kampanyaCapasi = (k: Pick<GecmisKampanya, 'tur'>) => (k.tur ? `#tur-${k.tur}` : '');
