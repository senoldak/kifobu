// "İlgili haberler": haberin künyesindeki ortak varlıklara (girişim, platform, yatırımcılar) göre seçilir; ortak
// varlık yoksa aynı bölümün son haberleriyle tamamlanır. Bülten yazıları ve arama motorlarına kapalı (noindex)
// haberler önerilmez. Saf TypeScript: astro:content'e bağlı değil, birim testiyle sınanır.
import { indekslenir } from './indeks.ts';
import { anlamBenzerligi, anlamPuani, vektorleriOku } from './anlam.mjs';

export interface IlgiliAday {
  id: string;
  body?: string;
  data: {
    category: string;
    date: Date;
    draft?: boolean;
    noindex?: boolean;
    girisim?: string;
    platform?: string;
    yatirimcilar?: string;
  };
}

const BULTEN = 'gunluk-bulten';

const norm = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();

/** Yatırımcı listesini ayırır: "A, B ve C" → [a, b, c]. Genel ifadeler ("melek yatırımcılar") eşleşme sayılmaz. */
export function yatirimciListesi(s?: string): string[] {
  if (!s) return [];
  return s
    .split(/,|;| ve | and /)
    .map(norm)
    .filter((x) => x.length > 1 && !/yatırımcı|açıklanmadı|bilinmiyor/.test(x));
}

/** İki haberin ortak varlık puanı: aynı girişim 5, aynı platform 3, her ortak yatırımcı 2. */
export function ortaklikPuani(a: IlgiliAday, b: IlgiliAday): number {
  let puan = 0;
  if (a.data.girisim && b.data.girisim && norm(a.data.girisim) === norm(b.data.girisim)) puan += 5;
  if (a.data.platform && b.data.platform && norm(a.data.platform) === norm(b.data.platform)) puan += 3;
  const ya = new Set(yatirimciListesi(a.data.yatirimcilar));
  for (const y of yatirimciListesi(b.data.yatirimcilar)) if (ya.has(y)) puan += 2;
  return puan;
}

// Gemini Faz 2 (27 Ekim): anlam benzerliği (src/data/vektorler.jsonl, kimlik = haber id'si); vektör yoksa 0 puan.
export type Anlam = (a: IlgiliAday, b: IlgiliAday) => number | null;
const varsayilanAnlam: Anlam = (a, b) => anlamBenzerligi(vektorleriOku(), a.id, b.id);

export function ilgiliHaberler<T extends IlgiliAday>(haber: T, tum: T[], limit = 3, anlam: Anlam = varsayilanAnlam): T[] {
  const adaylar = tum.filter(
    (h) =>
      h.id !== haber.id &&
      h.data.category !== BULTEN &&
      indekslenir({ draft: h.data.draft, noindex: h.data.noindex, govde: h.body }),
  );
  const yeni = (x: T, y: T) => y.data.date.valueOf() - x.data.date.valueOf();
  const puanli = adaylar
    .map((h) => ({ h, p: ortaklikPuani(haber, h) + anlamPuani(anlam(haber, h)) }))
    .filter((x) => x.p > 0)
    .sort((x, y) => y.p - x.p || Number(y.h.data.category === haber.data.category) - Number(x.h.data.category === haber.data.category) || yeni(x.h, y.h))
    .map((x) => x.h);
  const secilen = puanli.slice(0, limit);
  if (secilen.length < limit) {
    const ayni = adaylar.filter((h) => h.data.category === haber.data.category && !secilen.includes(h)).sort(yeni);
    secilen.push(...ayni.slice(0, limit - secilen.length));
  }
  return secilen;
}
