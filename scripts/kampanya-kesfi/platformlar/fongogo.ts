import type { KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { metne, oran, tarih } from '../ayristir.ts';

// fongogo'nun paya dayalı sitesi yatirim.fongogo.com'dur. fongogo.com ve www.fongogo.com ÖDÜL sitesine (odul.fongogo.com)
// yönlenir; o site kapsam dışıdır ve hiçbir yerde kullanılmaz.
const SITE = 'https://yatirim.fongogo.com';

// Durum sözcükleri; küçük harfe tr-TR ile çevrilmiş metinde aranır. Tanınmayan durum BİLEREK 'aktif' sayılır
// (fail-open): açık kampanyanın başlığı/rozeti örnekte görülmedi, keşif adımı detay().bitti ile eler.
const BITTI_DURUMLARI = [
  'fonlandı', 'fonlanan', 'fonlanamadı', 'fonlanmadı', 'tamamlandı', 'tamamlanan', 'sona erdi', 'sonuçlandı', 'sonuçlanan',
  'ulaştı', 'ulaşan', 'ulaşamadı', 'ulaşamayan', 'kapandı', 'kapanan', 'geçmiş', 'arşiv', 'iptal', 'reddedil',
  'başarılı', 'başarısız', 'biten', 'başaran', 'diğer startuplar',
];
const OLUMSUZ_DURUMLAR = ['fonlanamadı', 'fonlanmadı', 'ulaşamadı', 'ulaşamayan', 'başarısız', 'iptal', 'reddedil'];
const OLUMLU_DURUMLAR = ['fonlandı', 'fonlanan', 'başarılı', 'ulaştı', 'ulaşan'];
const YAKINDA = /ön talep|yakında|başlayacak/;

const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');
const icerir = (metin: string, liste: string[]) => liste.some((d) => metin.includes(d));

/** Tutarı okur; ondalıklı ("1.234,56") ise rakam dışını silmek yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null | undefined): number | null {
  if (!s || /,\d/.test(s)) return null;
  const temiz = s.replace(/[^\d]/g, '');
  return temiz ? parseInt(temiz, 10) : null;
}

function kartAdi(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Liste sayfası sunucuda üretilir: "Ön Talep Toplayan Startuplar" bölümü kart kartıdır (`swiper-slide`). Başaranlar / Diğer
 * Startuplar bölümleri sayfa açılınca ayrı parça olarak yüklenir (statik HTML'de boş), zaten biten kampanyalardır.
 * Her kart `/campaign/<slug>` ve `/ProjectDetail/PreliminaryInformation?URLKey=<slug>` bağlantılarını taşır; detay adresi
 * olarak ikincisi döner (yatırım kutusu orada sunucu tarafında basılı). Kartın "ÖN TALEP" rozeti ya da bölüm başlığı yakında. */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const goruldu = new Set<string>();
  const parcalar = html.split(/<h2 class="h2B"[^>]*>/i);
  for (let i = 0; i < parcalar.length; i++) {
    // İlk parça başlıksızdır; sonrakilerin başı kendi başlığıdır.
    const [baslikHam, ...gerisi] = i === 0 ? ['', parcalar[i]] : parcalar[i].split(/<\/h2>/i);
    const baslik = kucuk(metne(baslikHam));
    if (icerir(baslik, BITTI_DURUMLARI)) continue;
    const govde = gerisi.join('</h2>');
    const kartlar = govde.split(/<div class="swiper-slide\b/i);
    for (const kart of kartlar.length > 1 ? kartlar.slice(1) : [govde]) {
      // Durum: rozet ve bağlantısız <h2> başlığı ("%106 Fonlandı"); bağlantılı başlık kampanya adıdır.
      const durumParcalari = [...kart.matchAll(/investment-result-tag[^>]*>([\s\S]*?)<\/div>/gi)].map((m) => m[1]);
      for (const m of kart.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)) if (!/<a\b/i.test(m[1])) durumParcalari.push(m[1]);
      const durum = kucuk(metne(durumParcalari.join(' ')));
      if (icerir(durum, BITTI_DURUMLARI)) continue;
      const bolum = YAKINDA.test(durum) || YAKINDA.test(baslik) ? 'yakinda' : 'aktif';
      for (const m of kart.matchAll(/href="(?:https?:\/\/yatirim\.fongogo\.com)?\/(?:campaign\/([^"?#/]+)|ProjectDetail\/PreliminaryInformation\?URLKey=([^"&#]+))"/gi)) {
        const slug = m[1] ?? m[2];
        const url = new URL(`/ProjectDetail/PreliminaryInformation?URLKey=${slug}`, listeUrl).href;
        if (goruldu.has(url)) continue;
        goruldu.add(url);
        sonuc.push({ ad: kartAdi(slug), url, bolum });
      }
    }
  }
  return sonuc;
}

/** Girişim adı: sayfa başlık bloğundaki (`headBlockHead`) <h1> (sayfada çıkış penceresi ve yatırım tutarı da <h1>; onlara bakılmaz); yoksa <title>'ın
 * " - Yatırım Ön Bilgileri | Fongogo" öncesi. Hiçbiri yoksa null. */
function girisimAdi(html: string): string | null {
  const baslikKutusu = html.match(/headBlockHead[\s\S]*?(?=headBlockPages)/i)?.[0] ?? '';
  for (const m of baslikKutusu.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)) {
    const ad = metne(m[1]);
    if (ad) return ad;
  }
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const ad = baslik ? metne(baslik[1]).split(/\s+-\s+(?:Yatırım Ön Bilgileri|Hakkında)\s*\|/i)[0].replace(/\s*\|\s*Fongogo\s*$/i, '').trim() : '';
  return ad || null;
}

