// Kullanıma hazır logo paketi (brand/logo/): yatay, dikey, sloganlı dikey ve yalnız işaret; açık ve koyu zemin için;
// SVG (yazı glif yolu, yazı tipi gerekmez) ve saydam PNG. Çizim src/lib/kimlik.ts ve src/kapak/ciz.ts'ten gelir.
// Kullanım: node --experimental-strip-types scripts/marka/logo-paketi.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { genislik, metin } from '../../src/kapak/ciz.ts';
import { KIMLIK, tohumIsaretiSvg } from '../../src/lib/kimlik.ts';
import { SITE } from '../../src/lib/site.ts';

const KLASOR = 'brand/logo';
fs.mkdirSync(KLASOR, { recursive: true });

const M = 200; // işaret boyu; her şey buna göre
const BOSLUK = M * 0.25; // logonun çevresindeki boş alan
const yerlestir = (svg, x, y) => svg.replace('<svg ', `<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" `);

function zeminRenkleri(zemin) {
  return zemin === 'koyu' ? { yazi: KIMLIK.kagit, ikincil: '#c9ccc7' } : { yazi: KIMLIK.murekkep, ikincil: KIMLIK.gri };
}

/** İşaret solda, "kifobu" sağda (site üst bilgisi gibi). */
function yatay(zemin) {
  const { yazi } = zeminRenkleri(zemin);
  const boy = M * 0.78;
  const ayar = { yuz: 'yari', boyut: boy, renk: yazi, aralik: -boy * 0.03 };
  const g = BOSLUK + M + M * 0.24 + genislik(SITE.name, ayar) + BOSLUK;
  const y = BOSLUK + M + BOSLUK;
  const taban = BOSLUK + M / 2 + (boy * 0.52) / 2;
  return {
    g, y,
    ic: yerlestir(tohumIsaretiSvg({ boyut: M, zemin }), BOSLUK, BOSLUK) + metin(SITE.name, BOSLUK + M * 1.24, taban, ayar),
  };
}

/** İşaret üstte, "kifobu" altta; istenirse slogan en altta (profil, baskı). */
function dikey(zemin, slogan) {
  const { yazi, ikincil } = zeminRenkleri(zemin);
  const boy = M * 0.5;
  const ad = { yuz: 'yari', boyut: boy, renk: yazi, aralik: -boy * 0.03 };
  const alt = { yuz: 'orta', boyut: M * 0.14, renk: ikincil };
  const adG = genislik(SITE.name, ad);
  const sloganG = slogan ? genislik(SITE.tagline, alt) : 0;
  const icG = Math.max(M, adG, sloganG);
  const g = BOSLUK * 2 + icG;
  const adTaban = BOSLUK + M + M * 0.16 + boy * 0.7;
  const sloganTaban = adTaban + M * 0.3;
  const y = (slogan ? sloganTaban + M * 0.05 : adTaban + M * 0.02) + BOSLUK;
  let ic = yerlestir(tohumIsaretiSvg({ boyut: M, zemin }), (g - M) / 2, BOSLUK) + metin(SITE.name, (g - adG) / 2, adTaban, ad);
  if (slogan) ic += metin(SITE.tagline, (g - sloganG) / 2, sloganTaban, alt);
  return { g, y, ic };
}

/** Yalnız işaret: tam (233), küçük (55) ve minik (34) tohumlu. */
function isaret(zemin, tur) {
  const boyut = M + BOSLUK * 2;
  const secenek = { boyut: M, zemin, kucuk: tur === 'kucuk', minik: tur === 'minik' };
  return { g: boyut, y: boyut, ic: yerlestir(tohumIsaretiSvg(secenek), BOSLUK, BOSLUK) };
}

const svgYap = ({ g, y, ic }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(g)}" height="${Math.ceil(y)}" viewBox="0 0 ${Math.ceil(g)} ${Math.ceil(y)}">${ic}</svg>\n`;

const PARCALAR = {
  'kifobu-logo-yatay': (z) => yatay(z),
  'kifobu-logo-dikey': (z) => dikey(z, false),
  'kifobu-logo-dikey-slogan': (z) => dikey(z, true),
  'kifobu-isaret': (z) => isaret(z, 'tam'),
  'kifobu-isaret-kucuk': (z) => isaret(z, 'kucuk'),
  'kifobu-isaret-minik': (z) => isaret(z, 'minik'),
};

const yazilan = [];
for (const [ad, ciz] of Object.entries(PARCALAR)) {
  for (const zemin of ['acik', 'koyu']) {
    const dosya = `${ad}${zemin === 'koyu' ? '-koyu-zemin' : ''}`;
    const svg = svgYap(ciz(zemin));
    fs.writeFileSync(`${KLASOR}/${dosya}.svg`, svg);
    // PNG: saydam zemin, 2000 piksel genişlik (küçük ve minik işaret yalnız küçük boyda kullanılır: 256 piksel).
    const genis = ad.endsWith('kucuk') || ad.endsWith('minik') ? 256 : 2000;
    await sharp(Buffer.from(svg), { density: 72 * (genis / ciz(zemin).g) }).resize({ width: genis }).png({ compressionLevel: 9 }).toFile(`${KLASOR}/${dosya}.png`);
    yazilan.push(dosya);
  }
}

fs.writeFileSync(
  `${KLASOR}/BENIOKU.txt`,
  `kifobu logo paketi (BRAND.md §5–6). Üretici: scripts/marka/logo-paketi.mjs — elle düzenlemeyin, yeniden üretin.

Hangi dosya nerede:
- kifobu-logo-yatay        Web sitesi, e-posta imzası, sunum, belge üst bilgisi (varsayılan logo)
- kifobu-logo-dikey        Kare alanlar, kartvizit, afiş
- kifobu-logo-dikey-slogan Baskı ve tanıtım ("${SITE.tagline}")
- kifobu-isaret            Yazısız işaret, 64 piksel ve üstü (profil fotoğrafı, uygulama simgesi)
- kifobu-isaret-kucuk      33–63 piksel arası (55 tohum)
- kifobu-isaret-minik      32 piksel ve altı (34 tohum; favicon gibi)

"-koyu-zemin" ekli dosyalar koyu zemin içindir: siyah tohumlar ve yazı kâğıt rengine döner, sarı kol aynı kalır.
SVG her boyda keskindir, öncelik onda. PNG'ler saydam zeminlidir.

Kurallar: döndürme, renk değiştirme, gölge, kontur, tohum ekleme/çıkarma, yazıyı başka yazı tipiyle yeniden yazma yapılmaz.
Logonun çevresinde en az işaretin dörtte biri kadar boşluk kalır (dosyalarda bu boşluk var).
Renkler: sarı ${KIMLIK.sari}, mürekkep ${KIMLIK.murekkep}, kâğıt ${KIMLIK.kagit}. Yazı tipi: Schibsted Grotesk (OFL).
`,
);
console.log(yazilan.length * 2, 'dosya +', 'BENIOKU.txt →', KLASOR);
