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

function detay(html: string): KampanyaDetay {
  const t = metne(html);
  // Bitiş yalnız platformun kendi durum öğelerinden okunur (düğme alanı ve durum başlığı), açıklama metninden değil.
  const bitti =
    />\s*Fonlama sona erdi\s*</i.test(html) || /<h4\b[^>]*>\s*Kampanya\s+Sona Erdi\s*<\/h4>/i.test(html);

  const hedef = tutar(alan(t, /Hedeflenen:\s*(\d[\d.,]*)\s*₺/));
  const toplanan = tutar(alan(t, /(?:Toplanan|Alınan):\s*(\d[\d.,]*)\s*₺/));

  const sonGun = !bitti && /SON GÜN|Son Gün/.test(t);
  const gun = bitti ? null : t.match(/(\d+)\s*g[uü]n\s*kald/i);
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

const BITMIS = /tamamlanan|tamamlandı|ulaşamay|[iİ]ptal|başarılı|başarısız|sona er|biten/i;
const YAKINDA = /yakında|ön talep|başlayacak/i;

/** Liste sayfası bölümlere (`grid-heading-N`) ayrılır; bölüm başlığı kampanyanın durumunu söyler.
 *  Tablo görünümü (`table-heading-N`) aynı kartların tekrarıdır, atlanır. */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const goruldu = new Set<string>();
  for (const bolumHtml of html.split(/<section\s+aria-labelledby="grid-heading-/).slice(1)) {
    const baslik = metne(bolumHtml.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? '');
    if (BITMIS.test(baslik)) continue;
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
