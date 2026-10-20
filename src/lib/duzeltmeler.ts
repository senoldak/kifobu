// Düzeltmeler sayfasının kayıt listesi: haberlerin `duzeltme` alanı + kaldırılan yazıların kaydı
// (src/data/duzeltmeler-kaldirilan.json). İkisi birleşir, en yeniden eskiye sıralanır.
import { DUZELTME_EN_AZ } from './duzeltme.ts';

export interface KaldirilanKayit {
  /** Kaldırılma tarihi, YYYY-AA-GG. */
  tarih: string;
  /** İlk yayın tarihi, YYYY-AA-GG. */
  ilkYayin?: string;
  /** Başlık; kişi hakları nedeniyle kaldırılanlarda boş bırakılır. */
  baslik?: string;
  /** Kısa neden. */
  neden: string;
}

export interface DuzeltmeKaydi {
  /** Sıralama anahtarı: YYYY-AA-GG. */
  tarih: string;
  tur: 'Düzeltme' | 'Yayından kaldırıldı';
  baslik?: string;
  href?: string;
  metin: string;
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export function tarihYazi(iso: string) {
  const [y, a, g] = iso.split('-').map(Number);
  return `${g} ${AYLAR[a - 1]} ${y}`;
}

/** "20.10.2026 14:00: not" ya da "20.10.2026: not" -> tarih ve not metni; başında tarih yoksa yedek tarih kullanılır. */
export function notuAyir(not: string, yedekTarih: string) {
  const m = not.match(/^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+\d{1,2}:\d{2})?\s*:\s*([\s\S]+)$/);
  if (!m) return { tarih: yedekTarih, metin: not.trim() };
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return { tarih: iso, metin: m[4].trim() };
}

export function duzeltmeKayitlari(
  haberler: Array<{ baslik: string; href: string; duzeltme?: string; yedekTarih: string }>,
  kaldirilan: KaldirilanKayit[],
): DuzeltmeKaydi[] {
  const out: DuzeltmeKaydi[] = [];
  for (const h of haberler) {
    if (!h.duzeltme || h.duzeltme.length < DUZELTME_EN_AZ) continue;
    const { tarih, metin } = notuAyir(h.duzeltme, h.yedekTarih);
    out.push({ tarih, tur: 'Düzeltme', baslik: h.baslik, href: h.href, metin });
  }
  for (const k of kaldirilan) {
    const ilk = k.ilkYayin ? ` (ilk yayın ${tarihYazi(k.ilkYayin)})` : '';
    out.push({ tarih: k.tarih, tur: 'Yayından kaldırıldı', baslik: k.baslik, metin: `${k.neden}${ilk}` });
  }
  return out.sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0));
}
