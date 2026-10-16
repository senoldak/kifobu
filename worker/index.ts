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

// Günlük bülten görevi mecmua-saat Worker'ından service binding ile tetiklenir (POST /api/bulten/gorev).
// Cloudflare ücretsiz planında hesap başına 5 cron sınırı olduğu için sitelerin kendi cron'u yok.
// İstek GOREV_ANAHTARI Worker secret'ı ile doğrulanır; anahtar yoksa uç nokta kapalıdır.
async function gorevYetkili(istek: Request, anahtar?: string): Promise<boolean> {
  if (!anahtar || istek.method !== 'POST') return false;
  if (new URL(istek.url).pathname.replace(/\/+$/, '') !== '/api/bulten/gorev') return false;
  const gelen = new TextEncoder().encode(istek.headers.get('Authorization') ?? '');
  const beklenen = new TextEncoder().encode('Bearer ' + anahtar);
  if (gelen.byteLength !== beklenen.byteLength) return false;
  return (crypto.subtle as any).timingSafeEqual(gelen, beklenen);
}

export default {
  async fetch(istek: Request, ortam: Ortam): Promise<Response> {
    if (await gorevYetkili(istek, (ortam as any).GOREV_ANAHTARI)) {
      const sonuc = await haftalikGonderim(ortam);
      console.log('[BULTEN] Günlük görev: ' + sonuc);
      return new Response(String(sonuc), { headers: { 'Cache-Control': 'no-store' } });
    }
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
