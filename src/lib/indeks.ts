// Arama motoru kuralı: hangi haber indekslenir (robots "index"), hangisi "noindex, follow" olur ve site haritalarına
// girmez. Haber sayfası (src/pages/haber/[id].astro), site haritası (astro.config.mjs → sitemap filtresi), Google
// Haberler haritası (news-sitemap.xml.ts) ve kategori sayfaları aynı fonksiyonu kullanır; kural tek yerde değişir.
//
// Saf TypeScript: astro:content'e bağlı değil, çünkü astro.config.mjs içerik koleksiyonunu kullanamıyor.

/** Bu kelime sayısının altındaki haber metni ince içerik sayılır (2026-10-15 kararı). */
export const EN_AZ_KELIME = 120;

/**
 * Markdown gövdenin okura görünen kelime sayısı: bağlantı adresleri, resimler, HTML ve biçim işaretleri sayılmaz.
 */
export function kelimeSayisi(md = ''): number {
  const duz = String(md)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  return (duz.match(/[\p{L}\d]+(?:[’'.,-][\p{L}\d]+)*/gu) ?? []).length;
}

export interface IndeksBilgisi {
  draft?: boolean;
  /** Elle ya da kapsam taramasıyla konulan işaret (ön bilgide `noindex: true`). */
  noindex?: boolean;
  /** Markdown gövde. */
  govde?: string;
}

/** Haber arama motorlarına açık mı? Taslak, işaretli ya da EN_AZ_KELIME'den kısa haber açık değildir. */
export function indekslenir({ draft, noindex, govde }: IndeksBilgisi): boolean {
  return !draft && !noindex && kelimeSayisi(govde) >= EN_AZ_KELIME;
}

/** Bölüm (kategori) sayfası indekslenir mi? İndekslenebilir haberi olmayan boş/ince bölümler açılmaz. */
export function bolumIndekslenir(slug: string, indekslenenHaberSayisi: number): boolean {
  // Günlük Bülten sayfası haber listesi değil, bülten verisini (tahta) gösterir; her zaman açıktır.
  return slug === 'gunluk-bulten' || indekslenenHaberSayisi > 0;
}
