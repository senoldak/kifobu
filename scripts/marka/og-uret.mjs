// Varsayılan paylaşım görseli (public/og-default.png, 1200×630): sarı bant, ortada dikey logo ve slogan.
// Kullanım: node --experimental-strip-types scripts/marka/og-uret.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { genislik, metin } from '../../src/kapak/ciz.ts';
import { KIMLIK, tohumIsaretiSvg } from '../../src/lib/kimlik.ts';
import { SITE } from '../../src/lib/site.ts';

const G = 1200;
const Y = 630;
const isaret = 170;
const ad = { yuz: 'yari', boyut: 104, renk: KIMLIK.murekkep, aralik: -104 * 0.03 };
const slogan = { yuz: 'orta', boyut: 36, renk: KIMLIK.gri };
const isaretY = 120;
const adTaban = isaretY + isaret + 40 + 104 * 0.72;
const sloganTaban = adTaban + 70;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}">
<rect width="${G}" height="${Y}" fill="${KIMLIK.kagit}"/><rect width="${G}" height="18" fill="${KIMLIK.sari}"/>
${tohumIsaretiSvg({ boyut: isaret }).replace('<svg ', `<svg x="${(G - isaret) / 2}" y="${isaretY}" `)}
${metin(SITE.name, (G - genislik(SITE.name, ad)) / 2, adTaban, ad)}
${metin(SITE.tagline, (G - genislik(SITE.tagline, slogan)) / 2, sloganTaban, slogan)}
</svg>`;
fs.writeFileSync('public/og-default.png', await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer());
console.log('public/og-default.png');