function detay(html: string): KampanyaDetay {
  // Her şey yalnız yatırım kutusundan (`fundInformations`) ve sonuç rozetinden (`investment-results-tag`) okunur; açıklama
  // metinleri (`reasonsForInvestmentSection`) etkilemez.
  const kutuHam = html.match(/class="fundInformations"[\s\S]*?(?=lastInvestorsInformations)/i)?.[0] ?? '';
  const kutu = metne(kutuHam);
  const rozet = html.match(/investment-results-tag[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';
  const kutuDurumu = metne(kutuHam.match(/class="col text-end"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '');
  const durum = kucuk(`${metne(rozet)} ${kutuDurumu}`);

  const toplanan = tutar(kutu.match(/₺\s*([\d.,]+)\s*%\s*[\d.,]+\s*Fonland[ıi]/)?.[1]);
  const hedef = tutar(kutu.match(/hedef fon\s*₺\s*([\d.,]+)/i)?.[1]);

  const bitti = icerir(durum, BITTI_DURUMLARI);
  let fonlandi: boolean | null = null;
  if (bitti) {
    if (icerir(durum, OLUMSUZ_DURUMLAR)) fonlandi = false;
    else if (icerir(durum, OLUMLU_DURUMLAR)) fonlandi = true;
    else fonlandi = hedef !== null && toplanan !== null ? toplanan >= hedef : null;
  }

  // Tarih, pay oranı ve değerleme ayrı "Yatırımcı Özeti" parçasındadır (ekSayfalar ile gelir, ana HTML'e eklenir).
  // Yalnız FONLAMA penceresi okunur; pay oranı ek fon HARİÇ ilk yüzdedir ("%7,75 (Ek Fon İle %9,16)").
  const ozet = metne(html);
  const gunler = ozet.match(/Başlangıç - Bitiş Tarihleri\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
  const oncesi = tutar(ozet.match(/Yatırım Öncesi Değerleme\s*₺\s*([\d.,]+)/)?.[1]);
  // Fonlama sonrası değer = öncesi + hedef (ek fon hariç).
  const degerleme = oncesi !== null && hedef !== null ? oncesi + hedef : null;

  // Yatırımcı sayısı: durum kartındaki "N yatırımcı yatırım yaptı." (<h4>; mobil kartla ve arşivle uyumlu). Sayfa altındaki
  // "Yatırımcı Sayısı" etiketi farklı bir sayı verebildiğinden (101 / 105) kullanılmaz.
  const yatirimci = tutar(html.match(/>\s*(\d[\d.]*)\s*yatırımcı yatırım yaptı/i)?.[1]);
  return {
    ad: girisimAdi(html),
    onTalep: null,
    onTalepKisi: null,
    hedef,
    arzOrani: oran(ozet.match(/Arz Edilen Pay Oranı\s*(%\s?[\d.,]+)/)?.[1] ?? null),
    degerleme,
    baslangic: gunler ? tarih(gunler[1]) : null,
    bitis: gunler ? tarih(gunler[2]) : null,
    toplanan,
    yatirimci,
    nitelikli: null,
    kalanGun: null, // açık kampanyadaki kalan gün yazısı örnekte görülmedi; uydurulmaz
    sonGun: false,
    bitti,
    fonlandi,
  };
}

/** Detay adresinden (`...PreliminaryInformation?URLKey=<slug>`) "Yatırımcı Özeti" parçasının adresini üretir; adres bozuksa []. */
function ekSayfalar(url: string): string[] {
  try {
    const slug = new URL(url).searchParams.get('URLKey');
    return slug ? [`${SITE}/ProjectDetail/InvestorSummary?URLKey=${encodeURIComponent(slug)}`] : [];
  } catch {
    return [];
  }
}

export const fongogo: Okuyucu = {
  platform: 'fongogo',
  listeUrller: [`${SITE}/`],
  liste,
  detay,
  ekSayfalar,
};
