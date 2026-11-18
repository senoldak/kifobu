import type { KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { metne, oran, para, tamSayi, tarih } from '../ayristir.ts';

// Biten kampanya bölümü başlıkları (küçük harfle, tr-TR).
const BITTI_BASLIKLARI = [
  'sona er', 'tamamlan', 'hedefine ulaş', 'hedefe ulaş', 'ulaşan', 'ulaşamayan', 'fonlanan', 'sonuçlanan',
  'kapanan', 'kapandı', 'geçmiş', 'arşiv', 'iptal', 'reddedilen', 'başarılı', 'başarısız',
];

/** Tutarı okur; ondalıklı ("1.234,56") ise para() yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null): number | null {
  if (!s || /,\d/.test(s)) return null;
  return para(s);
}

function alan(t: string, desen: RegExp): string | null {
  return t.match(desen)?.[1]?.trim() || null;
}

/** Girişim adı: sayfada <h1> yok; özet kartının başlığı (`.company-card .top .content` ilk satırı),
 * yoksa <title>'ın " Fonlaması" öncesi; ikisi de yoksa null. */
function girisimAdi(html: string): string | null {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Ad = h1 ? metne(h1[1]) : '';
  if (h1Ad) return h1Ad;
  const kart = html.match(/<div class="top"[^>]*>[\s\S]*?<div class="content"><div[^>]*>([\s\S]*?)<\/div>/i);
  const kartAd = kart ? metne(kart[1]) : '';
  if (kartAd) return kartAd;
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const ad = baslik ? metne(baslik[1]).replace(/\s+Fonlaması\s*$/i, '').trim() : '';
  return ad || null;
}

function detay(html: string): KampanyaDetay {
  const t = metne(html);
  // Durum yalnız özet kartının tarih/durum bloğundan okunur ("Bitiyor: ..." + "Fonlama Kapanmıştır" |
  // "Son Gün" | "N Gün Kaldı"); açıklama metnine bakılmaz.
  const blokHam = html.match(/<div class="date">([\s\S]*?)<\/div><\/div><div class="main">/i)?.[1];
  const blok = blokHam ? metne(blokHam).toLocaleLowerCase('tr-TR') : '';
  const bitti = blok.includes('fonlama kapanmıştır');
  const sonGun = !bitti && /(^|\s)son gün(\s|$)/.test(blok);
  const kalan = bitti ? null : blok.match(/(\d+)\s+gün kaldı/)?.[1];

  const hedef = tutar(alan(t, /Fonlama Hedefi:?\s*₺?\s*([\d.,]+)/));
  const toplanan = tutar(alan(t, /Toplanan:?\s*₺\s*([\d.,]+)/) ?? alan(t, /Alınan Yatırım:?\s*₺\s*([\d.,]+)/));
  const arzOrani = oran(alan(t, /Pay Arz Oranı:?\s*(%\s?[\d.,]+)/));

  // "Şirket Değerlemesi" yatırım sonrası değerdir (hedef dahil, ek fonlama hariç): hedef ÷ arz oranına eşit.
  // Eşleşmezse (yatırım öncesi ya da ek fonlama dahil olabilir) güvenilmez, null; keşif adımı hedef÷arz hesaplar.
  let degerleme = tutar(alan(t, /Şirket Değerlemesi:?\s*₺\s*([\d.,]+)/));
  if (degerleme !== null && hedef !== null && arzOrani !== null && arzOrani > 0) {
    if (Math.abs(hedef / arzOrani - degerleme) / degerleme > 0.02) degerleme = null;
  }

  return {
    ad: girisimAdi(html),
    onTalep: null,
    onTalepKisi: null,
    hedef,
    arzOrani,
    degerleme,
    baslangic: tarih(alan(t, /Fonlama Başlangıç Tarihi\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    bitis: tarih(alan(t, /Fonlama Bitiş Tarihi\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    toplanan,
    yatirimci: tamSayi(alan(t, /Yatırımcı Sayısı:?\s*(\d[\d.]*)/)),
    nitelikli: tamSayi(alan(t, /Nitelikli Yatırımcı:?\s*(\d[\d.]*)(?!\s*%)/)),
    kalanGun: kalan ? Number(kalan) : null,
    sonGun,
    bitti,
    // Sayfa başarı/başarısızlık yazmıyor ("Fonlama Kapanmıştır" yalnız süre doldu der): toplanan >= hedef.
    fonlandi: bitti ? (hedef !== null && toplanan !== null ? toplanan >= hedef : null) : null,
  };
}

function kartAdi(href: string): string {
  const slug = href.match(/kampanyalar\/([^/?#]+)/)?.[1] ?? '';
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Kartlar `<div class="card-main"><a href="kampanyalar/slug">`; bölüm (`<section>`) başlığı ilk `text-default`
 * satırıdır. Statik ana sayfada yalnız "Hedefine Ulaşan Kampanyalar" bölümü çizilir (biten, atlanır); Aktif/Yakında
 * sekme bloğu ve /kampanyalar listesi tarayıcıda çizilir, statik HTML'de kart yoktur. Başlığı biten sözlüğünde
 * olmayan kart bloğu BİLEREK 'aktif' sayılır (fail-open): keşif adımı detay().bitti ile eler. Başlıkta
 * "yakında/başlayacak" geçerse 'yakinda'. Kartta pay/borç ayrımı yok; platform yalnız paya dayalı çalışır. */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const gorulen = new Set<string>();
  for (const bolum of html.split(/<section\b/i).slice(1)) {
    const icerik = bolum.split(/<\/section>/i)[0];
    const baslikHam = icerik.match(/<div class="text-default[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';
    const baslik = metne(baslikHam).toLocaleLowerCase('tr-TR');
    if (BITTI_BASLIKLARI.some((d) => baslik.includes(d))) continue;
    const yakinda = /yakında|başlayacak/.test(baslik);
    for (const parca of icerik.split(/<div class="card-main"/i).slice(1)) {
      const href = parca.match(/href="(kampanyalar\/[^"?#]+|\/kampanyalar\/[^"?#]+)"/i)?.[1];
      if (!href) continue;
      const url = new URL(href, listeUrl).href;
      if (gorulen.has(url)) continue;
      gorulen.add(url);
      sonuc.push({ ad: kartAdi(href), url, bolum: yakinda ? 'yakinda' : 'aktif' });
    }
  }
  return sonuc;
}

export const startupburada: Okuyucu = {
  platform: 'startupburada',
  listeUrller: ['https://www.startupburada.com/'],
  liste,
  detay,
};
