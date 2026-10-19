import { getCollection, type CollectionEntry } from 'astro:content';
import { yayinda } from './yayinda.mjs';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar ve tarihi gelmemiş (planlanmış) yazılar canlı sitede görünmez, yerel geliştirmede görünür.
export async function getNews(): Promise<Haber[]> {
  const all = await getCollection('haberler', ({ data }) => import.meta.env.DEV || yayinda(data));
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

// Dosya bütçesi: Cloudflare Workers statik varlıklarında bir sürüm en fazla 20.000 dosya olabilir.
// Her haber derlemede yaklaşık 2 dosya üretir (sayfa + /kapak/<id>.png); yüklenmiş kapak resmi olan haberde
// buna 2 dosya (1200px JPEG paylaşım görseli + sayfadaki WebP) eklenir. Sabit sayfalar, bölüm sayfaları ve
// _astro dosyaları birkaç yüz tutar. Yani sınıra ~9.000 haberde yaklaşılır; Yayınla iş akışı 15.000 dosyada uyarır.
// Kapaklar künyeden belirlenimci çizildiği için (src/kapak/ciz.ts) eski haberlerin kapağı her derlemede aynı çıkar;
// 2026-10-15'e kadar 14 günden eski haberlerin kapağı üretilmiyordu, bu kaldırıldı (her haberin ≥1200px görseli olsun).
