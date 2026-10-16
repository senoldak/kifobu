// Haber botu için ortak yardımcılar: indirme, RSS okuma, HTML temizleme, Gemini, dosya yazma.
// tidsrost'un botundan uyarlandı (scripts/nyheter/lib.mjs); paket gerektirmez, sadece Node 22.
import { mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { kullanimEkle, hataEkle, amacBul } from './kullanim.mjs';

export const USER_AGENT = 'kifobu-bot/1.0 (+https://kifobu.com; iletisim@kifobu.com)';

// Botun yazabileceği kategoriler. Sitedeki tam liste src/lib/site.ts ve public/admin/config.yml'dadır;
// buradakiler o listenin alt kümesi olmalı. gundem, yapay-zeka, donanim ve dunya kifobu'nun konusu olmadığı için
// bot çıktısından çıkarıldı (2026-10-15); eski haberler sitede kalır. gunluk-bulten'i ozet-bulten.mjs yazar.
export const KATEGORILER = ['yatirimlar', 'kampanyalar', 'platformlar', 'mevzuat', 'girisimler', 'analiz'];
export const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR', 'GBP'];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function hentTekst(url, headers = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Geçersiz protokol: ${parsed.protocol}`);
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    throw new Error(`Yasaklı sunucu adresi: ${hostname}`);
  }
  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const b1 = Number(ipMatch[1]);
    const b2 = Number(ipMatch[2]);
    if (b1 === 0 || b1 === 10 || b1 === 127 || (b1 === 169 && b2 === 254) || (b1 === 192 && b2 === 168) || (b1 === 172 && b2 >= 16 && b2 <= 31)) {
      throw new Error(`Yasaklı özel IP adresi: ${hostname}`);
    }
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      ...headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

// HTML varlıklarını (&#8217; &amp; vb.) çözer.
export function varlikCoz(s = '') {
  const adli = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', laquo: '«', raquo: '»', ndash: '–', mdash: '—', hellip: '…',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', euro: '€', ccedil: 'ç', Ccedil: 'Ç', ouml: 'ö', Ouml: 'Ö', uuml: 'ü', Uuml: 'Ü',
  };
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => adli[n] ?? adli[n.toLowerCase()] ?? m);
}

// HTML'i paragraflı düz metne çevirir.
export function htmlMetin(html = '') {
  return varlikCoz(
    html
      .replace(/<(script|style|figure|figcaption|iframe)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|li|div|blockquote)>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// RSS & Atom akış okuyucu (tam metin content:encoded veya content'ten alınır).
export function rssOku(xml) {
  const alan = (item, tag) => {
    const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
    return m ? varlikCoz(m[1]).trim() : '';
  };

  // 1. Standart RSS 2.0 (<item>)
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)];
  if (items.length > 0) {
    return items.map(([item]) => ({
      guid: alan(item, 'guid'),
      title: alan(item, 'title'),
      link: alan(item, 'link'),
      description: alan(item, 'description'),
      icerik: alan(item, 'content:encoded') || alan(item, 'content'),
      pubDate: alan(item, 'pubDate'),
      kategoriler: [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) => varlikCoz(m[1]).trim()),
    }));
  }

  // 2. Atom akışları (<entry>)
  const entries = [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)];
  return entries.map(([item]) => {
    const linkMatch = item.match(/<link[^>]+href=["']([^"']+)["']/i);
    return {
      guid: alan(item, 'id'),
      title: alan(item, 'title'),
      link: linkMatch ? linkMatch[1] : alan(item, 'link'),
      description: alan(item, 'summary') || alan(item, 'content'),
      icerik: alan(item, 'content'),
      pubDate: alan(item, 'published') || alan(item, 'updated'),
      kategoriler: [...item.matchAll(/<category[^>]+term=["']([^"']+)["']/gi)].map((m) => varlikCoz(m[1]).trim()),
    };
  });
}

