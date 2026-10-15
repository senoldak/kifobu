// Bültenler (Türkiye saati): sabah 09:00, öğle 13:00, gece 23:00 (18:00'de tablolu kapanış var; akşam yalnız elle): son bültenden bu yana yayına giren
// haberleri tek yazıda toplar ve "Günlük Bülten" kategorisine yazar. Telegram'a mecmua-saat kuyruğu gönderir (kapak + bağlantılı başlıklar); masa görseli yalnız 18:00 kapanışta.
// Kapakta saat yazmaz. Başlık ve slug tarihi taşır ("Sabah Bülteni — 15 Ekim 2026", sabah-bulteni-15-ekim-2026):
// tarihsiz başlıklar her gün aynı olduğu için arama sonuçlarında ve listelerde birbirinden ayrılmıyordu (2026-10-15).
// Kullanım: node scripts/bot/ozet-bulten.mjs [sabah|ogle|aksam|gece]  (verilmezse Türkiye saatinden seçilir)
import path from 'node:path';
import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const HER = path.dirname(fileURLToPath(import.meta.url));
const HABERLER = path.resolve(HER, '../../src/content/haberler');
const KATEGORI = 'gunluk-bulten';
const AZAMI_YAS_MS = 24 * 3600e3;
const EN_AZ = 1;

export const DONEMLER = { sabah: 'Sabah', ogle: 'Öğle', aksam: 'Akşam', gece: 'Gece' };

export function donemSec(simdi) {
  const saat = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hourCycle: 'h23' }).format(simdi));
  if (saat >= 5 && saat < 11) return 'sabah';
  if (saat >= 11 && saat < 16) return 'ogle';
  if (saat >= 16 && saat < 21) return 'aksam';
  return 'gece';
}

// Basit ön bilgi okuyucu: yalnız bu betiğin ihtiyaç duyduğu düz alanlar.
function onBilgi(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const d = {};
  for (const satir of m[1].split(/\r?\n/)) {
    const i = satir.indexOf(':');
    if (i < 1 || /^\s/.test(satir)) continue;
    let v = satir.slice(i + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    }
    d[satir.slice(0, i).trim()] = v;
  }
  return d;
}

const tirnak = (s) => JSON.stringify(s);
/** "Sabah Bülteni — 15 Ekim 2026" */
export const bultenBasligi = (ad, gun) => `${ad} Bülteni — ${gun}`;
const mdMetin = (s) => s.replace(/([\[\]])/g, '\\$1');

export function bultenYaz({ donem, simdi, haberler }) {
  const ad = DONEMLER[donem];
  const gun = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' }).format(simdi);
  const gunSlug = gun.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/\s+/g, '-');
  const slug = `${donem}-bulteni-${gunSlug}`;
  const basliklar = haberler.slice(0, 3).map((h) => h.title);
  const description = `${ad} bülteninde ${haberler.length} haber: ${basliklar.join('; ')}${haberler.length > 3 ? ' ve diğerleri' : ''}.`;
  const govde = haberler.map((h) => `- [${mdMetin(h.title)}](/haber/${h.slug}/)`).join('\n');
  const md = `---
title: ${tirnak(bultenBasligi(ad, gun))}
description: ${tirnak(description)}
date: ${simdi.toISOString()}
category: ${KATEGORI}
coverAlt: ${tirnak(`kifobu ${ad.toLocaleLowerCase('tr-TR')} bülteni`)}
uretim: yapay-zeka
---

Son bültenden bu yana kifobu'da yayımlanan haberler:

${govde}
`;
  return { slug, md };
}

async function var_(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function calistir({ simdi = new Date(), donem = donemSec(simdi), kok = HABERLER } = {}) {
  if (!DONEMLER[donem]) throw new Error(`Geçersiz dönem: ${donem}`);
  const tumu = [];
  for (const k of await readdir(kok, { withFileTypes: true })) {
    if (!k.isDirectory()) continue;
    const dosya = path.join(kok, k.name, 'index.md');
    if (!(await var_(dosya))) continue;
    const d = onBilgi(await readFile(dosya, 'utf8'));
    if (!d || d.draft === 'true') continue;
    tumu.push({ slug: k.name, title: d.title, category: d.category, tarih: new Date(d.date) });
  }
  const sonBulten = Math.max(0, ...tumu.filter((h) => h.category === KATEGORI).map((h) => h.tarih.getTime()));
  const haberler = tumu
    .filter((h) => h.category !== KATEGORI && h.tarih.getTime() > sonBulten && simdi - h.tarih <= AZAMI_YAS_MS && h.tarih <= simdi)
    .sort((a, b) => b.tarih - a.tarih);
  if (haberler.length < EN_AZ) {
    console.log('Bülten için yeni haber yok.');
    return null;
  }
  const { slug, md } = bultenYaz({ donem, simdi, haberler });
  const klasor = path.join(kok, slug);
  if (await var_(klasor)) {
    console.log(`${slug} zaten var, atlandı.`);
    return null;
  }
  await mkdir(klasor, { recursive: true });
  await writeFile(path.join(klasor, 'index.md'), md, 'utf8');
  console.log(`Yazıldı: ${slug} (${haberler.length} haber)`);
  return slug;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const slug = await calistir({ donem: process.argv[2] || undefined });
  if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `yazildi=${slug ? 1 : 0}\n`, { flag: 'a' });
}
