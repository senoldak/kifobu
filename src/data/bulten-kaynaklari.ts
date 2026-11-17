import type { ElListesi } from '../lib/kampanya-takip.ts';

/**
 * Günlük bülten ve canlı takip için kampanya ve platform kaynakları.
 * Kampanya listesi artık keşif dosyasından (kampanya-takip.json) gelir; elle müdahale EL_LISTESI ile yapılır.
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
  // Renkler platformun kendi sitesinin stilinden: startupburada .btn-default.primary (--Blue), birikimfon başlık düğmesi
  // (.header-style-two .btn-style-two), fongogo --ocean değişkeni.
  startupburada: { ad: 'startupburada', renk: '#2f41d1', url: 'https://www.startupburada.com' },
  birikimfon: { ad: 'birikimfon', renk: '#499bd4', url: 'https://birikimfon.com' },
  fongogo: { ad: 'fongogo', renk: '#052d43', url: 'https://yatirim.fongogo.com' },
};

/** Otomatik keşfe elle müdahale: ekle (listede görünmeyenler), çıkar (URL), düzelt (URL -> alan değişiklikleri). */
export const EL_LISTESI: ElListesi = {
  ekle: [
    { ad: 'NARPOS', platform: 'ardventure', url: 'https://ardventure.com', bolum: 'yakinda' },
    { ad: 'NEURATURK', platform: 'ardventure', url: 'https://ardventure.com', bolum: 'yakinda' },
  ],
  cikar: [],
  duzelt: {},
};
