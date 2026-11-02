// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from './src/lib/site.ts';
import { bolumIndekslenir, indekslenir } from './src/lib/indeks.ts';
import { onyuzMaddesiYayinda } from './src/lib/yayinda.mjs';
import { satteri } from '@astrojs/markdown-satteri';
import { satteriGraf } from './src/lib/graf/yazi.mjs';
import { satteriSozluk } from './src/lib/sozluk.mjs';

const sozluk = JSON.parse(readFileSync('./src/data/sozluk.json', 'utf8'));
import { grafEtkilesimDenetle } from './src/lib/graf/etkilesim-denetim.mjs';

// Grafiği olan her sayfa etkileşim betiğini yüklemeli; eksikse grafik sessizce statik kalır, o yüzden derleme durur.
const grafEtkilesim = () => ({
  name: 'graf-etkilesim',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const { sayfa, grafik, hatalar } = await grafEtkilesimDenetle(fileURLToPath(dir));
      if (hatalar.length) throw new Error(`Etkileşimsiz grafik (${hatalar.length}):\n${hatalar.slice(0, 20).join('\n')}`);
      logger.info(`${sayfa} sayfada ${grafik} grafik: hepsi etkileşimli.`);
    },
  },
});

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
  // Tarihi gelmemiş (planlanmış) yazı vakti gelene kadar ne haritaya ne IndexNow'a girer (src/lib/yayinda.mjs).
  if (!onyuzMaddesiYayinda(md)) continue;
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
  // Yazı işleri yazısı site haritasında ayrı parçaya girer (bkz. chunks).
  const ozel = /^uretim:\s*["']?yazi-isleri/m.test(fm);
  haberBilgi.set(id, { date, modified, draft, cover: /^cover:\s*\S/m.test(fm), category, indeks, ozel });
}

const haberKimligi = (/** @type {string} */ url) => new URL(url).pathname.match(/^\/haber\/([^/]+)\/?$/)?.[1] ?? '';

// İndekslenebilir haberi olmayan bölüm sayfaları (ör. henüz boş Kampanyalar) haritaya girmez.
const indeksliBolumler = new Set(
  CATEGORIES.filter((c) => bolumIndekslenir(c.slug, [...haberBilgi.values()].filter((h) => h.indeks && h.category === c.slug).length)).map((c) => c.slug),
);
const bolumSluglari = new Set(CATEGORIES.map((c) => c.slug));

// Son güvenlik ağı: derlenen sayfası "noindex" taşıyan hiçbir adres haritaya girmez. Konu, platform, bülten günü ve
// rapor sayfalarının indeks kuralı sayfanın kendisinde (src/lib/konular.ts, gunler.ts, rapor.ts) hesaplanır; harita
// aynı kararı derlenmiş HTML'den okur, kural iki yerde tutulmaz. Site haritası derleme bittikten sonra yazılır.
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const noindexSayfa = (/** @type {string} */ p) => {
  const dosya = path.join(DIST, p, 'index.html');
  return existsSync(dosya) && /<meta\s+name="robots"\s+content="noindex/.test(readFileSync(dosya, 'utf8'));
};

// https://astro.build/config
export default defineConfig({
  // Astro 7 varsayılanı "jsx": satır sonundaki boşluğu etiket kenarında siler (ör. "</a>" + yeni satır + "kelime" bitişik çıkar). true: tek boşluğa indirir.
  compressHTML: true,
  site: SITE_URL,
  integrations: [
    sitemap({
      // Yönlendirme sayfaları (/kategori/*), 404, yönetim paneli, noindex haberler ve boş bölümler haritaya girmez.
      // Bölümlerin 2. ve sonraki sayfaları (/<bölüm>/2/) kendi canonical'ıyla haritaya girer.
      filter: (page) => {
        const p = new URL(page).pathname;
        // Arama sayfası noindex (sonuçlar tarayıcıda üretilir); arama dizini (JSON) sayfa değildir.
        if (p.startsWith('/arama') || p.endsWith('.json')) return false;
        if (p.startsWith('/kategori/') || p.startsWith('/404')) return false;
        const m = p.match(/^\/haber\/([^/]+)\/?$/);
        if (m && !haberBilgi.get(m[1])?.indeks) return false;
        const b = p.match(/^\/([^/]+)\/(?:\d+\/?)?$/)?.[1];
        if (b && bolumSluglari.has(b) && !indeksliBolumler.has(b)) return false;
        return !noindexSayfa(p);
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
      // Site haritası türe göre bölünür (sitemap-<tür>-0.xml; geri kalan sitemap-pages-0.xml). Search Console'da her
      // harita ayrı gönderilir; "Sayfa dizine ekleme" raporu böylece her türün dizin oranını ayrı gösterir.
      // Eklenti parçaları birbirinden ayırmaz, koşullar örtüşmemeli.
      chunks: {
        ozel: (item) => (haberBilgi.get(haberKimligi(item.url))?.ozel ? item : undefined),
        haber: (item) => {
          const h = haberBilgi.get(haberKimligi(item.url));
          return h && !h.ozel ? item : undefined;
        },
        bulten: (item) => (new URL(item.url).pathname.startsWith('/gunluk-bulten/') ? item : undefined),
        veri: (item) =>
          /^\/(kampanya|kampanyalar|platform|platformlar|mkk-verileri|grafikler)\//.test(new URL(item.url).pathname) ? item : undefined,
        rehber: (item) => (/^\/(rehber|mevzuat)\//.test(new URL(item.url).pathname) ? item : undefined),
      },
    }),
    grafEtkilesim(),
  ],
  // Astro 7 Sätteri kullanır; yazılardaki graf-N.svg, yanında graf-N.json varsa etkileşimli karta döner (src/lib/graf/yazi.mjs).
  // Sözcük açıklamaları: haber başına en çok üç terim, kifobu sözlüğünden (src/lib/sozluk.mjs, src/data/sozluk.json).
  markdown: { processor: satteri({ hastPlugins: [satteriGraf(), satteriSozluk(sozluk)] }) },
  redirects: categoryRedirects,
  // CSP (public/_headers) satır içi stile izin vermez; tüm CSS ayrı dosya olarak yüklenir.
  build: { inlineStylesheets: 'never' },
  // Aynı nedenle (CSP script-src 'self') küçük betikler de satır içine gömülmez; hepsi /_astro/*.js olarak yüklenir.
  vite: { build: { assetsInlineLimit: 0 } },
});
