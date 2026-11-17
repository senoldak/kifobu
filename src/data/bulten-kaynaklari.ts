import type { ElListesi } from '../lib/kampanya-takip.ts';

/**
 * Günlük bülten ve canlı takip için kampanya ve platform kaynakları.
 * Kampanya listesi artık keşif dosyasından (kampanya-takip.json) gelir; elle müdahale EL_LISTESI ile yapılır.
 */

export interface KampanyaKaynagi {
  ad: string;
  /** Platform anahtarı (PLATFORM_AYARLARI): fonangels, trinkfon, ecofolio, fonventure, startupburada, birikimfon, fongogo, fonbulucu, ardventure ... */
  platform: string;
  url: string;
  /** Kampanya hedeflenen fon tutarı (TL) */
  hedefFon: number;
  /** Şirket değerlemesi (TL) */
  degerleme: number;
  /** Zorunlu durum override (örn. 'SONA ERDİ', 'İPTAL EDİLDİ', 'GERİ ÇEKİLDİ' ise siteden çekilse bile durum sabitlenir) */
  sabitDurum?: string;
  /** Eğer fonlama bittiyse true */
  tamamlandi?: boolean;
  /** Takip dosyasında en son okunan toplanan tutar; sayfa okunamayınca referansın da yoksa yedek olarak kullanılır. */
  sonToplanan?: number;
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
  // fonbulucu rengi: sitenin home_v2.css dosyasındaki --hv2-primary (rgb(229, 36, 62)); pay platformudur, borç platformu ayrı adrestedir.
  fonbulucu: { ad: 'fonbulucu', renk: '#e5243e', url: 'https://invest.fonbulucu.com' },
};

/** Otomatik keşfe elle müdahale: ekle (listede görünmeyenler), çıkar (URL), düzelt (URL -> alan değişiklikleri). */
export const EL_LISTESI: ElListesi = {
  ekle: [
    { ad: 'NARPOS', platform: 'ardventure', url: 'https://ardventure.com', bolum: 'yakinda' },
    { ad: 'NEURATURK', platform: 'ardventure', url: 'https://ardventure.com', bolum: 'yakinda' },
    // Biten kampanyalar bültende "SONA ERDİ" olarak bir süre kalsın (sahibinin isteği, 18 Kasım). Arşiv kaydı ayrı, etkilenmez.
    { ad: 'ATHLETICLABS', platform: 'fonangels', url: 'https://fonangels.com/kampanyalar/projehakkinda/athleticlabs?pid=1689', bolum: 'aktif', hedef: 7_500_000, degerleme: 75_000_000 },
    { ad: 'OYLİO', platform: 'fonangels', url: 'https://fonangels.com/kampanyalar/projehakkinda/oylio?pid=1778', bolum: 'aktif', hedef: 5_000_000, degerleme: 50_000_000 },
    { ad: 'LOOPYON', platform: 'ecofolio', url: 'https://ecofolio.com.tr/kampanyalar/loopyon', bolum: 'aktif', hedef: 35_000_000, degerleme: 385_000_000 },
  ],
  // Platformda yıllar önce kalmış ön talep kartları: bültene alınmaz.
  cikar: [
    'https://yatirim.fongogo.com/ProjectDetail/PreliminaryInformation?URLKey=esebze-2',
    'https://yatirim.fongogo.com/ProjectDetail/PreliminaryInformation?URLKey=BioCoderTeknoloji',
  ],
  // fonbulucu "yakında" kartlarında girişim adı yalnız logoda; kart başlığı kategori (18 Kasım, sahibinin ekran görüntüsünden).
  duzelt: {
    'https://invest.fonbulucu.com/#yakinda-dijital-ikiz-platformu': { ad: 'TWINUP' },
    'https://invest.fonbulucu.com/#yakinda-akilli-yuzeyler': { ad: 'DEXCOOK' },
    'https://invest.fonbulucu.com/#yakinda-giyilebilir-saglik': { ad: 'MEDICALTEX' },
    // LOOPYON'un sayfası bitti demiyor ama bitişi 15 Kasım'da geçti.
    'https://ecofolio.com.tr/kampanyalar/loopyon': { durum: 'bitti' },
  },
};
