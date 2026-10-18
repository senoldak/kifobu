// Favicon ve uygulama simgeleri: kâğıt zeminde küçük tohum işareti (BRAND.md §5).
// Kullanım: node --experimental-strip-types scripts/marka/favicon-uret.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { KIMLIK, tohumIsaretiSvg } from '../../src/lib/kimlik.ts';

const KOK = 'public';

/** Kare simge: kâğıt zemin, işaret kenarlardan %10 içeride. */
function simgeSvg(boyut, { kucuk = true, yuvarlak = false } = {}) {
  const ic = Math.round(boyut * 0.8);
  const ofset = Math.round((boyut - ic) / 2);
  const isaret = tohumIsaretiSvg({ boyut: ic, kucuk }).replace('<svg ', `<svg x="${ofset}" y="${ofset}" `);
  const zemin = yuvarlak
    ? `<circle cx="${boyut / 2}" cy="${boyut / 2}" r="${boyut / 2}" fill="${KIMLIK.kagit}"/>`
    : `<rect width="${boyut}" height="${boyut}" fill="${KIMLIK.kagit}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${boyut}" height="${boyut}" viewBox="0 0 ${boyut} ${boyut}">${zemin}${isaret}</svg>`;
}

const png = (boyut, secenek) => sharp(Buffer.from(simgeSvg(boyut, secenek))).png().toBuffer();

/** PNG gömülü ICO (Windows Vista+ ve bütün tarayıcılar okur). */
function ico(pngler) {
  const bas = Buffer.alloc(6 + 16 * pngler.length);
  bas.writeUInt16LE(0, 0);
  bas.writeUInt16LE(1, 2);
  bas.writeUInt16LE(pngler.length, 4);
  let ofset = bas.length;
  pngler.forEach(([boyut, veri], i) => {
    const o = 6 + i * 16;
    bas.writeUInt8(boyut >= 256 ? 0 : boyut, o);
    bas.writeUInt8(boyut >= 256 ? 0 : boyut, o + 1);
    bas.writeUInt16LE(1, o + 4);
    bas.writeUInt16LE(32, o + 6);
    bas.writeUInt32LE(veri.length, o + 8);
    bas.writeUInt32LE(ofset, o + 12);
    ofset += veri.length;
  });
  return Buffer.concat([bas, ...pngler.map(([, veri]) => veri)]);
}

// favicon.svg: zeminsiz, tarayıcı sekmesinde de net okunan küçük işaret.
fs.writeFileSync(`${KOK}/favicon.svg`, `${tohumIsaretiSvg({ boyut: 64, minik: true })}\n`);
fs.writeFileSync(`${KOK}/favicon-32.png`, await png(32));
fs.writeFileSync(`${KOK}/favicon-192.png`, await png(192));
fs.writeFileSync(`${KOK}/favicon-512.png`, await png(512, { kucuk: false }));
fs.writeFileSync(`${KOK}/apple-touch-icon.png`, await png(180));
fs.writeFileSync(`${KOK}/favicon.ico`, ico([[16, await png(16)], [32, await png(32)], [48, await png(48)]]));
console.log('favicon.svg, favicon.ico, favicon-32/192/512.png, apple-touch-icon.png');
