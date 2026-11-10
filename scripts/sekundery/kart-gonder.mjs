// Sekundery paylaşım kartlarını PNG olarak üretir ve Telegram'a albüm olarak gönderir.
// Kart verisi ve çizimi sitedekiyle aynıdır (src/lib/sekundery-kartlar.mjs, sekundery-kart-svg.mjs); veri modülü Vite
// içinde yüklenir (JSON ve günlük dosya içe aktarımı için). Çizim yazıları zaten yola çevirir; sistem yazı tipi gerekmez.
//
//   node scripts/sekundery/kart-gonder.mjs --yerel   → yalnız dist-sekundery/*.png yazar, göndermez
//   node scripts/sekundery/kart-gonder.mjs           → yazar ve gönderir
//
// TELEGRAM_BOT_TOKEN: kifobu botu. SEKUNDERY_TG_HEDEF: hedef sohbet(ler), virgülle; "sohbet:konu" biçimi de olur.
// Biri eksikse gönderim atlanır (hata değil). Son veri bugünün (İstanbul) değilse gönderilmez: eski kart gitmesin.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import sharp from 'sharp';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cikti = path.join(kok, 'dist-sekundery');
const yerel = process.argv.includes('--yerel');

function hedefler() {
  return (process.env.SEKUNDERY_TG_HEDEF ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [sohbet, konu] = s.split(':');
    return { sohbet: sohbet.trim(), konu: konu?.trim() || undefined };
  });
}

const istanbulBugun = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());

async function main() {
  const vite = await createServer({ root: kok, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false } });
  let veri, cizim;
  try {
    veri = (await vite.ssrLoadModule('/src/lib/sekundery-kartlar.mjs')).kartVerileri();
    cizim = await vite.ssrLoadModule('/src/lib/sekundery-kart-svg.mjs');
  } finally {
    await vite.close();
  }
  const { tarih, gun, kartlar } = veri;
  if (!kartlar.length) {
    console.log('[SEKUNDERY KART] Kart yok (veri boş), atlandı.');
    return;
  }
  fs.mkdirSync(cikti, { recursive: true });
  const dosyalar = [];
  for (const k of kartlar) {
    const svg = cizim.kartSvg(k, tarih);
    const ad = `${k.id.replace('kart-', '')}.png`;
    const yol = path.join(cikti, ad);
    await sharp(Buffer.from(svg)).png().toFile(yol);
    dosyalar.push({ ad, yol });
  }
  console.log(`[SEKUNDERY KART] ${dosyalar.length} kart çizildi (${gun}).`);
  if (yerel) return;

  if (gun !== istanbulBugun()) {
    console.log(`[SEKUNDERY KART] Son veri ${gun}, bugün değil; gönderilmedi.`);
    return;
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const hedef = hedefler();
  if (!token || !hedef.length) {
    console.log('[SEKUNDERY KART] TELEGRAM_BOT_TOKEN veya SEKUNDERY_TG_HEDEF yok, gönderim atlandı.');
    return;
  }
  const gizle = (m) => String(m ?? '').replaceAll(token, '[GİZLİ]');
  const aciklama = `Sekundery · ${tarih}\nYayındaki pay ilanlarından günlük kartlar.\nGerçekleşen işlem değildir; yatırım tavsiyesi değildir.\n\nhttps://kifobu.com/sekundery/`;
  let basarisiz = 0;
  // Telegram albümü en çok 10 görsel alır
  for (let i = 0; i < dosyalar.length; i += 10) {
    const parca = dosyalar.slice(i, i + 10);
    for (const [n, h] of hedef.entries()) {
      const form = new FormData();
      form.append('chat_id', h.sohbet);
      if (h.konu) form.append('message_thread_id', h.konu);
      form.append('media', JSON.stringify(parca.map((d, j) => ({ type: 'photo', media: `attach://k${j}`, ...(i === 0 && j === 0 ? { caption: aciklama } : {}) }))));
      parca.forEach((d, j) => form.append(`k${j}`, new Blob([fs.readFileSync(d.yol)], { type: 'image/png' }), d.ad));
      try {
        const yanit = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, { method: 'POST', body: form, signal: AbortSignal.timeout(60_000) });
        const j = await yanit.json();
        if (j.ok) console.log(`[SEKUNDERY KART] ✓ hedef ${n + 1}: ${parca.length} kart gönderildi.`);
        else { basarisiz++; console.error(`[SEKUNDERY KART] ! hedef ${n + 1} reddetti: ${gizle(j.description)}`); }
      } catch (e) {
        basarisiz++;
        console.error(`[SEKUNDERY KART] ! hedef ${n + 1} istek hatası: ${gizle(e?.message)}`);
      }
    }
  }
  if (basarisiz) process.exitCode = 1;
}

main().catch((e) => {
  console.error('[SEKUNDERY KART] Hata:', e?.message ?? e);
  process.exit(1);
});