// Sveltia CMS ile aynı mantıkta ASCII slug (Türkçe harfler sadeleştirilir); kısaltılmamış hâli.
export function slugTam(s) {
  return s
    .replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const SLUG_EN_FAZLA = 80;

// Slug en fazla 80 karakter; kelime ortasından kesilmez (son tireden kesilir).
export function slugify(s) {
  const tam = slugTam(s);
  if (tam.length <= SLUG_EN_FAZLA) return tam;
  const i = tam.slice(0, SLUG_EN_FAZLA + 1).lastIndexOf('-');
  return (i > 0 ? tam.slice(0, i) : tam.slice(0, SLUG_EN_FAZLA)).replace(/-+$/, '');
}

// İstanbul saatine göre tarih (ör. 2026-10-10T08:15:00+03:00). Türkiye yaz saati uygulamaz.
export function istanbulIso(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+03:00`;
}

// Ücretsiz katmanın dakikalık sınırını aşmamak için istekler arasında en az bu kadar beklenir.
const GEMINI_ARALIK_MS = Number(process.env.GEMINI_ARALIK_MS || 4500);
// Google "meşgul" (5xx) ya da istek sınırı (429) dönerse ana ve yedek model sırayla, giderek uzayan aralıklarla
// denenir (iki model ayrı kapasite ve ayrı ücretsiz kotadır). Bir çağrı tümüyle düşerse aynı çalışmadaki sonraki
// çağrılar yalnız iki kez dener: Google uzun süre kapalıysa iş zaman aşımına düşmesin. İlk başarı bunu sıfırlar.
const GEMINI_BEKLEMELER_SN = [15, 30, 60, 90, 120];
let geminiKesik = false;
let sonGemini = 0;

// Gemini'ye istek atar, JSON şemasına uygun yanıt döner. Anahtar yoksa null.
export async function gemini({ prompt, schema, dusunme: seviye = 'low' }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const bekle = sonGemini + GEMINI_ARALIK_MS - Date.now();
  if (bekle > 0) await sleep(bekle);
  sonGemini = Date.now();
  const modeller = [process.env.GEMINI_MODEL || 'gemini-flash-lite-latest', process.env.GEMINI_YEDEK_MODEL || 'gemini-flash-latest'];
  const carpan = Number(process.env.GEMINI_BEKLE_CARPAN ?? 1);
  const enFazla = geminiKesik ? 2 : GEMINI_BEKLEMELER_SN.length + 1;
  const amac = amacBul(); // Katman 0: çağıran dosya/fonksiyon

  // Düşünme seviyesini düşük tutmak cevabı çok hızlandırıyor; desteklemeyen modelde kapatılır.
  let dusunme = { thinkingLevel: seviye };
  for (let deneme = 1; deneme <= enFazla; deneme++) {
    const model = modeller[(deneme - 1) % modeller.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
          responseSchema: schema,
          ...(dusunme && { thinkingConfig: dusunme }),
        },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (res.status === 400 && dusunme && /thinking/i.test(await res.clone().text())) {
      dusunme = dusunme.thinkingLevel === 'low' ? null : { thinkingLevel: 'low' };
      deneme--;
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      hataEkle(model, amac, res.status);
      console.warn(`  Gemini ${res.status} (${model}), ${deneme}. deneme; bekleniyor...`);
      if (deneme < enFazla) await sleep(GEMINI_BEKLEMELER_SN[deneme - 1] * 1000 * carpan);
      continue;
    }
    if (!res.ok) {
      const raw = await res.text();
      let msg = raw.slice(0, 300);
      try {
        msg = JSON.parse(raw).error?.message ?? msg;
      } catch {}
      const hata = new Error(`Gemini ${res.status}: ${msg}`);
      // Anahtar/model hatası: haberin suçu değil, haber atlanmamalı.
      hata.ayar = [400, 401, 403, 404].includes(res.status);
      throw hata;
    }
    geminiKesik = false;
    const data = await res.json();
    kullanimEkle(data.usageMetadata, { model, amac });
    const metin = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    return JSON.parse(metin);
  }
  geminiKesik = true;
  throw new Error('Gemini: çok fazla deneme');
}

// YAML'da güvenli çift tırnaklı metin.
const yamlStr = (s) => JSON.stringify(String(s));

// Dışarıdan gelen ya da yapay zekânın ürettiği metni güvenli Markdown'a çevirir:
// ham HTML, resimler ve https dışındaki linkler (javascript: vb.) kaldırılır (XSS'e karşı).
export function guvenli(metin = '') {
  return String(metin)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(?:[a-z0-9_-]+|\/)[^>]*>/gi, '')
    .replace(/!\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/\[([^\]]*)\]\(\s*((?:[^()\s]|\([^()\s]*\))*)[^)]*\)/g, (m, txt, url) => (/^https:\/\/[^\s"'<>]+$/i.test(url) ? `[${txt}](${url})` : txt));
}

// Türkçe yazım düzeltmeleri; yapay zekâya bırakmadan her habere en son uygulanır.
// Tablolar (| ile başlayan satırlar) ve linklerin adresleri değiştirilmez.
export function tipografi(metin = '', { baslik = false } = {}) {
  const satirlar = String(metin)
    .split('\n')
    .map((satir) => {
      if (/^\s*\|/.test(satir)) return satir;
      const linkler = [];
      let l = satir.replace(/\]\(([^)]*)\)/g, (m) => `\u0000${linkler.push(m) - 1}\u0000`);
      l = l
        // Yüzde işareti Türkçede sayıdan önce gelir: 5% → %5
        .replace(/(\d+(?:[.,]\d+)?)\s?%/g, '%$1')
        // Boşluklu kısa çizgi → uzun tire
        .replace(/ - /g, ' – ')
        // Noktalama öncesi boşluk ve çift boşluk
        .replace(/ +([,.;:!?])(?=\s|$)/g, '$1')
        .replace(/ {2,}/g, ' ')
        .trimEnd();
      return l.replace(/\u0000(\d+)\u0000/g, (_, i) => linkler[i]);
    });
  let ut = satirlar.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (baslik) ut = ut.replace(/\s*\.$/, '').replace(/\s+/g, ' ');
  return ut;
}

// Son günlerde yayımlanmış haberlerin künyeleri (aynı yatırımı ikinci kez yazmamak için). gun kesirli olabilir.
export async function sonHaberler(rot, gun = 10, simdi = Date.now()) {
  const base = path.join(rot, 'src/content/haberler');
  const sinir = simdi - gun * 86_400_000;
  const out = [];
  for (const klasor of await readdir(base).catch(() => [])) {
    let md;
    try {
      md = await readFile(path.join(base, klasor, 'index.md'), 'utf8');
    } catch {
      continue;
    }
    const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
    const al = (k) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1]?.replace(/^"(.*)"$/, '$1').trim();
    const tarih = Date.parse(al('date') ?? '');
    if (!(tarih >= sinir)) continue;
    out.push({ slug: klasor, tarih, category: al('category'), title: al('title') ?? '', description: al('description') ?? '', girisim: al('girisim'), toplanan: Number(al('toplanan')) || undefined, kaynakUrl: al('kaynakUrl') });
  }
  return out;
}

// Girişim adını karşılaştırma için sadeleştirir ("Getir A.Ş." ~ "getir").
export const adNorm = (s = '') =>
  slugify(String(s).replace(/\b(a\.?ş\.?|inc\.?|ltd\.?|teknoloji|technologies)\b/gi, '')).replace(/-/g, '');

// Haberi src/content/haberler/<slug>/index.md olarak yazar, slug'ı döner.
export async function haberYaz(rot, h) {
  if (!KATEGORILER.includes(h.category)) h.category = 'girisimler';
  h = {
    ...h,
    title: tipografi(guvenli(h.title), { baslik: true }),
    description: tipografi(guvenli(h.description)).replace(/\s+/g, ' '),
    body: tipografi(guvenli(h.body)),
  };
  const base = path.join(rot, 'src/content/haberler');
  let slug = slugify(h.title) || 'haber';
  for (let i = 2; ; i++) {
    try {
      await access(path.join(base, slug));
      slug = `${slugify(h.title)}-${i}`;
    } catch {
      break;
    }
  }
  const k = h.kunye ?? {};
  const sayi = (n) => (Number.isFinite(n) && n > 0 ? Math.round(n) : undefined);
  const fm = [
    '---',
    `title: ${yamlStr(h.title)}`,
    `description: ${yamlStr(h.description)}`,
    `date: ${h.date}`,
    `category: ${h.category}`,
    h.draft ? 'draft: true' : null,
    k.girisim ? `girisim: ${yamlStr(k.girisim)}` : null,
    k.girisim && sayi(k.toplanan) ? `toplanan: ${sayi(k.toplanan)}` : null,
    k.girisim && sayi(k.toplanan) && PARA_BIRIMLERI.includes(k.paraBirimi) ? `paraBirimi: ${k.paraBirimi}` : null,
    k.girisim && sayi(k.hedef) ? `hedef: ${sayi(k.hedef)}` : null,
    k.platform ? `platform: ${yamlStr(k.platform)}` : null,
    k.tur ? `tur: ${yamlStr(k.tur)}` : null,
    k.yatirimcilar ? `yatirimcilar: ${yamlStr(k.yatirimcilar)}` : null,
    sayi(k.yatirimci) ? `yatirimci: ${sayi(k.yatirimci)}` : null,
    h.why_matters?.trim() ? `why_matters: ${yamlStr(h.why_matters.trim())}` : null,
    Array.isArray(h.key_points) && h.key_points.filter(Boolean).length
      ? `key_points:\n${h.key_points.filter(Boolean).map((p) => `  - ${yamlStr(p)}`).join('\n')}`
      : null,
    // Kaynakların şifreli kaydı (bkz. gizli.mjs); sitede gösterilmez.
    h.kaynakIzi ? `kaynakIzi: ${yamlStr(h.kaynakIzi)}` : null,
    'uretim: yapay-zeka',
    '---',
  ].filter(Boolean);
  await mkdir(path.join(base, slug), { recursive: true });
  await writeFile(path.join(base, slug, 'index.md'), `${fm.join('\n')}\n\n${h.body.trim()}\n`, 'utf8');
  return slug;
}

export async function jsonOku(dosya, yedek) {
  try {
    return JSON.parse(await readFile(dosya, 'utf8'));
  } catch {
    return yedek;
  }
}
