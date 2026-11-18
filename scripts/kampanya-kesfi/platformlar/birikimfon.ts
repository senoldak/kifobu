import type { KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { metne, oran, para, tarih } from '../ayristir.ts';

// Platformun durum başlıkları ("FONLANDI" vb.); küçük harfe tr-TR ile çevrilmiş metinde aranır.
// Açık kampanyanın başlığı örnekte görülmedi: tanınmayan başlık BİLEREK 'aktif' sayılır (fail-open),
// keşif adımı detay().bitti ile eler.
const BITTI_DURUMLARI = [
  'fonlandı', 'fonlanan', 'fonlanamadı', 'fonlanmadı', 'tamamlandı', 'tamamlanan', 'sona erdi', 'sonuçlandı', 'sonuçlanan',
  'ulaştı', 'ulaşan', 'ulaşamadı', 'ulaşamayan', 'kapandı', 'kapanan', 'geçmiş', 'arşiv', 'iptal', 'reddedil',
  'başarılı', 'başarısız', 'biten',
];
// Bitmiş durumlardan hedefe ulaşılmadığını söyleyenler.
const OLUMSUZ_DURUMLAR = ['fonlanamadı', 'fonlanmadı', 'ulaşamadı', 'ulaşamayan', 'başarısız', 'iptal', 'reddedil'];
const OLUMLU_DURUMLAR = ['fonlandı', 'fonlanan', 'başarılı', 'ulaştı', 'ulaşan'];
const YAKINDA = /yakında|ön talep|başlayacak/;
const ODUL_BOLUMU = /ödül|bağış/;

const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');
const icerir = (metin: string, liste: string[]) => liste.some((d) => metin.includes(d));

/** Tutarı okur; ondalıklı ("1.234,56") ise para() yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null): number | null {
  if (!s || /,\d/.test(s)) return null;
  return para(s);
}

/** Bağlantı içermeyen başlıkların (h1-h6) metni: kartın / ilerleme kutusunun durum yazısı. Bağlantılı başlık ad başlığıdır. */
function durumMetni(html: string): string {
  const metinler: string[] = [];
  for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    if (!/<a\b/i.test(m[2])) metinler.push(metne(m[2]));
  }
  return kucuk(metinler.join(' '));
}

/** Girişim adı: önce <h1>, sonra içerik başlığı (`content-title`); sonra <title>'ın " | Birikim Fon" öncesi.
 * Üstteki kırıntı başlığı kullanılmaz. Hiçbiri yoksa null. */
function girisimAdi(html: string): string | null {
  for (const desen of [/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, /class="content-title"[^>]*>\s*<h2\b[^>]*>([\s\S]*?)<\/h2>/i]) {
    const m = html.match(desen);
    const ad = m ? metne(m[1]) : '';
    if (ad) return ad;
  }
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const parcalar = baslik ? metne(baslik[1]).split(/\s*\|\s*Birikim Fon/i) : [];
  return parcalar.length > 1 && parcalar[0].trim() ? parcalar[0].trim() : null;
}

/** Fonlama tarihleri "11-10-2024" yazılır; ilerleme kutusundaki `project-meta-ul2` listesinden okunur (sıra: başlangıç, bitiş). */
function tarihler(html: string): [string | null, string | null] {
  const kutu = html.match(/project-meta-ul2[\s\S]*?<\/ul>/i)?.[0] ?? '';
  const gunler = [...metne(kutu).matchAll(/(\d{1,2})-(\d{1,2})-(\d{4})/g)].map((m) => tarih(`${m[1]}.${m[2]}.${m[3]}`));
  return gunler.length >= 2 ? [gunler[0], gunler[1]] : [null, null];
}

