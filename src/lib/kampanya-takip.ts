/** Kampanya keşfi ve takibi için ortak tipler. */

export type Bolum = 'aktif' | 'yakinda';

/** Platformun liste sayfasında görülen tek kampanya. */
export interface ListeKaydi {
  ad: string;
  url: string;
  bolum: Bolum;
}

/** Kampanya sayfasından okunan sayılar. Okunamayan alan null olur, asla 0 olmaz. */
export interface KampanyaDetay {
  /** Girişim adı (detay sayfasından); okunamazsa null. */
  ad: string | null;
  hedef: number | null;
  arzOrani: number | null;
  degerleme: number | null;
  baslangic: string | null;
  bitis: string | null;
  toplanan: number | null;
  yatirimci: number | null;
  nitelikli: number | null;
  kalanGun: number | null;
  sonGun: boolean;
  bitti: boolean;
  fonlandi: boolean | null;
}

/** Saf okuyucu: HTML metni alır, kayıt döndürür; ağ erişimi başka yerde yapılır. */
export interface Okuyucu {
  platform: string;
  listeUrller: string[];
  liste(html: string, listeUrl: string): ListeKaydi[];
  detay(html: string): KampanyaDetay;
}
