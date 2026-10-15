// Konu ve platform sayfaları (/konu/<slug>/, /platform/<slug>/): hangi haber hangi konuya ya da platforma girer,
// hangi sayfa üretilir, hangisi arama motorlarına açıktır. Saf TypeScript: astro:content'e bağlı değil, birim testiyle
// sınanır. Sayfalar, haber sayfasındaki "Konular" satırı ve dizinler aynı fonksiyonları kullanır.
//
// Kural (2026-10-15): bir konu ya da platform sayfası ancak en az EN_AZ_HABER indekslenebilir haberi varsa arama
// motorlarına açıktır. Konu sayfası bu sayıya ulaşmadan hiç üretilmez; platform sayfası, kifobu'nun kampanya kaydı
// varsa (veri sayfası olarak) üretilir ama haber sayısı yetmezse "noindex, follow" kalır.
import { indekslenir } from './indeks.ts';
import { PLATFORM_AYARLARI } from '../data/bulten-kaynaklari.ts';

export const EN_AZ_HABER = 3;

export interface KonuAday {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    category: string;
    date: Date;
    draft?: boolean;
    noindex?: boolean;
    tur?: string;
    platform?: string;
    girisim?: string;
    yatirimcilar?: string;
    toplanan?: number;
  };
}

/** Türkçe harfleri sadeleştiren ASCII adres parçası (bot ve panelle aynı mantık). */
export function slugTr(s: string): string {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const BULTEN = 'gunluk-bulten';

/** Konu ve platform listelerine giren haber: bülten yazısı değil ve arama motorlarına açık. */
export function listelenir(h: KonuAday): boolean {
  return h.data.category !== BULTEN && indekslenir({ draft: h.data.draft, noindex: h.data.noindex, govde: h.body });
}

const ust = (h: KonuAday) => `${h.data.title}\n${h.data.description}`;
const tam = (h: KonuAday) => `${ust(h)}\n${h.body ?? ''}`;
// \b Türkçe harflerde çalışmadığı için kelime sınırı Unicode harf/rakamla kurulur.
const kelime = (desen: string, bayrak = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${desen})`, bayrak);

export interface Konu {
  slug: string;
  /** Sayfa başlığı (h1) ve dizindeki ad. */
  ad: string;
  /** Arama sonuçları için açıklama. */
  aciklama: string;
  /** Sayfanın başındaki kısa, tarafsız giriş (paragraflar). Rakam ve iddia içermez. */
  giris: string[];
  eslesir: (h: KonuAday) => boolean;
}

export const KONULAR: Konu[] = [
  {
    slug: 'kitle-fonlamasi',
    ad: 'Kitle fonlaması',
    aciklama: "Kitle fonlaması haberleri: Türkiye'de ve dünyada paya, borçlanmaya ve ödüle dayalı kampanyalar, platformlar ve düzenlemeler.",
    giris: [
      'Kitle fonlaması, bir girişimin ya da projenin ihtiyaç duyduğu parayı çok sayıda kişiden, genellikle internet üzerindeki platformlar aracılığıyla toplamasıdır. Türkiye’de paya ve borçlanmaya dayalı kitle fonlaması Sermaye Piyasası Kurulu’nun (SPK) düzenlemesine tabidir.',
      'Bu sayfada kifobu’da yayımlanan kitle fonlaması haberleri yer alır. Konuya giriş için kifobu rehberine bakabilirsiniz.',
    ],
    eslesir: (h) =>
      Boolean(h.data.platform) ||
      kelime('kitle fonla|crowdfunding|paya dayalı|borçlanmaya dayalı').test(tam(h)) ||
      kelime('kickstarter|indiegogo|wefunder|crowdcube|seedrs').test(ust(h)),
  },
  {
    slug: 'spk',
    ad: 'SPK',
    aciklama: 'Sermaye Piyasası Kurulu (SPK) haberleri: kitle fonlaması, girişim sermayesi ve sermaye piyasası düzenlemeleri.',
    giris: [
      'Sermaye Piyasası Kurulu (SPK), Türkiye’de sermaye piyasalarını düzenleyen ve denetleyen kamu kurumudur. Paya ve borçlanmaya dayalı kitle fonlaması platformları SPK’nın düzenlemelerine göre faaliyet gösterir.',
      'Bu sayfada kifobu’da SPK’nın kararları ve düzenlemeleriyle ilgili yayımlanan haberler yer alır.',
    ],
    eslesir: (h) => kelime('SPK(?![\\p{L}\\p{N}])|Sermaye Piyasası Kurulu', 'u').test(tam(h)),
  },
  {
    slug: 'mkk',
    ad: 'MKK',
    aciklama: 'Merkezi Kayıt Kuruluşu (MKK) haberleri: kitle fonlaması ve sermaye piyasası kayıtları.',
    giris: [
      'Merkezi Kayıt Kuruluşu (MKK), Türkiye’de sermaye piyasası araçlarının kayıtlarını tutan kuruluştur.',
      'Bu sayfada kifobu’da MKK ile ilgili yayımlanan haberler yer alır.',
    ],
    eslesir: (h) => kelime('MKK(?![\\p{L}\\p{N}])|Merkezi Kayıt Kuruluşu', 'u').test(tam(h)),
  },
  {
    slug: 'melek-yatirim',
    ad: 'Melek yatırım',
    aciklama: 'Melek yatırım haberleri: bireysel yatırımcıların ve melek yatırımcı ağlarının katıldığı girişim yatırımları.',
    giris: [
      'Melek yatırımcı, erken aşamadaki girişimlere kendi birikimiyle yatırım yapan kişidir. Melek yatırımcılar çoğu zaman tohum ve tohum öncesi turlara tek başına ya da fonlarla birlikte katılır.',
      'Bu sayfada kifobu’da yayımlanan ve melek yatırımcıların yer aldığı haberler bulunur.',
    ],
    eslesir: (h) => kelime('melek yatırım|angel invest').test(`${tam(h)}\n${h.data.yatirimcilar ?? ''}`),
  },
  {
    slug: 'girisim-sermayesi',
    ad: 'Girişim sermayesi',
    aciklama: 'Girişim sermayesi haberleri: girişim sermayesi fonları, yeni fon kuruluşları ve fon kapanışları.',
    giris: [
      'Girişim sermayesi, büyüme potansiyeli yüksek girişimlere ortaklık karşılığı yatırım yapan fonların ve şirketlerin yaptığı yatırımdır. Fonlar parayı genellikle kurumsal ve bireysel yatırımcılardan toplar.',
      'Bu sayfada kifobu’da yayımlanan girişim sermayesi fonu, fon kuruluşu ve fon kapanışı haberleri yer alır.',
    ],
    eslesir: (h) =>
      kelime('girişim sermayesi|risk sermayesi|GSYF|GSYO|venture capital').test(tam(h)) ||
      /(^|\s)(ilk )?fon/i.test(h.data.tur ?? '') ||
      kelime('fonunu kapattı|fonu kurdu|yeni fon').test(ust(h)),
  },
  {
    slug: 'tohum-yatirim',
    ad: 'Tohum yatırımı',
    aciklama: 'Tohum ve tohum öncesi yatırım turları: hangi girişim, kimden, ne kadar yatırım aldı.',
    giris: [
      'Tohum yatırımı, bir girişimin genellikle ürününü ve pazarını doğrulama aşamasında aldığı ilk yatırım turlarından biridir; tohum öncesi tur bundan da önceki aşamayı anlatır.',
      'Bu sayfada kifobu’da yayımlanan tohum ve tohum öncesi tur haberleri yer alır.',
    ],
    eslesir: (h) => /^tohum/i.test((h.data.tur ?? '').trim()) || kelime('tohum (öncesi )?tur').test(ust(h)),
  },
  {
    slug: 'seri-a',
    ad: 'Seri A yatırımları',
    aciklama: 'Seri A yatırım turları: girişimlerin tohum sonrası ilk büyük kurumsal yatırım turları.',
    giris: [
      'Seri A, tohum aşamasını geride bırakan girişimlerin büyümek için açtığı ilk büyük kurumsal yatırım turuna verilen addır.',
      'Bu sayfada kifobu’da yayımlanan Seri A ve Seri A öncesi tur haberleri yer alır.',
    ],
    eslesir: (h) => /seri a(?![\p{L}])/iu.test(h.data.tur ?? '') || kelime('Seri A(?![\\p{L}])', 'u').test(ust(h)),
  },
  {
    slug: 'seri-b',
    ad: 'Seri B yatırımları',
    aciklama: 'Seri B yatırım turları: büyüme aşamasındaki girişimlerin yatırım turları.',
    giris: [
      'Seri B, ürününü ve iş modelini oturtmuş girişimlerin ölçeklenmek için açtığı yatırım turudur.',
      'Bu sayfada kifobu’da yayımlanan Seri B tur haberleri yer alır.',
    ],
    eslesir: (h) => /seri b(?![\p{L}])/iu.test(h.data.tur ?? '') || kelime('Seri B(?![\\p{L}])', 'u').test(ust(h)),
  },
  {
    slug: 'satin-almalar',
    ad: 'Girişim satın almaları',
    aciklama: 'Girişim satın almaları ve birleşmeler: hangi girişim, kim tarafından satın alındı.',
    giris: [
      'Satın alma, bir girişimin başka bir şirket tarafından devralınmasıdır; girişim yatırımcıları için en yaygın çıkış yollarından biridir.',
      'Bu sayfada kifobu’da yayımlanan girişim satın alma ve birleşme haberleri yer alır.',
    ],
    eslesir: (h) => /satın alma/i.test(h.data.tur ?? '') || kelime('satın al|devral').test(h.data.title),
  },
  {
    slug: 'turkiye-girisim-ekosistemi',
    ad: 'Türkiye girişim ekosistemi',
    aciklama: "Türkiye girişim ekosistemi haberleri: Türk girişimlerinin yatırımları, fonlar ve ekosistem verileri.",
    giris: [
      'Bu sayfada kifobu’da yayımlanan ve Türkiye’deki girişimleri, yatırımcıları ya da ekosistemin genelini ilgilendiren haberler yer alır.',
    ],
    // "Türkçe" (dil adı) ekosistem haberi sayılmaz.
    eslesir: (h) => kelime('Türk(?!çe)|İstanbul|Ankara|İzmir', 'u').test(ust(h)),
  },
  {
    slug: 'yapay-zeka-yatirimlari',
    ad: 'Yapay zekâ girişimlerine yatırımlar',
    aciklama: 'Yapay zekâ girişimlerinin yatırım turları: hangi yapay zekâ girişimi ne kadar yatırım aldı.',
    giris: [
      'Bu sayfada kifobu’da yayımlanan ve yapay zekâ alanında çalışan girişimlerin yatırım turlarını anlatan haberler yer alır.',
    ],
    eslesir: (h) => kelime('yapay zek').test(h.data.title) && (h.data.toplanan !== undefined || h.data.category === 'yatirimlar'),
  },
];

/** Haberin girdiği konular (yalnız tanımlı konular; sayfası olup olmadığına bakılmaz). */
export function haberKonulari(h: KonuAday): Konu[] {
  return KONULAR.filter((k) => k.eslesir(h));
}

/** Konu → listelenen haberleri (en yeniden eskiye). */
export function konuHaberleri<T extends KonuAday>(konu: Konu, tum: T[]): T[] {
  return tum.filter((h) => listelenir(h) && konu.eslesir(h)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Sayfası üretilen konular: en az EN_AZ_HABER listelenen haberi olanlar. */
export function yayimlananKonular<T extends KonuAday>(tum: T[]): { konu: Konu; haberler: T[] }[] {
  return KONULAR.map((konu) => ({ konu, haberler: konuHaberleri(konu, tum) })).filter((x) => x.haberler.length >= EN_AZ_HABER);
}

// ── Platformlar ─────────────────────────────────────────────────────────

export interface Platform {
  slug: string;
  ad: string;
  /** Platformun kendi sitesi (kitle fonlama platformları kaynak gizliliği kuralının dışındadır). */
  url?: string;
}

/** Bilinen kitle fonlama platformları: günlük bültenin izlediği platformlar ve haber künyelerindeki platform adları. */
export function platformlar(haberPlatformlari: string[] = []): Platform[] {
  const harita = new Map<string, Platform>();
  for (const [anahtar, p] of Object.entries(PLATFORM_AYARLARI)) {
    harita.set(slugTr(anahtar), { slug: slugTr(anahtar), ad: p.ad, url: p.url });
  }
  for (const ad of haberPlatformlari) {
    const slug = slugTr(ad);
    if (slug && !harita.has(slug)) harita.set(slug, { slug, ad: ad.trim() });
  }
  return [...harita.values()];
}

/** Haber bu platformla ilgili mi: künyedeki platform ya da başlık/spot/metinde platform adı. */
export function platformEslesir(p: Platform, h: KonuAday): boolean {
  if (h.data.platform && slugTr(h.data.platform) === p.slug) return true;
  const kacis = p.ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return kelime(`${kacis}(?![\\p{L}\\p{N}])`).test(tam(h));
}

export function platformHaberleri<T extends KonuAday>(p: Platform, tum: T[]): T[] {
  return tum.filter((h) => listelenir(h) && platformEslesir(p, h)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * Platform sayfası üretilir mi, indekslenir mi? Kampanya kaydı ya da en az EN_AZ_HABER haberi olan platform üretilir;
 * arama motorlarına yalnız EN_AZ_HABER haberi olan açıktır.
 */
export function platformSayfasi(haberSayisi: number, kampanyaSayisi: number): { uret: boolean; indeks: boolean } {
  const indeks = haberSayisi >= EN_AZ_HABER;
  return { uret: indeks || kampanyaSayisi > 0, indeks };
}
