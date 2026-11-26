// Bireysel katılım yatırımcısı (BKY) vergi indirimi hesaplama motoru.
// Dayanak (26 Kasım 2026'da kontrol edildi):
//  - GVK Geçici 82. madde: GİB, 2026 Yılı Gelir Vergisi Rehberi, 4.4.6 Bireysel Katılım Yatırımcısı İndirimi
//    (https://intvrg.gib.gov.tr/hazirbeyan/assets/pdf/DUYURU_UNIVERSAL_2026_2026_Ucret_Geliri.pdf). İndirim yalnız Hazine
//    ve Maliye Bakanlığı'ndan lisans almış BKY'lere tanınır; paya dayalı kitle fonlaması platformu yatırımı bu madde
//    kapsamında değildir. %75; projesi son beş yılda Sanayi ve Teknoloji Bakanlığı, TÜBİTAK ya da KOSGEB programında
//    desteklenmiş şirketlerde %100. Hisseler en az iki tam yıl elde tutulur. 31/12/2027'ye kadar.
//  - Hazine ve Maliye Bakanlığı, BKS Sistemi Eğitim Sunumu, 11.05.2026: yıllık vergi indirim tutarı 2.500.000 TL'yi
//    aşamaz; şirket başına yatırım 2026 için en az 250.980 TL.
//  - 2026 gelir vergisi tarifesi: 332 Seri No.lu GVK Genel Tebliği (GİB rehberi s. 48).

export const YILLIK_AZAMI_TAVAN = 2_500_000; // TL, yıllık indirim tavanı
export const ASGARI_YATIRIM_2026 = 250_980; // TL, girişim şirketi başına
export const ORANLAR = { standart: 0.75, arge: 1.0 } as const;

export type GelirTuru = 'ucretDisi' | 'ucret';
export type OranTuru = keyof typeof ORANLAR;

// 2026 tarifesi: [üst sınır, oran]; ücret gelirlerinde %27 dilimi 1.500.000 TL'ye kadar uzar.
const TARIFE_2026: Record<GelirTuru, [number, number][]> = {
  ucretDisi: [
    [190_000, 0.15],
    [400_000, 0.2],
    [1_000_000, 0.27],
    [5_300_000, 0.35],
    [Infinity, 0.4],
  ],
  ucret: [
    [190_000, 0.15],
    [400_000, 0.2],
    [1_500_000, 0.27],
    [5_300_000, 0.35],
    [Infinity, 0.4],
  ],
};

/** 2026 tarifesine göre gelir vergisi (kademeli). */
export function gelirVergisi2026(matrah: number, tur: GelirTuru = 'ucretDisi'): number {
  let vergi = 0;
  let alt = 0;
  for (const [ust, oran] of TARIFE_2026[tur]) {
    if (matrah <= alt) break;
    vergi += (Math.min(matrah, ust) - alt) * oran;
    alt = ust;
  }
  return Math.round(vergi * 100) / 100;
}

export interface BkyGirdisi {
  yatirimTutari: number;
  beyanMatrahi: number; // yıllık beyannamedeki gelir vergisi matrahı (indirimden önce)
  oranTuru: OranTuru;
  gelirTuru?: GelirTuru;
}

export interface BkySonucu {
  uygulananOran: number;
  hamIndirim: number;
  indirim: number; // matrahtan düşülebilen tutar
  tavanaTakildi: boolean; // 2.500.000 TL yıllık tavan
  matrahaTakildi: boolean; // indirim beyan matrahını aşamaz
  asgariAltinda: boolean; // şirket başına asgari yatırımın altında
  vergiOnce: number;
  vergiSonra: number;
  vergiFarki: number;
  efektifOran: number; // vergi farkı / yatırım, yüzde
}

export function bkyIndirimiHesapla(g: BkyGirdisi): BkySonucu {
  const yatirim = Math.max(0, g.yatirimTutari || 0);
  const matrah = Math.max(0, g.beyanMatrahi || 0);
  const tur = g.gelirTuru ?? 'ucretDisi';
  const uygulananOran = ORANLAR[g.oranTuru] ?? ORANLAR.standart;
  const hamIndirim = yatirim * uygulananOran;
  const indirim = Math.min(hamIndirim, YILLIK_AZAMI_TAVAN, matrah);
  const vergiOnce = gelirVergisi2026(matrah, tur);
  const vergiSonra = gelirVergisi2026(matrah - indirim, tur);
  const vergiFarki = Math.round((vergiOnce - vergiSonra) * 100) / 100;
  return {
    uygulananOran,
    hamIndirim,
    indirim,
    tavanaTakildi: hamIndirim > YILLIK_AZAMI_TAVAN && YILLIK_AZAMI_TAVAN <= matrah,
    matrahaTakildi: hamIndirim > matrah && matrah < YILLIK_AZAMI_TAVAN,
    asgariAltinda: yatirim > 0 && yatirim < ASGARI_YATIRIM_2026,
    vergiOnce,
    vergiSonra,
    vergiFarki,
    efektifOran: yatirim > 0 ? Math.round((vergiFarki / yatirim) * 10000) / 100 : 0,
  };
}
