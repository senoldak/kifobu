// Sosyal hesap görselleri (brand/sosyal/): profil fotoğrafı ve kapak görselleri (BRAND.md §11).
// Hesaplara yüklemeyi sahibi yapar. Kullanım: node --experimental-strip-types scripts/marka/sosyal-uret.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { logo, metin } from '../../src/kapak/ciz.ts';
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

/** Kapak görseli: üstte sarı bant, solda logo ve altında slogan, sağda kenardan taşan çok açık gri büyük işaret. */
function kapak(G, Y, isaretBoyu, sloganBoyu, solX) {
  const buyuk = Math.round(Y * 1.25);
  const soluk = tohumIsaretiSvg({ boyut: buyuk }).replaceAll(`fill="${KIMLIK.murekkep}"`, 'fill="#e4e1d8"');
  const l = logo(solX, Y / 2 + isaretBoyu * 0.2, isaretBoyu);
  const slogan = { yuz: 'orta', boyut: sloganBoyu, renk: KIMLIK.murekkep };
  const sloganTaban = Y / 2 + isaretBoyu * 0.2 + sloganBoyu * 1.6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${G}" height="${Y}"><rect width="${G}" height="${Y}" fill="${KIMLIK.kagit}"/>${yerlestir(soluk, G - buyuk * 0.72, (Y - buyuk) / 2)}<rect width="${G}" height="${Math.max(8, Math.round(Y * 0.04))}" fill="${KIMLIK.sari}"/>${l.svg}${metin(SITE.tagline, solX + 2, sloganTaban, slogan)}</svg>`;
}

await yaz('kapak-1500x500.png', kapak(1500, 500, 130, 40, 90));
// LinkedIn sayfa kapağı 1128×191; profil fotoğrafı solda üstüne bindiği için içerik sağa kaydırılır.
await yaz('kapak-linkedin-1128x191.png', kapak(1128, 191, 56, 20, 300));
console.log(fs.readdirSync(KLASOR).join(', '));
