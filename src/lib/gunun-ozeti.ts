// Telegram Günün Özeti: gün sayfası (/gunun-ozeti/YYYY-AA-GG/) ve kapağı. Paragrafı 20:45 işi yazar
// (scripts/bot/gunun-ozeti-is.mjs → src/data/gunun-ozeti/<tarih>.json); sayfa yalnız kaydı olan günler için üretilir.
import { kapakSirasi, trTarih } from '../../scripts/bot/gunun-ozeti.mjs';

export interface OzetKaydi {
  tarih: string;
  paragraf: string;
  kimlikler: string[];
  yazan: 'gemini' | 'yedek';
  olusturma: string;
}

interface Aday {
  id: string;
  data: { title: string; date: Date };
}

/** import.meta.glob('/src/data/gunun-ozeti/*.json', { eager: true, import: 'default' }) çıktısı → en yeni gün önce. */
export function ozetKayitlari(modul: Record<string, unknown>): OzetKaydi[] {
  return (Object.values(modul) as OzetKaydi[]).sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
}

/** Sayfanın ve kapağın verisi. gun: gunler.ts'in o günü (haberler en yeniden eskiye); yoksa boş gün. */
export function ozetSayfasi<T extends Aday>(kayit: OzetKaydi, gun: { haberler: T[]; bultenler: T[] } | undefined) {
  const haberler = gun?.haberler ?? [];
  const yayinSirasi = [...haberler].sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf());
  const tarihAd = trTarih(kayit.tarih);
  return {
    tarihAd,
    baslik: `Günün Özeti · ${tarihAd}`,
    haberler,
    bultenler: gun?.bultenler ?? [],
    kapakBasliklari: kapakSirasi(yayinSirasi, kayit.kimlikler).map((h: T) => h.data.title),
    toplam: haberler.length,
  };
}

export const ozetUrl = (tarih: string) => `/gunun-ozeti/${tarih}/`;
export const ozetKapakUrl = (tarih: string) => `/kapak/gunun-ozeti/${tarih}.png`;
