// Kitle Fonlaması ve Bireysel Katılım Yatırımcısı (BKY) Vergi İndirimi Hesaplama Motoru
// GVK Geçici 82. Madde ve 4691/5746 sayılı kanunlar kapsamında vergi matrahı indirimi

export const YILLIK_AZAMI_TAVAN = 2_500_000; // TL (Mevzuat üst sınırı)

export interface VergiIstisnasiGirdisi {
  yatirimTutari: number;
  yillikBeyanGeliri: number;
  projeTuru: 'standart' | 'arge';
  vergiDilimi?: number;
}

export interface VergiIstisnasiSonucu {
  yatirimTutari: number;
  yillikBeyanGeliri: number;
  projeTuru: 'standart' | 'arge';
  uygulananOran: number;
  hamIndirimTutari: number;
  gelirTavanSiniri: number;
  yillikAzamiSinir: number;
  uygulanabilirMatrahIndirimi: number;
  tavanAsildiMi: boolean;
  marjinalVergiOrani: number;
  netVergiAvantaji: number;
  netYatirimMaliyeti: number;
  efektifDestekOrani: number;
  asgariEldeTutmaSuresiAy: number;
}

/**
 * Gelir Vergisi Kanunu 103. madde gelir vergisi tarifesine göre
 * tahmini marjinal vergi dilimini belirler.
 */
export function vergiDilimiBul(gelir: number): number {
  if (gelir <= 158_000) return 0.15;
  if (gelir <= 330_000) return 0.20;
  if (gelir <= 800_000) return 0.27;
  if (gelir <= 4_300_000) return 0.35;
  return 0.40;
}

/**
 * Kitle fonlaması pay iktisaplarında yararlanılabilecek
 * vergi matrahı indirimi ve net vergi iadesi tutarını hesaplar.
 */
export function vergiIstisnasiHesapla(girdi: VergiIstisnasiGirdisi): VergiIstisnasiSonucu {
  const { yatirimTutari, yillikBeyanGeliri, projeTuru } = girdi;
  
  const uygulananOran = projeTuru === 'arge' ? 1.0 : 0.75;
  const hamIndirimTutari = yatirimTutari * uygulananOran;
  
  // Gelir Vergisi beyannamesinde bildirilen gelirin %10'u tavanı
  const gelirTavanSiniri = Math.max(0, yillikBeyanGeliri * 0.10);
  
  // Kanuni yıllık azami tavan ve gelir tavanı kontrolü
  const ustSinir = Math.min(gelirTavanSiniri, YILLIK_AZAMI_TAVAN);
  const uygulanabilirMatrahIndirimi = Math.min(hamIndirimTutari, ustSinir);
  const tavanAsildiMi = hamIndirimTutari > ustSinir;
  
  const marjinalVergiOrani = girdi.vergiDilimi !== undefined 
    ? girdi.vergiDilimi 
    : vergiDilimiBul(yillikBeyanGeliri);
    
  const netVergiAvantaji = Math.round(uygulanabilirMatrahIndirimi * marjinalVergiOrani * 100) / 100;
  const netYatirimMaliyeti = Math.round((yatirimTutari - netVergiAvantaji) * 100) / 100;
  const efektifDestekOrani = yatirimTutari > 0 
    ? Math.round((netVergiAvantaji / yatirimTutari) * 10000) / 100 
    : 0;

  return {
    yatirimTutari,
    yillikBeyanGeliri,
    projeTuru,
    uygulananOran,
    hamIndirimTutari,
    gelirTavanSiniri,
    yillikAzamiSinir: YILLIK_AZAMI_TAVAN,
    uygulanabilirMatrahIndirimi,
    tavanAsildiMi,
    marjinalVergiOrani,
    netVergiAvantaji,
    netYatirimMaliyeti,
    efektifDestekOrani,
    asgariEldeTutmaSuresiAy: 24
  };
}
