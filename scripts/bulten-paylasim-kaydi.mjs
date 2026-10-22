// Kapanış bülteninin hangi kanala bugün gittiğini tutar. Paylaşım adımında bir kanal düşerse iş kırmızı biter ve
// mecmua-saat bütün kapanışı yeniden başlatır; bu kayıt olmadan başarılı kanallar (Telegram, Meta) ikinci kez giderdi
// (22 Ekim: LinkedIn 401 yüzünden Telegram'a iki kapanış gitti). Kayıt yalnız bugünün kanallarını tutar.
// Kullanım: node scripts/bulten-paylasim-kaydi.mjs gonderildi <kanal>   (bugün gittiyse 0, gitmediyse 1 ile çıkar)
//           node scripts/bulten-paylasim-kaydi.mjs isaretle <kanal>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const KAYIT = fileURLToPath(new URL('../src/data/bulten-paylasim.json', import.meta.url));

export const gonderildiMi = (kayit, gun, kanal) => kayit.gun === gun && (kayit.kanallar ?? []).includes(kanal);

export function isaretle(kayit, gun, kanal) {
  const kanallar = kayit.gun === gun ? (kayit.kanallar ?? []) : [];
  return { gun, kanallar: kanallar.includes(kanal) ? kanallar : [...kanallar, kanal] };
}

export function kaydiOku(dosya = KAYIT) {
  try {
    return JSON.parse(readFileSync(dosya, 'utf8'));
  } catch {
    return {};
  }
}

export const kaydiYaz = (dosya, kayit) => writeFileSync(dosya, JSON.stringify(kayit, null, 2) + '\n');

const istanbulGunu = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [komut, kanal] = process.argv.slice(2);
  if (!kanal || !['gonderildi', 'isaretle'].includes(komut)) {
    console.error('Kullanım: bulten-paylasim-kaydi.mjs gonderildi|isaretle <kanal>');
    process.exit(2);
  }
  const gun = istanbulGunu();
  if (komut === 'gonderildi') process.exit(gonderildiMi(kaydiOku(), gun, kanal) ? 0 : 1);
  kaydiYaz(KAYIT, isaretle(kaydiOku(), gun, kanal));
}
