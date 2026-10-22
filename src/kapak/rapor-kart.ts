// Çeyrek raporunun paylaşım görseli ve gömülebilir özeti (/rapor/YYYY-cN.png, 1200×675). Kimlik v2 (BRAND.md §11):
// kâğıt zemin, üstte sarı bant, Schibsted Grotesk. Yalnız raporda sayılan üç rakam çizilir; tutar yazılmaz
// (para birimleri karşılaştırılamaz, kur çevirisi yapılmaz).
import { BUYUK_HARF, genislik, kisalt, logo, metin, type MetinAyar } from './ciz.ts';
import { OLCU } from './kart.ts';
import { KIMLIK } from '../lib/kimlik.ts';
import { ceyrekAylari, kaynakNotu, type CeyrekOzeti } from '../lib/rapor.ts';

export function raporKartSvg(o: CeyrekOzeti, adres: string) {
  const { g, y, pad, bant, alt, isaret } = OLCU.kapak;
  const sayi = (n: number) => n.toLocaleString('tr-TR');
  let svg = `<rect width="${g}" height="${y}" fill="${KIMLIK.kagit}"/><rect width="${g}" height="${bant}" fill="${KIMLIK.sari}"/>`;

  const etiket: MetinAyar = { yuz: 'kalin', boyut: 24, renk: KIMLIK.murekkep, aralik: 24 * 0.12 };
  svg += metin('ÇEYREK RAPORU', pad, 118, etiket);
  svg += `<rect x="${pad}" y="128" width="${genislik('ÇEYREK RAPORU', etiket).toFixed(1)}" height="4" fill="${KIMLIK.sari}"/>`;
  const baslik = `${o.ceyrek.yil} ${o.ceyrek.c}. çeyrek`;
  svg += metin(baslik, pad, 150 + 96 * BUYUK_HARF, { yuz: 'ekstra', boyut: 96, renk: KIMLIK.murekkep, aralik: -96 * 0.025 });
  svg += metin(`Kitle fonlama ve girişim yatırımları · ${ceyrekAylari(o.ceyrek)}`, pad, 286, { yuz: 'orta', boyut: 32, renk: KIMLIK.gri });

  // Üç rakam sütunu; arada ince çizgi.
  const sutunlar: [number, string][] = [
    [o.haberSayisi, 'haber'],
    [o.yatirimHaberi, 'yatırım haberi'],
    [o.kampanya.kampanyaSayisi, 'fonlama kampanyası'],
  ];
  const genis = (g - 2 * pad) / sutunlar.length;
  sutunlar.forEach(([n, ad], i) => {
    const x = pad + i * genis + (i ? 28 : 0);
    if (i) svg += `<rect x="${pad + i * genis}" y="352" width="2" height="140" fill="${KIMLIK.cizgi}"/>`;
    svg += metin(sayi(n), x, 352 + 104 * BUYUK_HARF, { yuz: 'kalin', boyut: 104, renk: KIMLIK.murekkep, aralik: -104 * 0.02 });
    svg += metin(kisalt(ad, genis - 40, { yuz: 'orta', boyut: 28, renk: KIMLIK.gri }), x, 478, { yuz: 'orta', boyut: 28, renk: KIMLIK.gri });
  });

  const l = logo(pad, alt, isaret);
  const adresAyar: MetinAyar = { yuz: 'yari', boyut: 24, renk: KIMLIK.murekkep, hiza: 'end' };
  svg += l.svg + metin(adres, g - pad, alt - 14, adresAyar);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${g}" height="${y}" viewBox="0 0 ${g} ${y}">${svg}</svg>`;
}

export const raporKartAlt = (o: CeyrekOzeti) =>
  `kifobu ${o.ceyrek.ad} raporu: ${o.haberSayisi} haber, ${o.yatirimHaberi} yatırım haberi, ${o.kampanya.kampanyaSayisi} kitle fonlama kampanyası`;

/** Başka sitelere gömme kodu: rapora bağlı görsel ve bağlantılı kaynak notu. */
export function gommeKodu(o: CeyrekOzeti, sayfaUrl: string, gorselUrl: string) {
  const not = kaynakNotu(o.ceyrek, sayfaUrl).replace(sayfaUrl, `<a href="${sayfaUrl}">${sayfaUrl}</a>`);
  return [
    `<a href="${sayfaUrl}"><img src="${gorselUrl}" width="1200" height="675" style="max-width:100%;height:auto" alt="${raporKartAlt(o)}"></a>`,
    `<p>${not}</p>`,
  ].join('\n');
}
