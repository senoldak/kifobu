import type { APIRoute } from 'astro';
import { getNews, newsUrl } from '../lib/news';
import { indekslenir } from '../lib/indeks';

export const prerender = true;

export const GET: APIRoute = async () => {
  const news = await getNews();
  // Arama motorlarına kapalı (kısa ya da kapsam dışı) haberler burada da yer almaz.
  const sonHaberler = news.filter((h) => indekslenir({ draft: h.data.draft, noindex: h.data.noindex, govde: h.body })).slice(0, 40);

  let metin = `# Kifobu - Tam İçerik ve Haber Akışı\n\n`;
  metin += `> Girişimler, girişim yatırımları ve kitle fonlaması.\n\n`;
  metin += `Son güncelleme: ${new Date().toISOString()}\n\n`;

  for (const h of sonHaberler) {
    metin += `## ${h.data.title}\n`;
    metin += `- URL: https://kifobu.com${newsUrl(h)}\n`;
    metin += `- Tarih: ${h.data.date.toISOString()}\n`;
    metin += `- Kategori: ${h.data.category}\n`;
    if (h.data.girisim) metin += `- Girişim: ${h.data.girisim}\n`;
    if (h.data.platform) metin += `- Platform: ${h.data.platform}\n`;
    if (h.data.description) metin += `- Özet: ${h.data.description}\n`;
    if (h.data.why_matters) metin += `- Neden Önemli: ${h.data.why_matters}\n`;
    if (h.data.key_points && h.data.key_points.length > 0) {
      metin += `- Öne Çıkanlar: ${h.data.key_points.join('; ')}\n`;
    }
    metin += `\n`;
  }

  return new Response(metin, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
