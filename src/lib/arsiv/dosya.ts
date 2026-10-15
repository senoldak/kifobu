import fs from 'node:fs';
import path from 'node:path';
import type { ArsivKaydi } from './tipler.ts';

const DOSYA_DESENI = /^\d{4}-\d{2}-\d{2}\.json$/;

/**
 * `haricTarih`'ten küçük en büyük tarihli geçerli kaydı döner; yoksa null.
 * Okunamayan (bozuk/yarım yazılmış) dosya atlanır, bir önceki dosyaya bakılır.
 */
export function sonKaydiBul(dizin: string, haricTarih: string): ArsivKaydi | null {
  if (!fs.existsSync(dizin)) return null;
  const dosyalar = fs
    .readdirSync(dizin)
    .filter((d) => DOSYA_DESENI.test(d) && d.slice(0, 10) < haricTarih)
    .sort()
    .reverse();
  for (const dosya of dosyalar) {
    try {
      return JSON.parse(fs.readFileSync(path.join(dizin, dosya), 'utf8')) as ArsivKaydi;
    } catch (e) {
      console.warn(`Arşiv: okunamayan kayıt atlandı: ${dosya} (${(e as Error).message})`);
    }
  }
  return null;
}

export function kaydiYaz(dizin: string, kayit: ArsivKaydi): string {
  fs.mkdirSync(dizin, { recursive: true });
  const yol = `${dizin}/${kayit.tarih}.json`;
  fs.writeFileSync(yol, JSON.stringify(kayit, null, 2) + '\n');
  return yol;
}
