// Standartlar: her haber sayfasının sonundaki yapay zekâ notu ve "Hata bildir" bağlantısı.
// Bot haberleri (uretim: yapay-zeka) tek satırlık otomatik yazı notunu alır. Sahibin adıyla çıkan yazılar (yazar
// "Şenol Dak" ya da yazı türü dolu: analiz, açıklayıcı, referans) "Bu yazı nasıl hazırlandı" satırlarını alır;
// uretim yazi-isleri olsa da. Zincir notu yalnız sahibin olmayan yazi-isleri yazıları için kalır.
// Not yalnız görünür metindir; yapısal veriye (JSON-LD) girmez.
import { VARSAYILAN_YAZI_TURU, analizMi, type YaziTuru } from './yazi-turu.ts';

export const HATA_ADRESI = 'contact@kifobu.com';
export const SAHIP_YAZARI = 'Şenol Dak';
export const ZINCIR_URETIMI = 'yazi-isleri';
export const BOT_NOTU = 'Bu haber yapay zekâ ile otomatik yazıldı ve otomatik denetimden geçti.';
// Kısa özet (rapor); haber sayfasında NASIL_SATIRLAR gösterilir.
export const SAHIP_NOTU =
  'Yazıyı yazar kendisi yazdı; yapay zekâ araçları yalnız imla ve dil düzeltmesinde kullanıldı. Bütün rakamlar resmî kaynaklardan alındı ve yazar ile program tarafından kontrol edildi.';
export const ZINCIR_NOTU =
  'Bu yazı yapay zekâ araçlarıyla yazıldı. Rakamlar ve alıntılar resmî kaynaklarla karşılaştırıldı; yazı yayından önce editör tarafından okunup onaylandı.';
export const BAGLANTI_METNI = 'Hata bildir →';

export interface NasilSatiri {
  etiket: string;
  metin: string;
  baglanti?: { parca: string; adres: string };
}
export const NASIL_BASLIK = 'Bu yazı nasıl hazırlandı';
export const NASIL_SATIRLAR: NasilSatiri[] = [
  {
    etiket: 'Yazar',
    metin: `Yazıyı kifobu yayıncısı ve editörü ${SAHIP_YAZARI} yazdı. Konu, veri ve bakış açısı seçimi ile bütün hesaplamalar yazara aittir.`,
  },
  {
    etiket: 'Dil ve yapay zekâ',
    metin:
      'Yapay zekâ araçları yalnız imla ve dil düzeltmesinde kullanıldı; içerik, bakış açısı ya da rakamlar için kullanılmadı ve hiçbir zaman kaynak olarak kullanılmaz.',
  },
  {
    etiket: 'Rakamlar ve kaynaklar',
    metin:
      'Bütün rakamlar resmî kaynaklardan alındı; kaynaklar “Kaynaklar” bölümünde listelenir. Rakamlar yayından önce hem yazar hem program tarafından kaynaklarla karşılaştırıldı.',
  },
];
export const YONTEM_SATIRI: NasilSatiri = { etiket: 'Yöntem', metin: 'Hesaplamalar “Nasıl hesapladık” bölümünde açıklanır.' };
export const ILKE_SATIRI: NasilSatiri = {
  etiket: 'İlkeler',
  metin: 'Yazı, yayın ilkelerimize göre hazırlandı.',
  baglanti: { parca: 'yayın ilkelerimize', adres: '/yayin-ilkeleri/' },
};
export const YZ_SAYFASI = { metin: 'Yapay zekâyı nasıl kullanıyoruz →', adres: '/yapay-zeka-kullanimi/' };

export interface YapayZekaNotu {
  tur: 'bot' | 'sahip' | 'zincir';
  metin: string;
  baglantiMetni: string;
  mailto: string;
  // Sahibin yazısında "Bu yazı nasıl hazırlandı" satırları (analizde yöntem satırı da); ötekilerde yok.
  satirlar?: NasilSatiri[];
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
  const mailto = hataBildirMailto(baslik, adres);
  const sahip = veri.author === SAHIP_YAZARI || (veri.yaziTuru !== undefined && veri.yaziTuru !== VARSAYILAN_YAZI_TURU);
  if (sahip) {
    const yontem = analizMi({ yaziTuru: veri.yaziTuru as YaziTuru }) ? [YONTEM_SATIRI] : [];
    return { tur: 'sahip', metin: SAHIP_NOTU, baglantiMetni: BAGLANTI_METNI, mailto, satirlar: [...NASIL_SATIRLAR, ...yontem, ILKE_SATIRI] };
  }
  if (veri.uretim === ZINCIR_URETIMI) return { tur: 'zincir', metin: ZINCIR_NOTU, baglantiMetni: BAGLANTI_METNI, mailto };
  if (veri.uretim !== 'yapay-zeka') return null;
  return { tur: 'bot', metin: BOT_NOTU, baglantiMetni: BAGLANTI_METNI, mailto };
}
