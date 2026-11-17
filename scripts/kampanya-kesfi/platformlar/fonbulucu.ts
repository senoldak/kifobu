import type { KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { slugTr } from '../../../src/lib/konular.ts';
import { metne, oran, para, tamSayi, tarih } from '../ayristir.ts';

/**
 * fonbulucu pay platformu (invest.fonbulucu.com), sunucuda üretilen HTML. Borç platformu başka bir adrestedir ve okunmaz.
 * /kampanyalar?state=... süzgeçleri sayfayı tarayıcıda (JS) süzer, sunucu hep aynı kabuğu verir; bu yüzden liste yalnız ana sayfadan okunur.
 * Süzgeç kodları: 202 Fonlamada, 201 Yakında, 301 Fonlandı, 302 Fonlanamadı, 400 Sonlandırmada.
 */
const KOK = 'https://invest.fonbulucu.com/';

/**
 * Ana sayfadaki bölüm başlıklarından biten kampanyaları taşıyanlar: atlanır.
 * Tanınmayan başlık BİLEREK aktif sayılır (fail-open): kampanya bağlantısı içeren bilinmeyen bir bölüm kaçmasın,
 * bitmişse keşif adımı detay().bitti ile eler. Biten sözlüğü geniş tutuldu.
 */
const BITEN_BASLIKLAR = [
  'başaran', 'başarılı', 'başarısız', 'fonlanan', 'fonlandı', 'fonlanamayan', 'fonlanamadı',
  'tamamlanan', 'tamamlandı', 'sonuçlanan', 'sona eren', 'sona erdi', 'kapanan', 'kapandı',
  'geçmiş', 'arşiv', 'iptal', 'reddedilen', 'hedefine ulaş',
];

/** detay(): "Kampanya Durumu" alanındaki biten durumlar (platformun kendi durum metni). */
const BITEN_DURUMLAR = [...BITEN_BASLIKLAR, 'sonlandırmada', 'sonlandı', 'sonlanmış'];
/** Biten durumlardan hedefe ulaşıldığını söyleyenler / söylemeyenler. */
const FONLANDI_DURUMLARI = ['başarılı', 'fonlandı', 'hedefine ulaştı', 'başaran'];
const FONLANAMADI_DURUMLARI = ['başarısız', 'fonlanamadı', 'fonlanamayan', 'iptal', 'reddedilen', 'hedefine ulaşamadı'];

const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');
const icerir = (s: string, liste: string[]) => liste.some((x) => s.includes(x));

/** "Etiket değer" çiftinden ilk eşleşmenin değerini çeker; yoksa null. */
function alan(t: string, desen: RegExp): string | null {
  return t.match(desen)?.[1]?.trim() || null;
}

/** Tutarı okur; ondalıklı ("1.234,56") ise para() yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null): number | null {
  if (!s || /,\d/.test(s)) return null;
  return para(s);
}

/** Girişim adı: önce <h1>, yoksa <title>; ikisi de yoksa null. (Sayfadaki "kampanya-adi" şirket unvanıdır, kullanılmaz.) */
function girisimAdi(html: string): string | null {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Ad = h1 ? metne(h1[1]) : '';
  if (h1Ad) return h1Ad;
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return (baslik ? metne(baslik[1]) : '') || null;
}

function detay(html: string): KampanyaDetay {
  const t = metne(html);
  const durum = alan(t, /Kampanya Durumu:\s*(.+?)\s+Kampanya Kodu:/);
  const d = durum !== null ? kucuk(durum) : null;
  const bitti = d !== null && icerir(d, BITEN_DURUMLAR);

  const hedef = tutar(alan(t, /Hedeflenen Fonlama\s*₺\s*([\d.,]+)/));
  const toplanan = tutar(alan(t, /Alınan Toplam Yatırım\s*₺\s*([\d.,]+)/));

  let fonlandi: boolean | null = null;
  if (bitti && d !== null) {
    if (icerir(d, FONLANAMADI_DURUMLARI)) fonlandi = false;
    else if (icerir(d, FONLANDI_DURUMLARI)) fonlandi = true;
    else fonlandi = hedef !== null && toplanan !== null ? toplanan >= hedef : null;
  }

  return {
    ad: girisimAdi(html),
    hedef,
    arzOrani: oran(alan(t, /Pay Arz Oranı\s*(%\s*[\d.,]+)/)),
    // Sayfa fonlama sonrası değeri yazmıyor; keşif arzOrani varsa hedef ÷ arz hesaplar.
    degerleme: null,
    baslangic: tarih(alan(t, /Fonlama Başlangıç\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    bitis: tarih(alan(t, /Fonlama Bitiş\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    toplanan,
    yatirimci: tamSayi(alan(t, /Yatırımcı Sayısı\s*(\d[\d.]*)/)),
    nitelikli: tamSayi(alan(t, /Nitelikli Yatırımcı\s*(\d[\d.]*)/)),
    // Açık kampanya sayfasındaki kalan-süre alanının biçimi henüz görülmedi; okunamayan null kalır.
    kalanGun: null,
    sonGun: false,
    bitti,
    fonlandi,
  };
}

function kampanyaAdresi(href: string | undefined, listeUrl: string): { kod: string; url: string } | null {
  const kod = href?.match(/\/kampanya\/([A-Za-z0-9]+)(?=[/?#"']|$)/)?.[1];
  if (!kod || kod.toLowerCase() === 'kayit') return null;
  return { kod, url: new URL(`/kampanya/${kod}`, listeUrl).href };
}

/**
 * Ana sayfa bölümleri `<div class="title">Başlık</div>` ile ayrılır. "Yakında" bölümünde kartın düğmesi
 * bağlantısızsa ("#") kart detaysiz döner; biten bölümler atlanır; öteki bölümlerdeki /kampanya/<KOD> bağlantıları aktiftir.
 */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const goruldu = new Set<string>();
  const ekle = (k: ListeKaydi) => {
    if (goruldu.has(k.url)) return;
    goruldu.add(k.url);
    sonuc.push(k);
  };

  const govde = html.split(/<footer\b/i)[0];
  const bolumler = govde.split(/<div class="title">/).slice(1); // ilk parça üst menü
  for (const bolum of bolumler) {
    const kapanis = bolum.indexOf('</div>');
    const baslik = kucuk(metne(bolum.slice(0, kapanis < 0 ? 0 : kapanis)));
    const icerik = kapanis < 0 ? '' : bolum.slice(kapanis);

    if (baslik.includes('yakında')) {
      for (const kart of icerik.split(/class="swiper-slide simple-cards-w-button-card"/).slice(1)) {
        const ad = metne(kart.match(/<div class="main[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '');
        const adres = kampanyaAdresi(kart.match(/<a\b[^>]*href="([^"]*)"[^>]*simple-cards-w-button-card_button/i)?.[1], listeUrl);
        if (adres) ekle({ ad: adres.kod, url: adres.url, bolum: 'yakinda' });
        else if (ad && slugTr(ad)) ekle({ ad, url: `${listeUrl}#yakinda-${slugTr(ad)}`, bolum: 'yakinda', detaysiz: true });
      }
      continue;
    }
    if (icerir(baslik, BITEN_BASLIKLAR)) continue;
    for (const m of icerik.matchAll(/href="([^"]*\/kampanya\/[^"]*)"/gi)) {
      const adres = kampanyaAdresi(m[1], listeUrl);
      if (adres) ekle({ ad: adres.kod, url: adres.url, bolum: 'aktif' });
    }
  }
  return sonuc;
}

export const fonbulucu: Okuyucu = {
  platform: 'fonbulucu',
  listeUrller: [KOK],
  liste,
  detay,
};
