// Yazılardaki grafikler: `![…](./graf-N.svg)` resmi, yanında `graf-N.json` (grafik setinin şeması, resmî rakamlar, alt
// metinle doğrulanmış) varsa aynı veriyle etkileşimli karta döner. JSON yoksa ya da geçersizse resim olduğu gibi kalır.
// RSS, kapak ve arama dosyaları markdown'dan okur; onlarda resim kalır. tidsrøst src/lib/graf/forklart.mjs uyarlaması.
// kifobu'da grafik ve italik açıklaması boş satırsız yazılınca başka bir grafikle ya da metinle aynı paragrafa düşüyor:
// paragraf her grafikte bölünür, kalan metin kendi paragrafında kalır.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { grafHtml } from './html.mjs';
import { nyId } from './index.mjs';
import { validerGraf } from './sema.mjs';

const GRAF = /^\.\/(graf-\d+)\.svg$/;
const bosMetin = (c) => c?.type === 'text' && !c.value.trim();
const duzMetinliEm = (c) => c?.type === 'element' && c.tagName === 'em' && c.children?.length > 0 && c.children.every((x) => x.type === 'text');

/** graf-N.json okunabilir ve geçerliyse veri; değilse null (resim kalır, derleme düşmez). */
function grafVerisi(src, mappe) {
  const m = String(src ?? '').match(GRAF);
  if (!m) return null;
  const fil = join(mappe, `${m[1]}.json`);
  if (!existsSync(fil)) return null;
  try {
    const data = JSON.parse(readFileSync(fil, 'utf8'));
    const hata = validerGraf(data);
    if (hata.length) {
      console.warn(`[yazi-graf] ${fil}: ${hata.join('; ')} (resim kalır)`);
      return null;
    }
    return data;
  } catch (e) {
    console.warn(`[yazi-graf] ${fil}: ${e.message} (resim kalır)`);
    return null;
  }
}

/**
 * Paragrafın yerine geçecek düğümler: her grafik resmi (ve hemen ardındaki, yalnız metin taşıyan italik açıklama) bir kart
 * olur, araya düşen metin paragraf olarak kalır. Paragrafta karta dönen grafik yoksa null.
 * Açıklama kartın altında aynen yazılır; kartın kendi alt başlığı ve kaynak satırı o zaman çıkmaz.
 */
export function grafDugumleri(p, mappe) {
  const cocuk = p.children ?? [];
  const cikti = [];
  let tampon = [];
  let degisti = false;
  const bosalt = () => {
    while (bosMetin(tampon[0])) tampon.shift();
    while (bosMetin(tampon.at(-1))) tampon.pop();
    if (tampon.length) cikti.push({ ...p, children: tampon });
    tampon = [];
  };
  for (let i = 0; i < cocuk.length; i++) {
    const c = cocuk[i];
    const data = c.type === 'element' && c.tagName === 'img' ? grafVerisi(c.properties?.src, mappe) : null;
    if (!data) {
      tampon.push(c);
      continue;
    }
    let j = i + 1;
    while (bosMetin(cocuk[j])) j++;
    let bildetekst;
    if (duzMetinliEm(cocuk[j])) {
      bildetekst = cocuk[j].children.map((x) => x.value).join('').trim();
      i = j;
    }
    bosalt();
    cikti.push({ type: 'raw', value: grafHtml(data, { id: nyId(), bred: !!data.bred, bildetekst }) });
    degisti = true;
  }
  bosalt();
  return degisti ? cikti : null;
}

// Sätteri hast-eklentisi: yalnız src/content/haberler/ altındaki yazılar. GRAF_KART=0 iken kapalı: yazı işlerinin onay
// denetimi (mecmua, onay/site-denetimi.mjs) gövdeyi resim başvurusuyla görür.
export function satteriGraf() {
  return (fabrika) => {
    if (process.env.GRAF_KART === '0') return null;
    const yol = fabrika?.fileURL ? fileURLToPath(fabrika.fileURL) : '';
    if (!yol.split('\\').join('/').includes('src/content/haberler/')) return null;
    const mappe = dirname(yol);
    return {
      name: 'kifobu-yazi-graf',
      element: {
        filter: ['p'],
        visit(node, ctx) {
          const dugumler = grafDugumleri(node, mappe);
          if (dugumler) ctx.replaceNode(node, dugumler);
        },
      },
    };
  };
}
