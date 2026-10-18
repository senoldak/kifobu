/**
 * Günlük bülten ve canlı takip için kampanya ve platform kaynakları.
 * Yeni kampanya başladığında veya bittiğinde sadece bu listeyi güncelleyebilirsiniz.
 */

export interface KampanyaKaynagi {
  ad: string;
  platform: 'fonangels' | 'trinkfon' | 'ecofolio' | 'fonventure' | 'ardventure' | string;
  url: string;
  /** Kampanya hedeflenen fon tutarı (TL) */
  hedefFon: number;
  /** Şirket değerlemesi (TL) */
  degerleme: number;
  /** Zorunlu durum override (örn. 'SONA ERDİ', 'İPTAL EDİLDİ', 'GERİ ÇEKİLDİ' ise siteden çekilse bile durum sabitlenir) */
  sabitDurum?: string;
  /** Eğer fonlama bittiyse true */
  tamamlandi?: boolean;
}

export interface PlatformAyar {
  ad: string;
  renk: string;
  url?: string;
}

export const PLATFORM_AYARLARI: Record<string, PlatformAyar> = {
  fonangels: { ad: 'fonangels', renk: '#f47b3d', url: 'https://fonangels.com' },
  trinkfon: { ad: 'trinkfon', renk: '#7c3aed', url: 'https://kfs.trinkfon.com' },
  ecofolio: { ad: 'ecofolio', renk: '#009bae', url: 'https://ecofolio.com.tr' },
  fonventure: { ad: 'fonventure', renk: '#4f46e5', url: 'https://fonventure.com' },
  ardventure: { ad: 'ardventure', renk: '#e07a5f', url: 'https://ardventure.com' },
};

export const AKTIF_KAMPANYALAR: KampanyaKaynagi[] = [
  {
    ad: 'ATHLETICLABS',
    platform: 'fonangels',
    url: 'https://fonangels.com/kampanyalar/projehakkinda/athleticlabs?pid=1689',
    hedefFon: 7_500_000,
    degerleme: 75_000_000,
    sabitDurum: 'SONA ERDİ',
    tamamlandi: true,
  },
  {
    ad: 'OYLİO',
    platform: 'fonangels',
    url: 'https://fonangels.com/kampanyalar/projehakkinda/oylio?pid=1778',
    hedefFon: 5_000_000,
    degerleme: 50_000_000,
  },
  {
    ad: 'PUPAQ',
    platform: 'trinkfon',
    url: 'https://kfs.trinkfon.com/projeler/pupaq/kampanya/',
    hedefFon: 1_000_032,
    degerleme: 25_000_800,
  },
  {
    ad: 'LOOPYON',
    platform: 'ecofolio',
    url: 'https://ecofolio.com.tr/kampanyalar/loopyon',
    hedefFon: 35_000_000,
    degerleme: 385_038_504,
  },
];

export const YAKINDA_LISTESI = [
  { ad: 'NARPOS', platform: 'ardventure', url: 'https://ardventure.com' },
  { ad: 'NEURATURK', platform: 'ardventure', url: 'https://ardventure.com' },
];
