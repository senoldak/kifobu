// Günlük bülten paylaşımları (Telegram, LinkedIn): bağlantı kanala göre UTM'li olur ve o günün kalıcı sayfası
// canlıdaysa oraya gider; değilse genel bülten sayfasına düşer. Saf TypeScript: ağ isteği enjekte edilebilir.
import { gunUrl, istanbulGunu } from './gunler.ts';

export const SITE_ORIGIN = 'https://kifobu.com';
export const GENEL_BULTEN_URL = `${SITE_ORIGIN}/gunluk-bulten/`;
export type PaylasimKanali = 'telegram' | 'linkedin';

/** Metindeki bülten bağlantısı (bulten-gorsel-uret.ts genel adresi yazar). */
const BAGLANTI_DESENI = /https:\/\/kifobu\.com\/gunluk-bulten\/\S*/;

/** Bağlantıya kanala özgü UTM parametrelerini ekler. */
export function utmEkle(url: string, kanal: PaylasimKanali): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', kanal);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', 'gunluk-bulten');
  return u.toString();
}

/** Metindeki bülten bağlantısını verilen adresle değiştirir. Bağlantı yoksa metin aynen döner. */
export function metinBaglantisiniDegistir(metin: string, url: string): string {
  return metin.replace(BAGLANTI_DESENI, () => url);
}

/** Facebook/Instagram metni bağlantısız gider: bülten bağlantısının bulunduğu satır çıkarılır. */
export function metinBaglantisiniCikar(metin: string): string {
  return metin
    .split('\n')
    .filter((satir) => !BAGLANTI_DESENI.test(satir))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** public/'teki günlük görselin adresi. Dosya adı her gün aynı olduğu için Meta eski kopyayı çekmesin diye gün eklenir. */
export function gorselAdresi(dosya: string, tarih: string = istanbulGunu(new Date())): string {
  return `${SITE_ORIGIN}/${dosya}?v=${tarih}`;
}

/** O günün kalıcı sayfası canlıda mı (HEAD, 200 ise evet). Ağ hatasında hayır. */
export async function gunSayfasiCanliMi(tarih: string, istek: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await istek(`${SITE_ORIGIN}${gunUrl(tarih)}`, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

/** Kanal için paylaşılacak bağlantı: canlıdaki gün sayfası (UTM'li), yoksa genel bülten sayfası (UTM'li). */
export async function bultenBaglantisi(
  kanal: PaylasimKanali,
  tarih: string = istanbulGunu(new Date()),
  istek: typeof fetch = fetch,
): Promise<{ url: string; gunSayfasi: boolean }> {
  const gunSayfasi = await gunSayfasiCanliMi(tarih, istek);
  const hedef = gunSayfasi ? `${SITE_ORIGIN}${gunUrl(tarih)}` : GENEL_BULTEN_URL;
  return { url: utmEkle(hedef, kanal), gunSayfasi };
}
