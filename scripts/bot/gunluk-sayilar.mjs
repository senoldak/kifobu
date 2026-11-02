// Yayın odası: botun gerçek günlük sayıları (src/data/yayin-odasi/gunluk.json). Her tur sonunda o turun sayıları
// İstanbul gününe eklenir. Dosyada yalnız sayılar ve sabit kodlar durur: başlık, kaynak adı, adres ya da serbest gerekçe
// metni yazılmaz (gizli kaynak kuralı, AGENTS.md; gerekçe metni kaynak adı taşıyabilir). tidsrøst
// scripts/nyheter/dagstall.mjs uyarlaması; okura giden metinler src/lib/yayin-odasi.mjs RET_METNI'nde.
// Sayım birimi: bulunan/degerlendirilen/elenen kaynak öğesidir (bir haber birkaç kaynak öğesinden yazılabilir);
// yazilan ve yayimlanan benzersiz yazı (slug) sayısıdır.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const SAKLA_GUN = 400;

// Gerekçe → kod. Sıra önemli: ilk eşleşen kazanır. Yeni bir ret gerekçesi eklenirse buraya ve RET_METNI'ne kod eklenir,
// yoksa "diger" sayılır. standart:kirmizi:<kurallar> kural başına ayrıca sayılır.
const KODLAR = [
  [/^düşük haber değeri/, 'dusuk-haber-degeri'],
  [/^kapsam dışı/, 'kapsam-disi'],
  [/^zaten yazıldı/, 'zaten-yazildi'],
  [/^kısa, eş bulunamadı/, 'kisa-es-yok'],
  [/^denetimden geçemedi/, 'denetim-durdu'],
  [/^standart kapısı/, 'standart'],
  [/^bayat/, 'bayat'],
  [/^kaynak listeden çıkarıldı/, 'kaynak-listeden-cikti'],
  [/^(derleme yazılamadı|derleme hatası)/, 'teknik'],
];

/** Ret gerekçesinin kodları: standart reddi kural başına 'standart:<kural>', öteki tek kod; bilinmeyen 'diger'. */
export function retKodlari(gerekce) {
  const g = String(gerekce ?? '').trim();
  const s = /^standart:kirmizi:([a-z0-9,-]+)/.exec(g);
  if (s) return s[1].split(',').filter(Boolean).map((k) => `standart:${k}`);
  return [KODLAR.find(([re]) => re.test(g))?.[1] ?? 'diger'];
}

/** Bir turun sayıları. sonuclar: uyarlayıcının sonuçları (Sonuc[]). */
export function turSayilari({ bulunan = 0, sonuclar = [] }) {
  const elenen = {};
  for (const s of sonuclar) if (s.durum === 'elendi') for (const k of retKodlari(s.gerekce)) elenen[k] = (elenen[k] ?? 0) + 1;
  const yazilan = new Set(sonuclar.filter((s) => s.durum === 'yazildi' && s.slug).map((s) => s.slug)).size;
  return {
    tur: 1,
    bulunan,
    degerlendirilen: sonuclar.filter((s) => s.durum === 'yazildi' || s.durum === 'elendi').length,
    elenen,
    yazilan,
    yayimlanan: yazilan,
    bekleyen: sonuclar.filter((s) => s.durum === 'bekliyor').length,
  };
}

/** İstanbul takvim günü (YYYY-AA-GG). */
export const istanbulGunu = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(t);

function topla(a = {}, b = {}) {
  const c = { ...a };
  for (const [k, v] of Object.entries(b)) c[k] = typeof v === 'object' && v !== null ? topla(c[k], v) : (c[k] ?? 0) + v;
  return c;
}

/** Dosyaya bu turun sayılarını ekler; SAKLA_GUN'den eski günler düşer. */
export function gunEkle(veri, gun, sayilar, guncellendi) {
  const gunler = { ...(veri?.gunler ?? {}), [gun]: topla(veri?.gunler?.[gun], sayilar) };
  const sirali = Object.keys(gunler).sort().slice(-SAKLA_GUN);
  return { guncellendi, gunler: Object.fromEntries(sirali.map((g) => [g, gunler[g]])) };
}

/** Uyarlayıcıyı sarar: aday sayısını ve isle sonuçlarını (hatayla gelen kısmi sonuçlar dahil) toplar. */
export function sayan(uyarlayici) {
  let bulunan = 0;
  const sonuclar = [];
  return {
    uyarlayici: {
      ...uyarlayici,
      adaylar: async (...a) => {
        const liste = await uyarlayici.adaylar(...a);
        bulunan += liste.length;
        return liste;
      },
      isle: async (...a) => {
        try {
          const r = await uyarlayici.isle(...a);
          sonuclar.push(...(r ?? []));
          return r;
        } catch (e) {
          sonuclar.push(...(e?.sonuclar ?? []));
          throw e;
        }
      },
    },
    sayilar: () => turSayilari({ bulunan, sonuclar }),
  };
}

/** Turun sayılarını dosyaya yazar. Hata turu düşürmez: çağıran yakalar ve loglar. */
export async function gunlukYaz(dosya, sayilar, simdi = new Date()) {
  let veri = {};
  try {
    veri = JSON.parse(await readFile(dosya, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  await mkdir(path.dirname(dosya), { recursive: true });
  await writeFile(dosya, `${JSON.stringify(gunEkle(veri, istanbulGunu(simdi), sayilar, simdi.toISOString()), null, 1)}\n`, 'utf8');
}
