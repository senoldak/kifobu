// Sözcük açıklamaları: haber metnindeki terimin ilk geçtiği yer (haber başına en çok üç terim) bir düğmeye döner;
// dokununca kifobu sözlüğünün kısa tanımı açılır (src/scripts/okuma-araclari.ts). Tanımlar src/data/sozluk.json'dan.
// Yalnız src/content/haberler/ altındaki yazılar ve yalnız paragraf metni; başlık, bağlantı, kod ve düğme içi atlanır.
// tidsrøst src/lib/rehype-ord.mjs uyarlaması.

export const EN_COK = 3;
const ATLA = new Set(['a', 'code', 'pre', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style', 'kbd', 'svg', 'figure', 'figcaption']);
const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Terim kalıpları: terim + Türkçe ekler (kesmeli ya da kesmesiz); büyük-küçük harf ilk harfte serbest. */
function kaliplar(sozluk) {
  return (sozluk?.terimler ?? []).map(({ terim, tanim }) => {
    const ilk = terim[0];
    const bas = ilk.toLocaleLowerCase('tr-TR') === ilk.toLocaleUpperCase('tr-TR') ? kacis(ilk) : `[${ilk.toLocaleLowerCase('tr-TR')}${ilk.toLocaleUpperCase('tr-TR')}]`;
    return { terim, tanim, re: new RegExp(`(?<![\\p{L}\\p{N}])${bas}${kacis(terim.slice(1))}(?:['’]?\\p{Ll}+)?(?![\\p{L}\\p{N}])`, 'u') };
  });
}

/**
 * Metinde geçen terimler, metin sırasıyla: [{ terim, tanim, bas, son }]. kullanilan: bu yazıda zaten açıklanmış terimler
 * (aynı terim ikinci kez işaretlenmez). Örtüşen eşleşmede uzun olan (listede önce yazılan) kazanır.
 */
export function terimleriBul(metin, sozluk, enCok = EN_COK, kullanilan = new Set()) {
  if (enCok <= 0) return [];
  const bulunan = [];
  for (const k of kaliplar(sozluk)) {
    if (kullanilan.has(k.terim)) continue;
    const m = k.re.exec(metin);
    if (!m) continue;
    const bas = m.index, son = m.index + m[0].length;
    if (bulunan.some((b) => bas < b.son && son > b.bas)) continue;
    bulunan.push({ terim: k.terim, tanim: k.tanim, bas, son });
  }
  return bulunan.sort((a, b) => a.bas - b.bas).slice(0, enCok);
}

/** Metin düğümü → metin ve düğme düğümleri; terim yoksa null. Kullanılan terimler `kullanilan`a eklenir. */
export function terimDugumleri(metin, sozluk, kullanilan) {
  const bulunan = terimleriBul(metin, sozluk, EN_COK - kullanilan.size, kullanilan);
  if (!bulunan.length) return null;
  const ut = [];
  let i = 0;
  for (const b of bulunan) {
    kullanilan.add(b.terim);
    if (b.bas > i) ut.push({ type: 'text', value: metin.slice(i, b.bas) });
    ut.push({
      type: 'element',
      tagName: 'button',
      properties: { type: 'button', className: ['yh-terim'], dataTerim: b.terim, dataTanim: b.tanim, ariaExpanded: 'false' },
      children: [{ type: 'text', value: metin.slice(b.bas, b.son) }],
    });
    i = b.son;
  }
  if (i < metin.length) ut.push({ type: 'text', value: metin.slice(i) });
  return ut;
}

// Sätteri hast-eklentisi. GRAF_KART=0 iken (yazı işlerinin onay denetimi gövdeyi düz görür) kapalı.
export function satteriSozluk(sozluk) {
  return (fabrika) => {
    if (process.env.GRAF_KART === '0') return null;
    const yol = fabrika?.fileURL ? decodeURIComponent(fabrika.fileURL.pathname) : '';
    if (!yol.includes('src/content/haberler/')) return null;
    const kullanilan = new Set();
    return {
      name: 'kifobu-sozluk',
      text(node, ctx) {
        if (kullanilan.size >= EN_COK) return;
        let paragrafta = false;
        for (let n = ctx.parent(node); n; n = ctx.parent(n)) {
          if (n.type !== 'element') continue;
          if (ATLA.has(n.tagName)) return;
          if (n.tagName === 'p') paragrafta = true;
        }
        if (!paragrafta) return;
        const dugumler = terimDugumleri(node.value, sozluk, kullanilan);
        if (dugumler) ctx.replaceNode(node, dugumler);
      },
    };
  };
}
