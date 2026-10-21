// Kapak PNG önbelleği (ücretsiz plan denetimi C1, 21 Ekim). jendume'deki src/lib/kapak-onbellek.mjs ile aynı.
//
// Kapaklar repoda durmaz, her derlemede SVG'den çizilir; ~200 kapak derlemenin ~15 saniyesini (%75) alıyordu ve
// haber sayısıyla doğrusal büyüyordu (Kasım'da yayın başına 2, Aralık'ta 3 dk faturalanacaktı). Aynı SVG her zaman
// aynı PNG'yi verdiğinden görsel bir kez çizilir ve SVG'nin özetiyle adlandırılıp .kapak-onbellek/ altına yazılır;
// sonraki derleme önce oraya bakar. Klasör repoya girmez (.gitignore); GitHub Actions'ta actions/cache ile yayınlar
// arasında saklanır (yayinla.yml). Tasarım (src/kapak/**) değişince cache anahtarı değişir ve hepsi yeniden çizilir.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Önbellek klasörü: KAPAK_ONBELLEK ortam değişkeni ya da proje kökünde .kapak-onbellek. */
export const ONBELLEK_DIZINI = process.env.KAPAK_ONBELLEK || path.resolve(process.cwd(), '.kapak-onbellek');

const PNG_AYAR = { compressionLevel: 9, palette: true, quality: 90 };

/** Derleme boyunca sayaç: hazır (önbellekten) ve çizilen kapak sayısı. */
export const sayac = { hazir: 0, cizildi: 0 };

/** SVG metnini PNG'ye çevirir; önbellekte varsa çizmeden döner. */
export async function onbellekliPng(svg) {
  const anahtar = createHash('sha256').update(JSON.stringify(PNG_AYAR)).update(svg).digest('hex').slice(0, 32);
  const dosya = path.join(ONBELLEK_DIZINI, `${anahtar}.png`);
  try {
    const png = await readFile(dosya);
    sayac.hazir++;
    return png;
  } catch {
    // yok ya da okunamadı: çizilir
  }
  const png = await sharp(Buffer.from(svg)).png(PNG_AYAR).toBuffer();
  sayac.cizildi++;
  try {
    await mkdir(ONBELLEK_DIZINI, { recursive: true });
    await writeFile(dosya, png);
  } catch {
    // önbelleğe yazılamazsa derleme yine de sürer
  }
  return png;
}
