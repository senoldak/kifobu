// Haber kartı örnekleri: kart.ts'in çizdiği kapak, post ve story PNG'lerini verilen klasöre yazar (yalnız önizleme).
// Kullanım: node --experimental-strip-types scripts/kapak-ornek.ts <klasör>
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { kartSvg, type Bicim } from '../src/kapak/kart.ts';

const cikis = process.argv[2] ?? '.kapak-ornekleri';
mkdirSync(cikis, { recursive: true });
const ORNEK: [string, string][] = [
  ['gunluk-bulten', 'Gece Bülteni — 17 Ekim 2026'],
  ['kampanyalar', 'Örnek: yeni kitle fonlama kampanyası hedefinin yüzde 80 seviyesine ulaştı'],
  ['platformlar', 'Kitle fonlama platformlarında ekim ayı kampanya sayısı arttı (örnek başlık)'],
  ['yatirimlar', 'Unravel Health, evde hormon takibi teknolojisi için 2,96 milyon euro yatırım aldı'],
  ['girisimler', "Zocdoc, sigorta doğrulama girişimi Sohar Health'i satın aldı"],
  ['mevzuat', 'Eu ınc kurucuları avrupa liderlerine çağrıda bulundu'],
  ['analiz', 'Asya girişim ekosistemi üçüncü çeyrekte 38,5 milyar dolar yatırım aldı'],
];
for (const [i, [kategori, baslik]] of ORNEK.entries()) {
  const bicimler: Bicim[] = i === 0 || i === 3 || i === 4 ? ['kapak', 'post', 'story'] : ['kapak'];
  for (const b of bicimler) writeFileSync(path.join(cikis, `${b}-${i + 1}-${kategori}.png`), await sharp(Buffer.from(kartSvg({ baslik, kategori }, b))).png().toBuffer());
}
console.log('ok', cikis);
