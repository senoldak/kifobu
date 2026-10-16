// Haftalık e-posta bülteninin içeriği (derlemede üretilir, Worker okur: worker/bulten.ts → haftalikGonderim).
// Son 7 günün indekslenebilir haberleri (bülten yazıları hariç) ve o hafta takibe alınan kampanyalar.
import { getNews } from '../../lib/news';
import { indekslenir } from '../../lib/indeks.ts';
import { kampanyalar } from '../../lib/kampanya.ts';
import { arsivKayitlari } from '../../lib/arsiv/yukle.ts';

const SITE_URL = 'https://kifobu.com';
const HAFTA_MS = 7 * 86_400_000;

export async function GET() {
  const simdi = Date.now();
  const alt = simdi - HAFTA_MS;
  const news = await getNews();
  const haberler = news
    .filter(
      (h) =>
        h.data.category !== 'gunluk-bulten' &&
        h.data.date.valueOf() >= alt &&
        indekslenir({ draft: h.data.draft, noindex: h.data.noindex, govde: h.body }),
    )
    .map((h) => ({
      baslik: h.data.title,
      ozet: h.data.description,
      url: `${SITE_URL}/haber/${h.id}/`,
      tarih: h.data.date.toISOString(),
    }));
  const kampanyaSayfalari = kampanyalar(arsivKayitlari())
    .filter((k) => Date.parse(k.ilkTarih) >= alt)
    .map((k) => ({
      baslik: `${k.ad} kampanyası`,
      ozet: 'Kampanya künyesi ve günlük seyri',
      url: `${SITE_URL}/kampanya/${k.slug}/`,
      tarih: `${k.ilkTarih}T00:00:00+03:00`,
    }));
  return new Response(JSON.stringify({ uretildi: new Date(simdi).toISOString(), haberler, kampanyalar: kampanyaSayfalari }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
