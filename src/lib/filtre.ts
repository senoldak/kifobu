// /yatirimlar/ süzgeçleri: yatırım turu (`tur`) ve para birimi (`paraBirimi`) için statik süzülmüş sayfalar.
// Saf TypeScript (astro:content'e bağlı değil). Az haberli değerler düğme olarak gösterilmez, sayfaları üretilmez.

export const EN_AZ_FILTRE_HABERI = 3;
// Turu söylemeyen genel değerler süzgeç olmaz.
const GENEL_DEGERLER = new Set(['yatirim-turu', 'yatirim']);

const ASCII: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** "Seri A" → "seri-a", "Tohum Öncesi" → "tohum-oncesi". */
export function filtreSlug(deger: string): string {
  return deger
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (c) => ASCII[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface FiltreDegeri {
  slug: string;
  ad: string;
  sayi: number;
}

interface Aday {
  data: { tur?: string; paraBirimi?: string };
}

/** Yatırım turu eşanlamlıları ve varyasyonlarının standart adlara eşlemesi. */
export const TUR_NORMALLIKLERI: Record<string, string> = {
  'fon-kapama': 'Fon Kapanışı',
  'fon-kapanis': 'Fon Kapanışı',
  'fon-kapanisi': 'Fon Kapanışı',
  'fund-closing': 'Fon Kapanışı',
  'pre-seed': 'Tohum Öncesi',
  'preseed': 'Tohum Öncesi',
  'on-tohum': 'Tohum Öncesi',
  'tohum-oncesi': 'Tohum Öncesi',
  'pre-tohum': 'Tohum Öncesi',
  'tohum': 'Tohum',
  'tohum-turu': 'Tohum',
  'tohum-yatirim': 'Tohum',
  'tohum-yatirimi': 'Tohum',
  'seed': 'Tohum',
  'seed-round': 'Tohum',
  'seri-a': 'Seri A',
  'seri-a-turu': 'Seri A',
  'series-a': 'Seri A',
  'seri-a-oncesi': 'Seri A Öncesi',
  'pre-seri-a': 'Seri A Öncesi',
  'seri-b': 'Seri B',
  'seri-b-turu': 'Seri B',
  'series-b': 'Seri B',
  'seri-c': 'Seri C',
  'seri-c-turu': 'Seri C',
  'series-c': 'Seri C',
  'seri-d': 'Seri D',
  'seri-d-turu': 'Seri D',
  'series-d': 'Seri D',
  'seri-e': 'Seri E',
  'seri-e-turu': 'Seri E',
  'series-e': 'Seri E',
  'seri-f': 'Seri F',
  'series-f': 'Seri F',
  'kopru': 'Köprü',
  'kopru-turu': 'Köprü',
  'kopru-yatirim': 'Köprü',
  'kopru-yatirimi': 'Köprü',
  'bridge': 'Köprü',
  'bridge-round': 'Köprü',
  'buyume': 'Büyüme',
  'buyume-turu': 'Büyüme',
  'buyume-sermayesi': 'Büyüme',
  'buyume-yatirimi': 'Büyüme',
  'buyume-finansmani': 'Büyüme',
  'growth': 'Büyüme',
  'growth-equity': 'Büyüme',
  'kitle-fonlama': 'Kitle Fonlaması',
  'kitle-fonlamasi': 'Kitle Fonlaması',
  'crowdfunding': 'Kitle Fonlaması',
  'halka-arz': 'Halka Arz',
  'ipo': 'Halka Arz',
  'satin-alma': 'Satın Alma',
  'acquisition': 'Satın Alma',
  'melek': 'Melek Yatırım',
  'melek-yatirim': 'Melek Yatırım',
  'melek-yatirimi': 'Melek Yatırım',
  'angel': 'Melek Yatırım',
  'ilk-kapanis': 'İlk Kapanış',
};

/** Ham yatırım turu adını standart adına dönüştürür. */
export function turNormallestir(deger: string): string {
  const ham = deger.trim();
  const slug = filtreSlug(ham);
  return TUR_NORMALLIKLERI[slug] ?? ham;
}

/** Değerleri (büyük/küçük harf farkı birleşir) sayar; EN_AZ_FILTRE_HABERI'nin altındakileri atar; çoktan aza sıralar. */
export function filtreDegerleri<T extends Aday>(haberler: T[], alan: 'tur' | 'paraBirimi', enAz = EN_AZ_FILTRE_HABERI): FiltreDegeri[] {
  const gruplar = new Map<string, { adlar: Map<string, number>; sayi: number }>();
  for (const h of haberler) {
    const ham = h.data[alan]?.trim();
    if (!ham) continue;
    const ad = alan === 'tur' ? turNormallestir(ham) : ham;
    const slug = filtreSlug(ad);
    if (!slug || GENEL_DEGERLER.has(slug)) continue;
    const g = gruplar.get(slug) ?? { adlar: new Map(), sayi: 0 };
    g.sayi++;
    g.adlar.set(ham, (g.adlar.get(ham) ?? 0) + 1);
    gruplar.set(slug, g);
  }
  return [...gruplar]
    .filter(([, g]) => g.sayi >= enAz)
    .map(([slug, g]) => ({
      slug,
      sayi: g.sayi,
      ad: (alan === 'tur' ? TUR_NORMALLIKLERI[slug] : undefined) ?? [...g.adlar].sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, 'tr'));
}

/** Haber bu değere uyuyor mu? */
export function filtreUyar(h: Aday, alan: 'tur' | 'paraBirimi', slug: string): boolean {
  const ham = h.data[alan]?.trim();
  if (!ham) return false;
  const ad = alan === 'tur' ? turNormallestir(ham) : ham;
  return filtreSlug(ad) === slug;
}
