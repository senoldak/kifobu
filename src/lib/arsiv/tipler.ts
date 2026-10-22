export type Donem = 'gun' | 'hafta' | 'ay';

export interface ArsivGirisim {
  ad: string;
  platform: string;
  url?: string;
  bugun: number | null; // null: başlangıç günü, ilk görülme veya veri alınamadı
  alinan: number;
  kalan: number | null;
  hedef: number;
  degerleme: number;
  yuzde: number;
  durum: string;
  veriAlinamadi: boolean;
  birikmis: boolean;
}

export interface ArsivPlatform {
  anahtar: string;
  ad: string;
  renk: string;
  bugun: number;
  toplam: number;
}

export interface ArsivKaydi {
  tarih: string;
  sayi: number;
  baslangic: boolean;
  girisimler: ArsivGirisim[];
  platformlar: ArsivPlatform[];
}
