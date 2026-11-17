// Sahibin bu sitedeki imzalı yazılarının yayın tarihleri: [{ site, date }]. Diğer üç site yazar sayfasındaki gün ızgarası
// için bunu derlemede çeker (scripts/yazar-aktivite.mjs). Yalnız tarih ve site; başlık ya da adres yok.
// getNews yayımlanmış yazıları verir (taslak ve tarihi gelmemişler canlı derlemede dışarıda kalır).
import { getNews } from '../lib/news';
import { kisiYazariMi } from '../lib/site';

export async function GET() {
  const poster = (await getNews())
    .filter((h) => kisiYazariMi(h.data))
    .map((h) => ({ site: 'kifobu', date: h.data.date.toISOString() }));
  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
