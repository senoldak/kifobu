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
  /** Detay için ek sayfalar: çağıran ana sayfayı ve bunları getirir, tüm HTML'i "\n" ile birleştirip detay()'a verir. */
  ekSayfalar?(url: string): string[];
}

/**
 * Bir kampanya adresinin kararlı kimliği: küçük harfli host ve yol, sondaki "/" atılmış;
 * sorgudan yalnız kimlik taşıyan `pid` ve `urlkey` kalır (ad ve değer küçük harf), gerisi (utm vb.) düşer.
 */
export function urlAnahtari(url: string): string {
  const u = new URL(url);
  const yol = u.pathname.toLowerCase().replace(/\/+$/, '');
  const kalan = [...u.searchParams.entries()]
    .map(([ad, deger]) => [ad.toLowerCase(), deger.toLowerCase()] as const)
    .filter(([ad]) => ad === 'pid' || ad === 'urlkey')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const sorgu = kalan.map(([ad, deger]) => `${ad}=${deger}`).join('&');
  return `${u.hostname.toLowerCase()}${yol}${sorgu ? `?${sorgu}` : ''}`;
}
