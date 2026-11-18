import type { Bolum, KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { slugTr } from '../../../src/lib/konular.ts';
import { metne } from '../ayristir.ts';

/**
 * Startupfon (www.startupfon.com), Framer ile sunucuda üretilen HTML. Liste /yatirim sayfasında; her kart
 * `data-framer-name="Post"` ile başlar ve sayfada iki kez (masaüstü + mobil) yer alır.
 * Kampanya sayfası /girisimler/<ad>; hedef, değerleme, tarih ve toplanan tutar "DETAYLAR İÇİN GİRİŞ YAP"
 * arkasında, yani düz HTML'de yok: detay() yalnız adı ve durumu okur, sayılar null kalır.
 */
const LISTE_URL = 'https://www.startupfon.com/yatirim';

const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');

/** Platformun kendi durum sözcükleri. "Fonlama Bitti" sonucu söylemez; "Fonlandı" hedefe ulaşıldığını söyler. */
const BITEN = ['fonlandı', 'fonlama bitti', 'fonlanamadı', 'tamamlandı', 'sona erdi', 'iptal', 'kapandı', 'başarısız', 'başarılı'];
const FONLANAMADI = ['fonlanamadı', 'iptal', 'başarısız'];
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

function detay(html: string): KampanyaDetay {
  const d = durumlar(html).map(kucuk);
  const bitti = d.some((x) => icerir(x, BITEN));
  let fonlandi: boolean | null = null;
  if (bitti) {
    if (d.some((x) => icerir(x, FONLANAMADI))) fonlandi = false;
    else if (d.some((x) => icerir(x, FONLANDI))) fonlandi = true;
  }
  return {
    ad: girisimAdi(html),
    onTalep: null,
    onTalepKisi: null,
    hedef: null,
    arzOrani: null,
    degerleme: null,
    baslangic: null,
    bitis: null,
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
};
