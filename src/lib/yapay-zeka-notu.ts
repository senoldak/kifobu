// Standartlar: her haber sayfasının sonundaki tek satırlık yapay zekâ notu ve "Hata bildir" bağlantısı.
// Bot haberleri (uretim: yapay-zeka) otomatik yazı notunu, sahibin adıyla çıkan yazılar (yazar "Şenol Dak" ya da
// yazı türü dolu) araç kullanımı notunu alır. Yazı işleri zincirinin yazısı (uretim: yazi-isleri; yerleştirme yazar)
// her kuraldan önce zincir notunu alır: yazı türü dolu ya da yazar Şenol Dak olsa da dil düzeltmesi notunu almaz.
// Not yalnız görünür metindir; yapısal veriye (JSON-LD) girmez.
import { VARSAYILAN_YAZI_TURU } from './yazi-turu.ts';

export const HATA_ADRESI = 'contact@kifobu.com';
export const SAHIP_YAZARI = 'Şenol Dak';
export const ZINCIR_URETIMI = 'yazi-isleri';
export const BOT_NOTU = 'Bu haber yapay zekâ ile otomatik yazıldı ve otomatik denetimden geçti.';
export const SAHIP_NOTU = 'Yazım ve dil düzeltmesinde yapay zekâ araçları kullanıldı. Bütün rakamlar resmî kaynaklardan alındı ve kontrol edildi.';
export const ZINCIR_NOTU =
  'Bu yazı yapay zekâ araçlarıyla yazıldı. Rakamlar ve alıntılar resmî kaynaklarla karşılaştırıldı; yazı yayından önce editör tarafından okunup onaylandı.';
export const BAGLANTI_METNI = 'Hata bildir →';

export interface YapayZekaNotu {
  tur: 'bot' | 'sahip' | 'zincir';
  metin: string;
  baglantiMetni: string;
  mailto: string;
}

interface Veri {
  uretim?: string;
  author?: string;
  yaziTuru?: string;
}

export function hataBildirMailto(baslik: string, adres: string): string {
  const konu = encodeURIComponent(`Hata bildirimi: ${baslik}`);
  return `mailto:${HATA_ADRESI}?subject=${konu}&body=${encodeURIComponent(adres)}`;
}

export function yapayZekaNotu(veri: Veri, baslik: string, adres: string): YapayZekaNotu | null {
  if (veri.uretim === ZINCIR_URETIMI) {
    return { tur: 'zincir', metin: ZINCIR_NOTU, baglantiMetni: BAGLANTI_METNI, mailto: hataBildirMailto(baslik, adres) };
  }
  const sahip = veri.author === SAHIP_YAZARI || (veri.yaziTuru !== undefined && veri.yaziTuru !== VARSAYILAN_YAZI_TURU);
  const bot = veri.uretim === 'yapay-zeka';
  if (!sahip && !bot) return null;
  return { tur: sahip ? 'sahip' : 'bot', metin: sahip ? SAHIP_NOTU : BOT_NOTU, baglantiMetni: BAGLANTI_METNI, mailto: hataBildirMailto(baslik, adres) };
}
