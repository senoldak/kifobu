import type { Bolum, KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { PDF_AYRACI } from '../../../src/lib/kampanya-takip.ts';
import { slugTr } from '../../../src/lib/konular.ts';
import { metne, para, tarih } from '../ayristir.ts';

/**
 * Startupfon (www.startupfon.com), Framer ile sunucuda üretilen HTML. Liste /yatirim sayfasında; her kart
 * `data-framer-name="Post"` ile başlar ve sayfada iki kez (masaüstü + mobil) yer alır.
 * Kampanya sayfası /girisimler/<ad> yalnız ad ve durum verir. Sayılar zincirle gelir (sonrakiSayfa): tanıtım sayfası
 * -> girişsiz platform sayfası /startups/<id> (hedef, durum) -> SPK bilgi formu PDF'i (fonlama tarihleri, değerleme).
 * Toplanan tutar ve yatırımcı sayısı hiçbir yerde yayımlanmıyor; null kalır.
 */
const LISTE_URL = 'https://www.startupfon.com/yatirim';

const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');

/** Platformun kendi durum sözcükleri. "Fonlama Bitti" sonucu söylemez; "Fonlandı" hedefe ulaşıldığını söyler. */
const BITEN = ['fonlandı', 'fonlama bitti', 'fonlanamadı', 'fonlanmadı', 'tamamlandı', 'sona erdi', 'iptal', 'kapandı', 'başarısız', 'başarılı'];
const FONLANAMADI = ['fonlanamadı', 'fonlanmadı', 'iptal', 'başarısız'];
const FONLANDI = ['fonlandı', 'başarılı'];
const AKTIF = ['fonlanıyor', 'fonlamada'];
const YAKINDA = ['ön yatırım', 'yakında', 'ön talep'];

const icerir = (s: string, liste: string[]) => liste.some((x) => s.includes(x));
const bitmisMi = (durum: string | null) => durum !== null && icerir(kucuk(durum), BITEN);

/** Etiketli alanın (DURUM, FON) değeri: etiketten sonraki ilk <h6>. */
function etiketDegeri(html: string, etiket: string): string | null {
  const m = html.match(new RegExp(`>\\s*${etiket}\\s*</p>[\\s\\S]*?<h6\\b[^>]*>([\\s\\S]*?)</h6>`, 'i'));
  return (m ? metne(m[1]) : '') || null;
}

/**
 * Liste kartı: rozet (görselin üstündeki ilk <p>), ad (ilk <h6>), DURUM, FON ve /girisimler/<ad> bağlantısı.
 * - Rozet ya da DURUM biten bir durum söylüyorsa kart atlanır (Ingosa'da rozet "Fonlama Bitti", DURUM eski kalmış).
 * - "Startupfon Fund Coop" yatırımları lisanslı paya dayalı kitle fonlaması değil, platformun eski ortaklık yapısı: atlanır.
 * - Fonlanıyor -> aktif, Ön Yatırım -> yakında. Tanınmayan durum BİLEREK aktif sayılır (fail-open): yeni bir kampanyayı
 *   sessizce kaçırmak bitmiş birini listeye almaktan kötüdür; bitmişleri keşif adımı detay().bitti ile eler.
 */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const goruldu = new Set<string>();
  for (const kart of html.split(/data-framer-name="Post"/).slice(1)) {
    const rozet = metne(kart.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '') || null;
    const ad = metne(kart.match(/<h6\b[^>]*>([\s\S]*?)<\/h6>/i)?.[1] ?? '');
    const durum = etiketDegeri(kart, 'DURUM');
    const fon = etiketDegeri(kart, 'FON');
    if (!ad || bitmisMi(rozet) || bitmisMi(durum)) continue;
    if (fon !== null && /fund\s*coop/i.test(fon)) continue;

    const ikisi = kucuk(`${durum ?? ''} ${rozet ?? ''}`);
    const bolum: Bolum = icerir(ikisi, AKTIF) ? 'aktif' : icerir(ikisi, YAKINDA) ? 'yakinda' : 'aktif';

    const href = kart.match(/href="([^"]*\/girisimler\/[^"/?#]+)\/?"/i)?.[1];
    let kayit: ListeKaydi | null = null;
    if (href) {
      kayit = { ad, url: new URL(href, listeUrl).href, bolum };
    } else if (bolum === 'yakinda' && slugTr(ad)) {
      // Bağlantısız "yakında" kartının kendi sayfası yok: liste adresi + ad parçasıyla detaysiz döner.
      kayit = { ad, url: `${listeUrl}#yakinda-${slugTr(ad)}`, bolum, detaysiz: true };
    }
    if (!kayit || goruldu.has(kayit.url)) continue;
    goruldu.add(kayit.url);
    sonuc.push(kayit);
  }
  return sonuc;
}

