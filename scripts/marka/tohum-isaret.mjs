// kifobu tohum işareti dosyaları (brand/). Çizim src/lib/kimlik.ts'teki tohumIsaretiSvg'dendir.
// Kullanım: node --experimental-strip-types scripts/marka/tohum-isaret.mjs brand
import fs from 'node:fs';
import { tohumIsaretiSvg } from '../../src/lib/kimlik.ts';

const [, , cikis] = process.argv;
const dosyalar = {
  'kifobu-tohum.svg': tohumIsaretiSvg({ boyut: 200 }),
  'kifobu-tohum-koyu-zemin.svg': tohumIsaretiSvg({ boyut: 200, zemin: 'koyu' }),
  'kifobu-tohum-kucuk.svg': tohumIsaretiSvg({ boyut: 200, kucuk: true }),
  'kifobu-tohum-kucuk-koyu-zemin.svg': tohumIsaretiSvg({ boyut: 200, kucuk: true, zemin: 'koyu' }),
};
for (const [ad, icerik] of Object.entries(dosyalar)) fs.writeFileSync(`${cikis}/${ad}`, `${icerik}\n`);
console.log(Object.keys(dosyalar).join('\n'));
