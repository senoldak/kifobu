// Worker: yalnız POST /api/fayda ("Bu haber işine yaradı mı?") burada karşılanır; öteki her istek statik dosyalara gider.
// Yalnız gün, haber ve yanıt başına anonim bir sayı tutulur: IP, başlık bilgisi ya da çerez saklanmaz.
// Tablo tidsrøst'ün sayaç veritabanında ayrı (kifobu_fayda); ilk istekte yoksa kurulur (worker/schema.sql ile aynı).
import { istanbulGunu, yanitDogrula } from './dogrula.mjs';

const TABLO = `CREATE TABLE IF NOT EXISTS kifobu_fayda (
  gun TEXT NOT NULL,
  slug TEXT NOT NULL,
  yanit TEXT NOT NULL CHECK (yanit IN ('evet', 'hayir')),
  sayi INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gun, slug, yanit)
)`;
let tabloHazir = false;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/fayda') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    if (Number(request.headers.get('content-length') || 0) > 1024) return new Response(null, { status: 400 });
    const y = yanitDogrula(await request.text(), request.headers.get('content-type'));
    if (!y.tamam) return new Response(null, { status: 400 });
    if (!tabloHazir) {
      await env.DB.prepare(TABLO).run();
      tabloHazir = true;
    }
    await env.DB.prepare(
      'INSERT INTO kifobu_fayda (gun, slug, yanit, sayi) VALUES (?1, ?2, ?3, 1) ON CONFLICT(gun, slug, yanit) DO UPDATE SET sayi = sayi + 1',
    )
      .bind(istanbulGunu(), y.slug, y.yanit)
      .run();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  },
};
