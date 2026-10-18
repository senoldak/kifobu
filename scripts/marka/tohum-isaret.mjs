// kifobu tohum işareti: altın açılı (137,5°) ayçiçeği dizilişi, her 21. tohum sarı ve 1,55 kat iri.
// Kullanım: node scripts/marka/tohum-isaret.mjs brand
import fs from 'node:fs';
const [, , cikis] = process.argv;
const GA = Math.PI * (3 - Math.sqrt(5)), SARI = '#e8b40c';
function isaret(n, nokta) {
  const c = 92 / Math.sqrt(n);
  let s = '';
  for (let i = 1; i <= n; i++) {
    const r = c * Math.sqrt(i), a = i * GA, k = Math.sqrt(i / n), kol = i % 21 === 0;
    let rad = c * 0.36 * (0.35 + 0.75 * k);
    if (kol) rad *= 1.55;
    s += `<circle cx="${(100 + r * Math.cos(a)).toFixed(2)}" cy="${(100 + r * Math.sin(a)).toFixed(2)}" r="${rad.toFixed(2)}" fill="${kol ? SARI : nokta}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><!-- kifobu tohum işareti (${n} tohum). Üretim: BRAND.md, "İşaret". -->${s}</svg>\n`;
}
const dosyalar = {
  'kifobu-tohum.svg': isaret(233, '#141a17'),
  'kifobu-tohum-koyu-zemin.svg': isaret(233, '#f7f5ef'),
  'kifobu-tohum-kucuk.svg': isaret(89, '#141a17'),
  'kifobu-tohum-kucuk-koyu-zemin.svg': isaret(89, '#f7f5ef'),
};
for (const [ad, icerik] of Object.entries(dosyalar)) fs.writeFileSync(`${cikis}/${ad}`, icerik);
console.log(Object.keys(dosyalar).join('\n'));