function detay(html: string): KampanyaDetay {
  // Durum, tutarlar ve tarihler yalnız ilerleme kutusundan (`progress-bar-details` ve `project-meta`) okunur; açıklamadan değil.
  const kutu = html.match(/progress-bar-details[\s\S]*?project-meta-ul2[\s\S]*?<\/ul>/i)?.[0] ?? '';
  const durum = durumMetni(kutu.split(/<div class="progress">/i)[0]);
  const bitti = icerir(durum, BITTI_DURUMLARI);

  const tutarlar = metne(kutu.match(/cause-amounts[\s\S]*?(?=project-meta)/i)?.[0] ?? '');
  const hedef = tutar(tutarlar.match(/Hedef(?:lenen Yatırım)?\s*([\d.,]+)\s*₺/)?.[1] ?? null);
  const toplanan = tutar(tutarlar.match(/(?:Toplanan|Toplam Yatırım)\s*([\d.,]+)\s*₺/)?.[1] ?? null);

  let fonlandi: boolean | null = null;
  if (bitti) {
    if (icerir(durum, OLUMSUZ_DURUMLAR)) fonlandi = false;
    else if (icerir(durum, OLUMLU_DURUMLAR)) fonlandi = true;
    else fonlandi = hedef !== null && toplanan !== null ? toplanan >= hedef : null;
  }

  const [baslangic, bitis] = tarihler(kutu);
  return {
    ad: girisimAdi(html),
    onTalep: null,
    onTalepKisi: null,
    hedef,
    arzOrani: oran(metne(html.match(/id="payarz"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '').match(/%\s?[\d.,]+/)?.[0] ?? null),
    degerleme: null, // sayfa değerleme yazmıyor
    baslangic,
    bitis,
    toplanan,
    yatirimci: null, // yatırımcı sayısı sayfada yok, sonradan yüklenen ayrı veriyle gelir
    nitelikli: null,
    kalanGun: null, // sayfada kalan gün alanı görülmedi
    sonGun: false,
    bitti,
    fonlandi,
  };
}

function kartAdi(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Liste adresi `/pay-projeler` (yalnız paya dayalı projeler, sunucuda üretilmiş HTML; ana sayfadaki "Paya Dayalı" bölümüyle
 * aynı kart kalıbı). Aktif proje yokken sayfada "Şuan da aktif proje bulunmamaktadır" yazar. Ana sayfaya verilirse
 * "Ödül Bazlı" bölümü başlığından tanınıp atlanır. Biten kartların `<h2> FONLANDI </h2>` gibi bağlantısız durum başlığı vardır;
 * açık/yakında kartlarının başlığı örnekte görülmedi: bilinmeyen durum 'aktif' sayılır (fail-open). Kart kalıbı
 * (`project-item`) bulunamazsa bölümdeki proje bağlantıları tek tek alınır. */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const goruldu = new Set<string>();
  for (const ham of html.split(/<section\b[^>]*class="[^"]*\bproject-area\b/i).slice(1)) {
    const bolumHtml = ham.split(/<\/section>/i)[0];
    const parcalar = bolumHtml.split(/class="[^"]*project-item(?![\w-])/i);
    const baglanti = /href="(?:https?:\/\/(?:www\.)?birikimfon\.com)?\/?proje\/([^"/?#]+)"/gi;
    let baslikHtml = parcalar[0];
    let kartlar = parcalar.slice(1);
    if (kartlar.length === 0) {
      // Yedek yol: kart kalıbı yok. Ödül/biten denetimi yalnız bölüm başlığına (ilk bağlantıdan önceki kısım) ve her bağlantının
      // kendi parçasına (bağlantıdan sonrakine kadar) uygulanır; bütün bölümün metnine bakılmaz.
      const konumlar = [...bolumHtml.matchAll(baglanti)].map((m) => m.index!);
      baslikHtml = bolumHtml.slice(0, konumlar[0] ?? bolumHtml.length);
      kartlar = konumlar.map((k, i) => bolumHtml.slice(k, konumlar[i + 1] ?? bolumHtml.length));
    }
    const baslik = kucuk(metne(baslikHtml));
    if (ODUL_BOLUMU.test(baslik) || icerir(baslik, BITTI_DURUMLARI)) continue;
    for (const kart of kartlar) {
      const durum = durumMetni(kart);
      if (icerir(durum, BITTI_DURUMLARI)) continue;
      const bolum = YAKINDA.test(durum) || YAKINDA.test(baslik) ? 'yakinda' : 'aktif';
      for (const m of kart.matchAll(baglanti)) {
        const url = new URL(`/proje/${m[1]}`, listeUrl).href;
        if (goruldu.has(url)) continue;
        goruldu.add(url);
        sonuc.push({ ad: kartAdi(m[1]), url, bolum });
      }
    }
  }
  return sonuc;
}

export const birikimfon: Okuyucu = {
  platform: 'birikimfon',
  listeUrller: ['https://birikimfon.com/pay-projeler'],
  liste,
  detay,
};
