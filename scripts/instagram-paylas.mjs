// Sabah/öğle bülteni ve Günün Özeti Instagram'a post (1080×1350) + story (1080×1920) olarak gider (sahibi, 14 Kasım 2026).
// 18:00 kapanış bülteni bu betiği kullanmaz: o kendi yolundadır (scripts/bulten-meta-gonder.ts, bulten-otomasyon.yml).
// Sayfa yayına girene kadar bekler (en çok 15 dk), metni sayfadan kurar ve Meta Graph API ile yayımlar.
// Metin Telegram iletisinin aynısıdır; Instagram metindeki bağlantıya tıklatmadığı için bağlantı satırı çıkarılır
// (18:00 gibi), sonuna sitenin etiketleri eklenir.
// Kullanım: node scripts/instagram-paylas.mjs bulten <slug>   |   node scripts/instagram-paylas.mjs ozet <YYYY-AA-GG>
// Ortam: INSTAGRAM_USER_ID + META_TOKEN (ya da INSTAGRAM_TOKEN); yoksa sessizce atlanır.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://kifobu.com';
const API = 'v25.0';
const ETIKETLER = '#kitlefonlama #girişim #yatırım';
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const trTarih = (t) => {
  const [y, a, g] = t.split('-').map(Number);
  return `${g} ${AYLAR[a - 1]} ${y}`;
};

const varlik = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&').trim();
const metaAl = (html, ad) => {
  const etiket = html.match(new RegExp(`<meta[^>]*\\bname="${ad}"[^>]*>`))?.[0];
  return etiket ? varlik(etiket.match(/\bcontent="([^"]*)"/)?.[1] ?? '') : undefined;
};
const ogBaslik = (html) => varlik(html.match(/property="og:title" content="([^"]*)"/)?.[1] ?? '');

/** Gönderinin adresleri: sayfa, post ve story görseli. */
export function adresler(tur, kimlik) {
  return tur === 'ozet'
    ? { sayfa: `${SITE}/gunun-ozeti/${kimlik}/`, post: `${SITE}/kapak/gunun-ozeti/dikey/${kimlik}.png`, story: `${SITE}/kapak/gunun-ozeti/story/${kimlik}.png` }
    : { sayfa: `${SITE}/haber/${kimlik}/`, post: `${SITE}/kapak/dikey/${kimlik}.png`, story: `${SITE}/kapak/story/${kimlik}.png` };
}

/**
 * Instagram metni, sayfanın HTML'inden (Telegram iletisiyle aynı içerik). Sayfa hazır değilse null:
 * özette o günün gunun-ozeti meta etiketi ve paragrafı, bültende <article> içindeki haber bağlantıları gerekir.
 */
export function igMetni(tur, kimlik, html) {
  if (tur === 'ozet') {
    const paragraf = metaAl(html, 'gunun-ozeti-paragraf');
    if (metaAl(html, 'gunun-ozeti') !== kimlik || !paragraf) return null;
    return `📰 Günün Özeti · ${trTarih(kimlik)}\n\n${paragraf}\n\n${ETIKETLER}`;
  }
  const bas = html.indexOf('<article');
  if (bas < 0) return null;
  const maddeler = [...html.slice(bas).matchAll(/<li[^>]*>\s*<a href="\/haber\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => varlik(m[1].replace(/<[^>]+>/g, '')));
  if (!maddeler.length) return null;
  return `📰 ${ogBaslik(html)}\n\n${maddeler.map((m) => `• ${m}`).join('\n')}\n\n${ETIKETLER}`;
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function graph(kok, yol, alanlar, token, yontem = 'POST') {
  const q = new URLSearchParams({ ...alanlar, access_token: token });
  const res = await fetch(yontem === 'POST' ? `${kok}/${API}/${yol}` : `${kok}/${API}/${yol}?${q}`, {
    method: yontem,
    ...(yontem === 'POST' && { body: q }),
    signal: AbortSignal.timeout(60_000),
  });
  const v = await res.json().catch(() => ({}));
  if (!res.ok || v.error) throw new Error(`Graph ${res.status}: ${v.error?.message ?? 'bilinmeyen hata'}`);
  return v;
}

async function yayimla(kok, kullanici, token, alanlar) {
  const kap = await graph(kok, `${kullanici}/media`, alanlar, token);
  for (let i = 0; i < 20; i++) {
    const { status_code } = await graph(kok, kap.id, { fields: 'status_code' }, token, 'GET');
    if (status_code === 'FINISHED') break;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram medya kabı: ${status_code}`);
    await bekle(3_000);
  }
  return (await graph(kok, `${kullanici}/media_publish`, { creation_id: kap.id }, token)).id;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [tur, kimlik] = process.argv.slice(2);
  if (!['bulten', 'ozet'].includes(tur) || !kimlik || !/^[a-z0-9-]+$/.test(kimlik)) {
    console.error('Kullanım: node scripts/instagram-paylas.mjs bulten <slug> | ozet <YYYY-AA-GG>');
    process.exit(1);
  }
  const kullanici = process.env.INSTAGRAM_USER_ID;
  const token = process.env.INSTAGRAM_TOKEN || process.env.META_TOKEN;
  if (!kullanici || !token) {
    console.log('[IG] INSTAGRAM_USER_ID ya da token yok, Instagram paylaşımı atlandı.');
    process.exit(0);
  }
  const gizle = (m) => String(m).replaceAll(token, '[REDACTED_TOKEN]');
  const a = adresler(tur, kimlik);
  // Sayfa ve görseller yayına girene kadar bekle (en çok 15 dk).
  let metin = null;
  for (let i = 0; i < 30 && !metin; i++) {
    const res = await fetch(a.sayfa, { headers: { 'cache-control': 'no-cache' } }).catch(() => null);
    if (res?.ok) metin = igMetni(tur, kimlik, await res.text());
    if (metin) {
      const gorseller = await Promise.all([a.post, a.story].map((u) => fetch(u, { method: 'HEAD' }).then((r) => r.ok, () => false)));
      if (!gorseller.every(Boolean)) metin = null;
    }
    if (!metin) await bekle(30_000);
  }
  if (!metin) {
    console.error(`[IG] ${a.sayfa} 15 dakikada hazır olmadı; Instagram'a gönderilmedi.`);
    process.exit(1);
  }
  const kok = token.startsWith('IG') ? 'https://graph.instagram.com' : 'https://graph.facebook.com';
  const surum = `?v=${Date.now()}`;
  let hata = false;
  for (const [ad, alanlar] of [
    ['post', { image_url: a.post + surum, caption: metin }],
    ['story', { image_url: a.story + surum, media_type: 'STORIES' }],
  ]) {
    try {
      console.log(`[IG] ${ad} yayımlandı: ${await yayimla(kok, kullanici, token, alanlar)}`);
    } catch (e) {
      hata = true;
      console.error(`[IG] ${ad} gönderilemedi: ${gizle(e.message)}`);
    }
  }
  if (hata) process.exit(1);
}
