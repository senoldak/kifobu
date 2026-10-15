// Yayından sonra son 48 saatin haberlerini ve anasayfayı IndexNow'a bildirir (Bing, Yandex, Seznam, Naver).
// Hiçbir koşulda iş akışını düşürmez: hata olursa yalnızca günlüğe yazar.
import { readFileSync } from 'node:fs';

const HOST = 'kifobu.com';
const KEY = '9ef756edd49eaf2d6e038e02a80335ac';
const SITE = `https://${HOST}`;

try {
  let xml = '';
  try {
    xml = readFileSync('dist/news-sitemap.xml', 'utf8');
  } catch {
    console.log('IndexNow: dist/news-sitemap.xml okunamadı; yalnızca anasayfa gönderiliyor.');
  }
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/&amp;/g, '&').trim())
    .filter((u) => u.startsWith(`${SITE}/`));
  const urlList = [...new Set([`${SITE}/`, ...urls])].slice(0, 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
    signal: AbortSignal.timeout(30_000),
  });
  console.log(`IndexNow: ${urlList.length} adres gönderildi, yanıt ${res.status} ${res.statusText}`);
  const metin = await res.text().catch(() => '');
  if (metin) console.log(metin.slice(0, 500));
} catch (err) {
  console.log(`IndexNow: gönderilemedi (${err?.message ?? err})`);
}
