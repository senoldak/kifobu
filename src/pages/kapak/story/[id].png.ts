// Günün bülteninin (sabah/öğle/gece; kategori gunluk-bulten) Instagram story kartı (1080×1920 PNG), scripts/instagram-paylas.mjs
// Sitede ve Telegram'da yatay kapak kalır. 18:00 kapanış bülteni ayrı iş akışındadır, buraya girmez.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getNews, type Haber } from '../../../lib/news';
import { kapakSvg } from '../../../kapak/ciz';
import { onbellekliPng } from '../../../lib/kapak-onbellek.mjs';

export const getStaticPaths = (async () =>
  (await getNews()).filter((h) => h.data.category === 'gunluk-bulten').map((haber) => ({ params: { id: haber.id }, props: { haber } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await onbellekliPng(kapakSvg((props as { haber: Haber }).haber, 'story'));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
