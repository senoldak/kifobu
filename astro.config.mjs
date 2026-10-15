// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { CATEGORIES } from './src/lib/site.ts';
import { bolumIndekslenir, indekslenir } from './src/lib/indeks.ts';

const categoryRedirects = Object.fromEntries(
  CATEGORIES.map((c) => [`/kategori/${c.slug}`, `/${c.slug}`])
);

const SITE_URL = 'https://kifobu.com';

// Site haritası için haber tarihleri: içerik koleksiyonu yapılandırmada kullanılamadığı için
// ön bilgi (frontmatter) doğrudan okunur. id, Astro'nun glob yükleyicisiyle aynı (klasör/dosya adı).
const HABER_DIZIN = './src/content/haberler';
/** @type {Map<string, { date: Date, modified: Date, draft: boolean, cover: boolean, category: string, indeks: boolean }>} */
const haberBilgi = new Map();
for (const dosya of readdirSync(HABER_DIZIN, { recursive: true, encoding: 'utf8' })) {
  if (!dosya.endsWith('.md')) continue;
  const md = readFileSync(path.join(HABER_DIZIN, dosya), 'utf8');
  const parcalar = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fm = parcalar?.[1] ?? '';
  const tarih = fm.match(/^date:\s*["']?([^"'\r\n]+)/m)?.[1];
  if (!tarih) continue;
  const date = new Date(tarih.trim());
  if (Number.isNaN(date.valueOf())) continue;
  const parca = dosya.replace(/\\/g, '/').replace(/\.md$/, '').split('/');
  if (parca[parca.length - 1] === 'index') parca.pop();
  const id = parca.join('/').toLowerCase();
  // Değişiklik tarihi: ön bilgide updated varsa o, yoksa yayın tarihi (haber sayfasındaki dateModified ile aynı).
  const guncel = fm.match(/^updated:\s*["']?([^"'\r\n]+)/m)?.[1];
  const updated = guncel ? new Date(guncel.trim()) : undefined;
  const modified = updated && !Number.isNaN(updated.valueOf()) ? updated : date;
  const draft = /^draft:\s*true/m.test(fm);
  const category = fm.match(/^category:\s*["']?([\w-]+)/m)?.[1] ?? '';
  // Haber sayfasıyla aynı kural (src/lib/indeks.ts): taslak, noindex işaretli ya da 120 kelimeden kısa haber haritaya girmez.
  const indeks = indekslenir({ draft, noindex: /^noindex:\s*true/m.test(fm), govde: parcalar?.[2] ?? '' });
  haberBilgi.set(id, { date, modified, draft, cover: /^cover:\s*\S/m.test(fm), category, indeks });
}

// İndekslenebilir haberi olmayan bölüm sayfaları (ör. henüz boş Kampanyalar) haritaya girmez.
const indeksliBolumler = new Set(
  CATEGORIES.filter((c) => bolumIndekslenir(c.slug, [...haberBilgi.values()].filter((h) => h.indeks && h.category === c.slug).length)).map((c) => c.slug),
);
const bolumSluglari = new Set(CATEGORIES.map((c) => c.slug));

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      // Yönlendirme sayfaları (/kategori/*), 404, yönetim paneli, noindex haberler ve boş bölümler haritaya girmez.
      // Bölümlerin 2. ve sonraki sayfaları (/<bölüm>/2/) kendi canonical'ıyla haritaya girer.
      filter: (page) => {
        const p = new URL(page).pathname;
        if (p.startsWith('/kategori/') || p.startsWith('/admin') || p.startsWith('/404')) return false;
        const m = p.match(/^\/haber\/([^/]+)\/?$/);
        if (m && !haberBilgi.get(m[1])?.indeks) return false;
        const b = p.match(/^\/([^/]+)\/(?:\d+\/?)?$/)?.[1];
        if (b && bolumSluglari.has(b) && !indeksliBolumler.has(b)) return false;
        return true;
      },
      serialize: (item) => {
        const m = new URL(item.url).pathname.match(/^\/haber\/([^/]+)\/?$/);
        const h = m ? haberBilgi.get(m[1]) : undefined;
        if (!h) return item;
        const out = { ...item, lastmod: h.modified.toISOString() };
        // Kapak resmi yüklenmemiş her haber için künyeden çizilen kapak (1200×675) üretilir.
        if (!h.cover) {
          // @ts-ignore: img alanı sitemap paketine aynen geçer
          out.img = [{ url: `${SITE_URL}/kapak/${m?.[1]}.png` }];
        }
        return out;
      },
    }),
  ],
  redirects: categoryRedirects,
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { inlineStylesheets: 'never' },
  // Aynı nedenle (CSP script-src 'self') küçük betikler de satır içine gömülmez; hepsi /_astro/*.js olarak yüklenir.
  vite: { build: { assetsInlineLimit: 0 } },
});
