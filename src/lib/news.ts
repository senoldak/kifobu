import { getCollection, type CollectionEntry } from 'astro:content';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar canlı sitede görünmez, yerel geliştirmede görünür.
export async function getNews(): Promise<Haber[]> {
  const all = await getCollection('haberler', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function newsUrl(haber: Haber) {
  return `/haber/${haber.id}/`;
}

/** Kampanya künyesi olan haber mi (tahtaya yazılabilir mi)? */
export function isFunding(haber: Haber) {
  return Boolean(haber.data.girisim && haber.data.toplanan !== undefined);
}

/** Tahta satırları: her girişimin en güncel kaydı, en yeniden eskiye. */
export function boardRows(news: Haber[], limit = 7) {
  const seen = new Set<string>();
  const rows: Haber[] = [];
  for (const h of news) {
    if (!isFunding(h)) continue;
    const key = h.data.girisim!.toLocaleLowerCase('tr-TR');
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(h);
    if (rows.length === limit) break;
  }
  return rows;
}

// Haber görselleri yalnızca haber yeniyken önemli (ana sayfa ve Telegram paylaşımı).
// Daha eski haberler için derlemede kapak, paylaşım görseli ve çizilen kapak üretilmez;
// Cloudflare'in dağıtım başına dosya sınırı (20.000) böylece korunur.
export const GORSEL_GUN = 14;
export const gorselVar = (tarih: Date | string | number, simdi = new Date()) =>
  simdi.getTime() - new Date(tarih).getTime() <= GORSEL_GUN * 86_400_000;
