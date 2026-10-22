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

/** Değerleri (büyük/küçük harf farkı birleşir) sayar; EN_AZ_FILTRE_HABERI'nin altındakileri atar; çoktan aza sıralar. */
export function filtreDegerleri<T extends Aday>(haberler: T[], alan: 'tur' | 'paraBirimi', enAz = EN_AZ_FILTRE_HABERI): FiltreDegeri[] {
  const gruplar = new Map<string, { adlar: Map<string, number>; sayi: number }>();
  for (const h of haberler) {
    const ham = h.data[alan]?.trim();
    if (!ham) continue;
    const slug = filtreSlug(ham);
    if (!slug || GENEL_DEGERLER.has(slug)) continue;
    const g = gruplar.get(slug) ?? { adlar: new Map(), sayi: 0 };
    g.sayi++;
    g.adlar.set(ham, (g.adlar.get(ham) ?? 0) + 1);
    gruplar.set(slug, g);
  }
  return [...gruplar]
    .filter(([, g]) => g.sayi >= enAz)
    .map(([slug, g]) => ({ slug, sayi: g.sayi, ad: [...g.adlar].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => b.sayi - a.sayi || a.ad.localeCompare(b.ad, 'tr'));
}

/** Haber bu değere uyuyor mu? */
export function filtreUyar(h: Aday, alan: 'tur' | 'paraBirimi', slug: string): boolean {
  const ham = h.data[alan]?.trim();
  return Boolean(ham) && filtreSlug(ham!) === slug;
}
