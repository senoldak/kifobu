import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getImage } from 'astro:assets';
import { SITE, categoryName } from '../lib/site';
import { getNews, newsUrl } from '../lib/news';
import { kapakUrl, KAPAK_G, KAPAK_Y } from '../kapak/ciz';

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export async function GET(context: APIContext) {
  const news = await getNews();
  const items = await Promise.all(
    news.slice(0, 50).map(async (h) => {
      let media: string;
      if (h.data.cover) {
        const img = await getImage({ src: h.data.cover, width: 1200, format: 'jpeg' });
        media = `<media:content url="${xml(new URL(img.src, context.site).href)}" medium="image" type="image/jpeg" width="${img.attributes.width}" height="${img.attributes.height}" />`;
      } else {
        media = `<media:content url="${xml(new URL(kapakUrl(h), context.site).href)}" medium="image" type="image/png" width="${KAPAK_G}" height="${KAPAK_Y}" />`;
      }
      return {
        title: h.data.title,
        description: h.data.description,
        pubDate: h.data.date,
        link: newsUrl(h),
        categories: [categoryName(h.data.category)],
        customData: media,
      };
    }),
  );
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom', media: 'http://search.yahoo.com/mrss/' },
    items,
    customData: `<language>tr</language><atom:link href="${new URL('/rss.xml', context.site).href}" rel="self" type="application/rss+xml" />`,
  });
}
