// Sosyal hesap görselleri (brand/sosyal/): profil fotoğrafı ve kapak görselleri (BRAND.md §11).
// Hesaplara yüklemeyi sahibi yapar. Kullanım: node --experimental-strip-types scripts/marka/sosyal-uret.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { genislik, logo, metin } from '../../src/kapak/ciz.ts';
import { KIMLIK, tohumIsaretiSvg } from '../../src/lib/kimlik.ts';
import { SITE } from '../../src/lib/site.ts';

const KLASOR = 'brand/sosyal';
fs.mkdirSync(KLASOR, { recursive: true });
const yaz = async (ad, svg) => fs.writeFileSync(`${KLASOR}/${ad}`, await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer());
const yerlestir = (svg, x, y) => svg.replace('<svg ', `<svg x="${x}" y="${y}" `);

// Profil: kâğıt zemin, küçük boy işaret; daire kırpmada kenarlar boş kalır (iç alan %70).
{
  const G = 1080;
  const i = Math.round(G * 0.7);
  await yaz('profil-1080.png', `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${G}"><rect width="${G}" height="${G}" fill="${KIMLIK.kagit}"/>${yerlestir(tohumIsaretiSvg({ boyut: i, kucuk: true }), (G - i) / 2, (G - i) / 2)}</svg>`);
}

/**
 * Kapak görseli: üstte sarı bant, içerik (logo + altında slogan) `merkez` noktasına ortalı, sağda kenardan taşan
 * soluk büyük işaret. İçerik ortada durur çünkü profil fotoğrafı sol alta biner ve mobil uygulamalar kenarları kırpar.
 */
function kapak(G, Y, { isaretBoyu, sloganBoyu, merkez = G / 2, soluk = true }) {
  const buyuk = Math.round(Y * 1.25);
  const solukIsaret = tohumIsaretiSvg({ boyut: buyuk }).replaceAll(`fill="${KIMLIK.murekkep}"`, 'fill="#e4e1d8"');
  const slogan = { yuz: 'orta', boyut: sloganBoyu, renk: KIMLIK.murekkep };
  const olcum = logo(0, 0, isaretBoyu);
  const blokG = Math.max(olcum.genislik, genislik(SITE.tagline, slogan));
  const blokY = isaretBoyu + sloganBoyu * 1.9;
  const x = merkez - blokG / 2;
  const ust = (Y - blokY) / 2 + Y * 0.02; // bandın payı kadar aşağı
  const l = logo(x + (blokG - olcum.genislik) / 2, ust + isaretBoyu, isaretBoyu);
  const sloganX = merkez - genislik(SITE.tagline, slogan) / 2;
  const bant = Math.max(8, Math.round(Y * 0.04));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}"><rect width="${G}" height="${Y}" fill="${KIMLIK.kagit}"/>${soluk ? yerlestir(solukIsaret, G - buyuk * 0.55, (Y - buyuk) / 2) : ''}<rect width="${G}" height="${bant}" fill="${KIMLIK.sari}"/>${l.svg}${metin(SITE.tagline, sloganX, ust + blokY - sloganBoyu * 0.25, slogan)}</svg>`;
}

// X (Twitter) başlığı 1500×500: profil fotoğrafı sol alta biner, bazı ekranlar üstten ve alttan ~60 px kırpar.
await yaz('x-kapak-1500x500.png', kapak(1500, 500, { isaretBoyu: 120, sloganBoyu: 38, merkez: 820 }));
// Facebook sayfa kapağı 1640×624 (masaüstü 820×312'nin iki katı); mobil yanlardan kırpar (ortadaki ~1100 px görünür).
await yaz('facebook-kapak-1640x624.png', kapak(1640, 624, { isaretBoyu: 140, sloganBoyu: 44, merkez: 820 }));
// LinkedIn şirket sayfası kapağı 1128×191: sayfa logosu sol alta biner.
await yaz('linkedin-kapak-1128x191.png', kapak(1128, 191, { isaretBoyu: 62, sloganBoyu: 20, merkez: 640 }));
console.log(fs.readdirSync(KLASOR).join(', '));
