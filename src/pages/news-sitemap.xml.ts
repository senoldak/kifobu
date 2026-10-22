// Google Haberler site haritası: son 48 saatte yayımlanan, indekslenebilir haberler (Google'ın sınırı; bkz. lib/indeks.ts).
// Site her bot commit'inden sonra yeniden derlendiği için derleme anındaki pencere yeterli.
import type { APIContext } from 'astro';
import { SITE } from '../lib/site';
import { getNews, newsUrl } from '../lib/news';
import { indekslenir } from '../lib/indeks';

const PENCERE_MS = 48 * 60 * 60 * 1000;

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET(context: APIContext) {
  const simdi = Date.now();
  const news = (await getNews())
    .filter((h) => indekslenir({ draft: h.data.draft, noindex: h.data.noindex, govde: h.body }) && simdi - h.data.date.valueOf() <= PENCERE_MS)
    .slice(0, 1000);
  const urls = news
    .map(
      (h) => `  <url>
    <loc>${xml(new URL(newsUrl(h), context.site).href)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xml(SITE.name)}</news:name>
        <news:language>tr</news:language>
      </news:publication>
      <news:publication_date>${h.data.date.toISOString()}</news:publication_date>
      <news:title>${xml(h.data.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
