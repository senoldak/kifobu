import type { KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { metne, oran, para, tamSayi, tarih } from '../ayristir.ts';

// Bitmiş kampanya durum sözcükleri (rozet / data-status).
const BITTI_DURUMLARI = [
  'tamamlanmış', 'tamamlandı', 'tamamlanan', 'sona erdi', 'sonuçlanan', 'hedefine ulaş', 'fonlanan',
  'kapanan', 'kapandı', 'geçmiş', 'arşiv', 'iptal', 'reddedilen', 'başarılı', 'başarısız',
  'success', 'failed', 'fail', 'completed', 'closed', 'ended', 'cancelled', 'canceled', 'archived',
];

/** Tutarı okur; ondalıklı ("1.234,56") ise para() yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null): number | null {
  if (!s || /,\d/.test(s)) return null;
  return para(s);
}

function alan(t: string, desen: RegExp): string | null {
  return t.match(desen)?.[1]?.trim() || null;
}

/** Girişim adı: `<h1 class="fv-page-title">` (sayfadaki ilk <h1> "Yatırım Grafiği" gibi bir grafik
 * başlığıdır, kullanılmaz); yoksa <title>'ın " - fonVenture" öncesi; ikisi de yoksa null. */
function girisimAdi(html: string): string | null {
  const h1 = html.match(/<h1\b[^>]*class="[^"]*fv-page-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Ad = h1 ? metne(h1[1]) : '';
  if (h1Ad) return h1Ad;
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const parcalar = baslik ? metne(baslik[1]).split(/\s+-\s+fonVenture/i) : [];
  return parcalar.length > 1 && parcalar[0].trim() ? parcalar[0].trim() : null;
}

function detay(html: string): KampanyaDetay {
  const t = metne(html);
  // Durum yalnız özet kutusunun rozetinden okunur; açıklama metnine bakılmaz.
  const rozetHam = html.match(/<span class="fv-facts__badge">([\s\S]*?)<\/span>/i)?.[1];
  const rozet = rozetHam ? metne(rozetHam).toLocaleLowerCase('tr-TR') : null;
  const bitti = rozet !== null && BITTI_DURUMLARI.some((d) => rozet.includes(d));

  const hedef = tutar(alan(t, /Hedeflenen (?:Fonlama|Yatırım):?\s*₺?\s*([\d.,]+)/));
  const toplanan = tutar(alan(t, /Toplam Yatırım:?\s*₺?\s*([\d.,]+)/));
  let fonlandi: boolean | null = null;
  if (bitti) {
    if (rozet!.includes('başarısız')) fonlandi = false;
    else if (rozet!.includes('başarılı') || rozet!.includes('hedefine ulaş')) fonlandi = true;
    else fonlandi = hedef !== null && toplanan !== null ? toplanan >= hedef : null;
  }

  return {
    ad: girisimAdi(html),
    hedef,
    arzOrani: oran(alan(t, /Pay Arz Oranı\s*(%\s?[\d.,]+)/)),
    degerleme: null, // sayfa değerleme yazmıyor
    baslangic: tarih(alan(t, /Fonlama Başlangıcı\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    bitis: tarih(alan(t, /Fonlama Bitişi\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    toplanan, // ön talepte yalnız "Toplam Ön Talep" yazar; etiket eşleşmez, null kalır
    onTalep: tutar(alan(t, /Toplam Ön Talep:?\s*₺?\s*([\d.,]+)/)),
    onTalepKisi: tamSayi(alan(t, /Ön Talep Sayısı:?\s*([\d.]+)/)),
    yatirimci: tamSayi(alan(t, /Yatırımcı Sayısı:?\s*([\d.]+)/)),
    nitelikli: tamSayi(alan(t, /Nitelikli Yatırımcı:?\s*([\d.]+)/)),
    kalanGun: null, // sayfada kalan gün alanı görülmedi
    sonGun: false,
    bitti,
    fonlandi,
  };
}

function kartAdi(href: string): string {
  const slug = href.match(/\/kampanya\/([^/?#]+)/)?.[1] ?? '';
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Ana sayfadaki proje kartları `<article class="pl-card" data-status="...">`; "pre_demand" = ön talep → yakinda.
 * Biten projeler ayrı `hp-card--success` bölümünde durur ve okunmaz. Tanınmayan durum BİLEREK 'aktif' sayılır
 * (fail-open): açık kampanya örneği kaydedilemedi, keşif adımı detay().bitti ile eler. Aynı kart masaüstü ve
 * mobil kaydırıcıda iki kez geçer; adrese göre tekilleştirilir. */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const gorulen = new Set<string>();
  const parcalar = html.split(/<article\b(?=[^>]*class="pl-card")/i).slice(1);
  for (const parca of parcalar) {
    const kart = parca.split(/<\/article>/i)[0];
    const durum = kart.match(/^[^>]*data-status="([^"]*)"/i)?.[1]?.toLocaleLowerCase('tr-TR') ?? '';
    const rozet = metne(kart.match(/<span class="pl-badge">([\s\S]*?)<\/span>/i)?.[1] ?? '').toLocaleLowerCase('tr-TR');
    const yakinda = durum === 'pre_demand';
    if (!yakinda && BITTI_DURUMLARI.some((d) => durum.includes(d) || rozet.includes(d))) continue;
    const href = kart.match(/href="(\/kampanya\/(?!on-yatirim-yap)[^"?#]+)"/i)?.[1];
    if (!href) continue;
    const url = new URL(href, listeUrl).href;
    if (gorulen.has(url)) continue;
    gorulen.add(url);
    sonuc.push({ ad: kartAdi(href), url, bolum: yakinda ? 'yakinda' : 'aktif' });
  }
  return sonuc;
}

export const fonventure: Okuyucu = {
  platform: 'fonventure',
  listeUrller: ['https://fonventure.com/'],
  liste,
  detay,
};
