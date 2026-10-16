// Worker giriş noktası. /api/* istekleri bülten uç noktalarına gider; diğer her şey statik dosyalardır (ASSETS).
// Zamanlı görev (cron) haftalık e-posta bülteninin gönderimidir.
import { abonelikIstegi, ayrilIstegi, ayrilSayfasi, haftalikGonderim, onayIstegi, type Ortam } from './bulten.ts';

async function api(istek: Request, ortam: Ortam): Promise<Response> {
  const yol = new URL(istek.url).pathname.replace(/\/+$/, '');
  if (istek.method === 'POST' && yol === '/api/bulten/abone') return abonelikIstegi(istek, ortam);
  if (istek.method === 'GET' && yol === '/api/bulten/onay') return onayIstegi(istek, ortam);
  if (istek.method === 'GET' && yol === '/api/bulten/ayril') return ayrilSayfasi(istek);
  if (istek.method === 'POST' && yol === '/api/bulten/ayril') return ayrilIstegi(istek, ortam);
  return new Response('Bulunamadı', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export default {
  async fetch(istek: Request, ortam: Ortam): Promise<Response> {
    if (!new URL(istek.url).pathname.startsWith('/api/')) return ortam.ASSETS.fetch(istek);
    const yanit = await api(istek, ortam);
    // Abonelik verisi içeren yanıtlar önbelleğe alınmaz.
    yanit.headers.set('Cache-Control', 'no-store');
    return yanit;
  },

  async scheduled(_olay: unknown, ortam: Ortam): Promise<void> {
    const sonuc = await haftalikGonderim(ortam);
    console.log(`[BULTEN] Haftalık gönderim: ${sonuc}`);
  },
};
