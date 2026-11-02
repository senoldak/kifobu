// Yayın odası sayfasının verisi: yalnız gerçek kayıtlardan (tidsrøst src/lib/redaksjonen.mjs uyarlaması).
// gunluk: botun günlük sayıları (src/data/yayin-odasi/gunluk.json, scripts/bot/gunluk-sayilar.mjs yazar); haberler:
// yayımlanmış yazıların ön bilgisi (zincir kaydı `zincir`, yazı işleri yerleştirirken yazar). Sayfa hiçbir sayıyı tahmin
// etmez: kayıt yoksa alan boş kalır.

// Ret kodu → okura giden metin. Kodlar scripts/bot/gunluk-sayilar.mjs KODLAR'dan gelir; bilinmeyen kod "diger" sayılır.
export const RET_METNI = {
  'dusuk-haber-degeri': 'Haber değeri düşük',
  'kapsam-disi': 'Kapsamımız dışında',
  'zaten-yazildi': 'Daha önce yazdık',
  'kisa-es-yok': 'Tek başına çok kısa',
  'denetim-durdu': 'Denetimde durduruldu',
  standart: 'Yayın kurallarına takıldı',
  bayat: 'Haber eskimiş',
  'kaynak-listeden-cikti': 'Kaynak listemizden çıktı',
  teknik: 'Teknik hata',
  diger: 'Başka bir neden',
};

// Zincirin geri gönderme hedefi (durum.json turlar anahtarı) → sahnede hangi masaya döner.
export const ADIM = {
  konu: { ad: 'Editör', figur: 'redaktor' },
  arastirma: { ad: 'Araştırmacı', figur: 'research' },
  yazim: { ad: 'Yazar', figur: 'skribent' },
  dogrulama: { ad: 'Doğrulayıcı', figur: 'faktasjekk' },
  grafik: { ad: 'Grafik', figur: 'grafikk' },
  redaksiyon: { ad: 'Masa', figur: 'desk' },
  dil: { ad: 'Dil', figur: 'sprak' },
  hukuk: { ad: 'Hukukçu', figur: 'jurist' },
};

const SAYILAR = ['tur', 'bulunan', 'degerlendirilen', 'yazilan', 'taslak', 'yayimlanan', 'derleme', 'bekleyen'];

function topla(gunler) {
  const s = Object.fromEntries(SAYILAR.map((k) => [k, 0]));
  s.elenen = {};
  for (const g of gunler) {
    for (const k of SAYILAR) s[k] += Number(g?.[k] ?? 0);
    for (const [k, n] of Object.entries(g?.elenen ?? {})) {
      const kod = k.startsWith('standart:') ? 'standart' : RET_METNI[k] ? k : 'diger';
      s.elenen[kod] = (s.elenen[kod] ?? 0) + Number(n);
    }
  }
  return s;
}

export const istanbulGunu = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(t);
const url = (slug) => `/haber/${slug}/`;
const SAHIP = 'Şenol Dak';

/**
 * @param {{ haberler: Array<{ slug: string, title: string, date: Date, draft?: boolean, uretim?: string, yaziTuru?: string,
 *   author?: string, category?: string, haberDegeri?: number, zincir?: { turlar: Record<string, number>, denetlenen: number, cekilen: number } }>,
 *   gunluk?: { gunler?: Record<string, object> }, simdi?: Date }} p
 */
export function yayinOdasiVerisi({ haberler, gunluk, simdi = new Date() }) {
  const gorunen = haberler.filter((h) => !h.draft && h.date <= simdi).sort((a, b) => b.date - a.date);
  const gunler = Object.keys(gunluk?.gunler ?? {}).filter((g) => g <= istanbulGunu(simdi)).sort();
  const sonGun = gunler.at(-1);
  const hafta = gunler.slice(-7);
  const haftaSayi = topla(hafta.map((g) => gunluk.gunler[g]));
  const elenenler = Object.entries(haftaSayi.elenen)
    .map(([kod, sayi]) => ({ kod, metin: RET_METNI[kod], sayi }))
    .sort((a, b) => b.sayi - a.sayi || a.kod.localeCompare(b.kod));
  const zincirYazisi = gorunen.find((h) => h.uretim === 'yazi-isleri' && h.zincir);
  const sahipYazisi = gorunen.find((h) => h.author === SAHIP || (h.yaziTuru && h.yaziTuru !== 'haber'));
  return {
    gun: sonGun ? { tarih: sonGun, bugun: sonGun === istanbulGunu(simdi), ...topla([gunluk.gunler[sonGun]]) } : null,
    hafta: hafta.length ? { bas: hafta[0], son: hafta.at(-1), gun: hafta.length, ...haftaSayi } : null,
    elenenler,
    sonHaberler: gorunen.filter((h) => h.uretim === 'yapay-zeka' && h.category !== 'gunluk-bulten').slice(0, 8)
      .map((h) => ({ baslik: h.title, url: url(h.slug), ...(h.haberDegeri ? { haberDegeri: h.haberDegeri } : {}) })),
    sonZincir: zincirYazisi
      ? {
        baslik: zincirYazisi.title,
        url: url(zincirYazisi.slug),
        turlar: Object.entries(zincirYazisi.zincir.turlar).filter(([, n]) => n > 0)
          .map(([adim, sayi]) => ({ adim, ad: ADIM[adim]?.ad ?? adim, figur: ADIM[adim]?.figur ?? null, sayi })),
        geri: Object.values(zincirYazisi.zincir.turlar).reduce((a, b) => a + b, 0),
        denetlenen: zincirYazisi.zincir.denetlenen,
        cekilen: zincirYazisi.zincir.cekilen,
      }
      : null,
    sonSahip: sahipYazisi ? { baslik: sahipYazisi.title, url: url(sahipYazisi.slug) } : null,
  };
}
