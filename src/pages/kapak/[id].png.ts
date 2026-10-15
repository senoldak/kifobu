// Her haber için derleme anında çizilen kapak (1200×675 PNG). Paylaşım görseli olarak da kullanılır.
import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { getNews, gorselVar, type Haber } from '../../lib/news';
import { kapakSvg } from '../../kapak/ciz';

export const getStaticPaths = (async () => {
  const news = await getNews();
  // Eski haberler için kapak çizilmez (bkz. gorselVar).
  return news.filter((haber) => gorselVar(haber.data.date)).map((haber) => ({ params: { id: haber.id }, props: { haber } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await sharp(Buffer.from(kapakSvg((props as { haber: Haber }).haber)))
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
