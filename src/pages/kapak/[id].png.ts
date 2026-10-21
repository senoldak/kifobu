// Her haber için derleme anında çizilen kapak (1200×675 PNG). Paylaşım görseli olarak da kullanılır.
// Çizim önbelleklidir (src/lib/kapak-onbellek.mjs): aynı SVG bir kez çizilir, sonraki derlemeler hazır PNG'yi kullanır.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getNews, type Haber } from '../../lib/news';
import { kapakSvg } from '../../kapak/ciz';
import { onbellekliPng } from '../../lib/kapak-onbellek.mjs';

export const getStaticPaths = (async () => {
  const news = await getNews();
  // Her haberin kapağı çizilir (dosya bütçesi: src/lib/news.ts).
  return news.map((haber) => ({ params: { id: haber.id }, props: { haber } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await onbellekliPng(kapakSvg((props as { haber: Haber }).haber));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
