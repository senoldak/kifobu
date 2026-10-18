// Haber kartı örnekleri: kart.ts'in çizdiği kapak, post ve story PNG'lerini verilen klasöre yazar (yalnız önizleme).
// Kullanım: node --experimental-strip-types scripts/kapak-ornek.ts <klasör>
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { kartSvg, type Bicim, type KapakVeri } from '../src/kapak/kart.ts';

const cikis = process.argv[2] ?? '.kapak-ornekleri';
mkdirSync(cikis, { recursive: true });
const ORNEK: [string, KapakVeri, Bicim[]][] = [
  ['haber', { kategori: 'girisimler', baslik: "Accenture, İngiltere merkezli veri ve müşteri zekâsı girişimi Sagacity'yi satın aldı" }, ['kapak', 'story']],
  ['bulten', { kategori: 'gunluk-bulten', baslik: 'Gece Bülteni — 17 Ekim 2026' }, ['kapak']],
  ['yatirim-eur', { kategori: 'yatirimlar', baslik: 'Goodweek, tohum turunda 10,69 milyon euro yatırım aldı', girisim: 'Goodweek', toplanan: 10_690_000, paraBirimi: 'EUR', tur: 'Tohum' }, ['kapak', 'story']],
  ['yatirim-usd', { kategori: 'yatirimlar', baslik: 'Stand, Seri C turunda 70 milyon dolar yatırım alarak 1 milyar dolar değerlemeye ulaştı', toplanan: 70_000_000, paraBirimi: 'USD', tur: 'Seri C' }, ['kapak']],
  ['kunye-ornek', { kategori: 'kampanyalar', baslik: 'Örnek', girisim: 'Örnek Enerji', platform: 'fonangels', toplanan: 4_495_800, hedef: 4_000_000, durum: 'basarili', yatirimci: 1284 }, ['kapak', 'story']],
  ['kunye-ornek-suruyor', { kategori: 'kampanyalar', baslik: 'Örnek', girisim: 'Örnek Gıda Teknolojileri', platform: 'trinkfon', toplanan: 2_840_000, hedef: 4_000_000, durum: 'suruyor' }, ['kapak']],
];
for (const [ad, veri, bicimler] of ORNEK) {
  for (const b of bicimler) writeFileSync(path.join(cikis, `${ad}-${b}.png`), await sharp(Buffer.from(kartSvg(veri, b))).png().toBuffer());
}
console.log('ok', cikis);