/** Kampanya sayfasının durum öğeleri: üstteki "Badge [1.0]" rozeti ve DURUM etiketinin rozeti. Açıklama metni okunmaz. */
function durumlar(html: string): string[] {
  const ust = html.match(/data-framer-name="Badge \[1\.0\]"[^>]*>\s*<div\b[^>]*data-framer-name="Badge"[^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const etiket = html.match(/>\s*DURUM\s*<\/p>\s*<\/div>\s*<div\b[^>]*data-framer-name="Badge"[^>]*>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  return [ust, etiket].map((x) => (x ? metne(x) : '')).filter(Boolean);
}

/** Girişim adı: giriş düğmesinden ("DETAYLAR İÇİN GİRİŞ YAP") sonraki ilk metin öğesi; yoksa null. (<title> yalnız "Startup".) */
function girisimAdi(html: string): string | null {
  const m = html.match(/DETAYLAR İÇİN GİRİŞ YAP[\s\S]*?<\/a>[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>/i);
  return (m ? metne(m[1]) : '') || null;
}

const PLATFORM = 'https://platform.startupfon.com';
const SIFIR_GENISLIK = /[​-‍﻿]/g;

interface PlatformKaydi {
  companyname?: unknown;
  totalinvestmentamount?: unknown;
  fundingstage?: unknown;
  documents?: unknown;
}

/**
 * Platform sayfasının (/startups/<id>) Next.js veri kaydı: props.pageProps.startup. Okunamazsa null.
 * Kayıttaki collectedAmount (toplanan) girişli de girişsiz de null, fundAmount hep 0 geliyor: ikisi de okunmaz.
 * preInvestment* tarihleri ön talep penceresidir, fonlama penceresi değildir: okunmaz.
 */
function platformKaydi(html: string): PlatformKaydi | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    const kayit = JSON.parse(m[1])?.props?.pageProps?.startup;
    return kayit && typeof kayit === 'object' ? (kayit as PlatformKaydi) : null;
  } catch {
    return null;
  }
}

/** Kayıttaki SPK bilgi formu PDF'inin dosya adı (yalnız "<uuid>.pdf" biçimi kabul edilir); yoksa null. */
function bilgiFormu(kayit: PlatformKaydi): string | null {
  if (!Array.isArray(kayit.documents)) return null;
  for (const b of kayit.documents) {
    const ad = typeof b?.name === 'string' ? b.name : '';
    const link = typeof b?.link === 'string' ? b.link : '';
    if (/bilgi\s*form/i.test(ad.toLocaleLowerCase('tr-TR')) && /^[0-9a-f-]{36}\.pdf$/i.test(link)) return link;
  }
  return null;
}

/** Zincir: tanıtım sayfası -> platform sayfası -> bilgi formu PDF'i -> son. */
function sonrakiSayfa(html: string, url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname === 'www.startupfon.com') {
    const id = html.match(/https:\/\/platform\.startupfon\.com\/startups\/(\d+)/)?.[1];
    return id ? `${PLATFORM}/startups/${id}` : null;
  }
  if (u.hostname === 'platform.startupfon.com' && /^\/startups\/\d+\/?$/.test(u.pathname)) {
    const kayit = platformKaydi(html);
    const pdf = kayit ? bilgiFormu(kayit) : null;
    return pdf ? `${PLATFORM}/api/file/${pdf}` : null;
  }
  return null;
}

/** "17.11.2026" ya da "09/08/2025" -> ISO; yalnız etiketin hemen ardındaki değer. */
function formTarihi(t: string, etiket: string): string | null {
  const m = t.match(new RegExp(`${etiket}\\s*:?\\s*(\\d{1,2}[./]\\d{1,2}[./]\\d{4})`));
  return m ? tarih(m[1].replace(/\//g, '.')) : null;
}

/**
 * Bilgi formundaki fonlama öncesi değerleme (TL). İki yazım görüldü:
 *  - "194.909.000 TL değerleme baz alındığında" (RUUF)
 *  - "(Değerlemenin TL karşılığı ... 754.554.000 TL olarak hesaplanmıştır" (Citio; döviz değerlemenin formdaki TL'si)
 * Başka yazımda null: uydurma yok.
 */
function onDegerleme(t: string): number | null {
  const m =
    t.match(/(\d{1,3}(?:\.\d{3}){2,})\s*TL\s+değerleme\s+baz\s+alındığında/i) ??
    t.match(/Değerlemenin\s+TL\s+karşılığı[\s\S]{0,200}?(\d{1,3}(?:\.\d{3}){2,})\s*TL\s+olarak/i);
  return m ? para(m[1]) : null;
}

function detay(birlesik: string): KampanyaDetay {
  const [html, ...pdfler] = birlesik.split(PDF_AYRACI);
  const form = pdfler.join('\n').replace(SIFIR_GENISLIK, '').replace(/\s+/g, ' ');
  const kayit = platformKaydi(html);

  const d = durumlar(html);
  if (typeof kayit?.fundingstage === 'string') d.push(kayit.fundingstage);
  const dk = d.map(kucuk);
  const bitti = dk.some((x) => icerir(x, BITEN));
  let fonlandi: boolean | null = null;
  if (bitti) {
    if (dk.some((x) => icerir(x, FONLANAMADI))) fonlandi = false;
    else if (dk.some((x) => icerir(x, FONLANDI))) fonlandi = true;
  }

  const kayitHedef = typeof kayit?.totalinvestmentamount === 'string' && /^\d+$/.test(kayit.totalinvestmentamount)
    ? Number(kayit.totalinvestmentamount)
    : null;
  const hedef = kayitHedef ?? para(form.match(/Hedeflenen Fon Tutarı\s*:?\s*(\d{1,3}(?:\.\d{3})+)\s*TL/)?.[1]);
  const once = onDegerleme(form);
  const kayitAdi = typeof kayit?.companyname === 'string' ? kayit.companyname.trim() : '';

  return {
    ad: girisimAdi(html) ?? (kayitAdi || null),
    onTalep: null,
    onTalepKisi: null,
    hedef,
    arzOrani: null,
    // Fonlama sonrası değer, hedef için: fonlama öncesi + hedef. Ek satış (%20) katılmaz.
    degerleme: once !== null && hedef !== null ? once + hedef : null,
    // Yalnız formun kampanya (fonlama) penceresi; platformdaki ön talep tarihleri kullanılmaz.
    baslangic: formTarihi(form, 'Başlangıç Tarihi'),
    bitis: formTarihi(form, 'Bitiş Tarihi'),
    // Platform toplanan tutarı ve yatırımcı sayısını yayımlamıyor.
    toplanan: null,
    yatirimci: null,
    nitelikli: null,
    kalanGun: null,
    sonGun: false,
    bitti,
    fonlandi,
  };
}

export const startupfon: Okuyucu = {
  platform: 'startupfon',
  listeUrller: [LISTE_URL],
  liste,
  detay,
  sonrakiSayfa,
};
