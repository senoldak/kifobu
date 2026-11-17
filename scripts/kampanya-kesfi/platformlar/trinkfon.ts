import type { Bolum, KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { metne, para, tamSayi, tarih } from '../ayristir.ts';

/** Tutarı okur; ondalıklı ("1.234,56") ise para() yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null): number | null {
  if (!s || /,\d/.test(s)) return null;
  return para(s);
}

/** "Etiket: değer" çiftinden değeri çeker; yoksa null. */
function alan(t: string, desen: RegExp): string | null {
  return t.match(desen)?.[1]?.trim() || null;
}

const TARIH = '(\\d{1,2}(?:\\.\\d{1,2}\\.|\\s+\\p{L}+\\s+)\\d{4})';

/** Girişim adı: önce <h1>, sonra profil başlığı (<h2>), sonra <title>'ın " - Kampanya Detayları" öncesi; yoksa null. */
function girisimAdi(html: string): string | null {
  for (const desen of [/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, /campaign-profile-copy[^>]*>\s*<h2\b[^>]*>([\s\S]*?)<\/h2>/i]) {
    const ad = html.match(desen);
    const temiz = ad ? metne(ad[1]) : '';
    if (temiz) return temiz;
  }
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const parcalar = baslik ? metne(baslik[1]).split(/\s+-\s+Kampanya Detayları/) : [];
  return parcalar.length > 1 && parcalar[0].trim() ? parcalar[0].trim() : null;
}

/** Platformun kendi durum öğeleri: istatistiklerden sonra gelen düğme alanı ve tarih/durum kartı. Açıklama metni dışarıda kalır. */
function durumAlanlari(html: string): string {
  const dugme = html.match(/Toplam Yatırımcı:[\s\S]*?(?=Bağlantılar)/i)?.[0] ?? '';
  const kart = html.match(/Kampanya\s+Başlangıç[\s\S]*?(?=Girişimin Aşaması)/i)?.[0] ?? '';
  return metne(`${dugme} ${kart}`);
}

function detay(html: string): KampanyaDetay {
  const t = metne(html);
  // Bitiş yalnız platformun kendi durum öğelerinden okunur (düğme alanı ve durum başlığı), açıklama metninden değil.
  const bitti =
    />\s*Fonlama sona erdi\s*</i.test(html) || /<h4\b[^>]*>\s*Kampanya\s+Sona Erdi\s*<\/h4>/i.test(html);

  const hedef = tutar(alan(t, /Hedeflenen:\s*(\d[\d.,]*)\s*₺/));
  const toplanan = tutar(alan(t, /(?:Toplanan|Alınan):\s*(\d[\d.,]*)\s*₺/));

  // Kalan gün / son gün de yalnız durum alanlarından okunur: yatırım düğmesi alanı ile "Kampanya Durumu" kartı.
  const durumMetni = durumAlanlari(html);
  const sonGun = !bitti && /SON GÜN|Son Gün/.test(durumMetni);
  const gun = bitti ? null : durumMetni.match(/(\d+)\s*g[uü]n\s*kald/i);
  const kalanGun = bitti ? null : gun ? Number(gun[1]) : sonGun ? 0 : null;

  return {
    ad: girisimAdi(html),
    hedef,
    arzOrani: null,
    degerleme: null,
    baslangic: tarih(alan(t, new RegExp(`Kampanya Başlangıç\\s+${TARIH}`, 'u'))),
    bitis: tarih(alan(t, new RegExp(`Kampanya Bitiş\\s+${TARIH}`, 'u'))),
    toplanan,
    yatirimci: tamSayi(alan(t, /Toplam Yatırımcı:\s*(\d[\d.]*)/)),
    nitelikli: tamSayi(alan(t, /Nitelikli Yatırımcı:\s*(\d[\d.]*)/)),
    kalanGun,
    sonGun,
    bitti,
    fonlandi: bitti ? hedef !== null && toplanan !== null && toplanan >= hedef : null,
  };
}

/** Kart adı yalnız adres sluğundan türetilir (geçici); gerçek ad detay()'dan gelir. */
function kartAdi(href: string): string {
  const slug = href.match(/projeler\/([^/?#]+)/)?.[1] ?? '';
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

const BITMIS = /tamamlanan|tamamlandı|ulaşamay|ulaşan|[iİ]ptal|başarılı|başarısız|sona er|biten|fonlanan|sonuçlanan|kapanan|kapandı|geçmiş|arşiv|reddedilen/i;
const YAKINDA = /yakında|ön talep|başlayacak/i;

/** Liste sayfası bölümlere (`grid-heading-N`) ayrılır; bölüm başlığı kampanyanın durumunu söyler.
 *  Tablo görünümü (`table-heading-N`) aynı kartların tekrarıdır, atlanır. */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const goruldu = new Set<string>();
  for (const bolumHtml of html.split(/<section\s+aria-labelledby="grid-heading-/).slice(1)) {
    const baslik = metne(bolumHtml.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '');
    if (BITMIS.test(baslik)) continue;
    // Bilinmeyen başlık bilerek 'aktif' sayılır (fail-open): yeni bir kampanyayı sessizce kaçırmak, bitmiş birini
    // listeye almaktan kötüdür; bitmişleri sonraki adım detay().bitti ile eler.
    const bolum: Bolum = YAKINDA.test(baslik) ? 'yakinda' : 'aktif';
    for (const kart of bolumHtml.split(/<article\b/).slice(1)) {
      // Kartın üstündeki durum rozeti de bitmiş sayılan bir ifade taşıyorsa atlanır.
      const rozet = metne(kart.match(/rounded-full[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '');
      if (BITMIS.test(rozet)) continue;
      const href = kart.match(/href="(\/projeler\/[^"/]+\/kampanya\/?)"/i)?.[1];
      if (!href) continue; // bağlantısız kart izlenemez
      const url = new URL(href, listeUrl).href;
      if (goruldu.has(url)) continue;
      goruldu.add(url);
      sonuc.push({ ad: kartAdi(href), url, bolum });
    }
  }
  return sonuc;
}

export const trinkfon: Okuyucu = {
  platform: 'trinkfon',
  listeUrller: ['https://kfs.trinkfon.com/projeler/'],
  liste,
  detay,
};
