import type { Bolum, KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { metne, oran, para, tamSayi } from '../ayristir.ts';

/** Tutarı okur; ondalıklı ("1.234,56") ise para() yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null): number | null {
  if (!s || /,\d/.test(s)) return null;
  return para(s);
}

/** "Etiket değer" çiftinden değeri çeker; yoksa null. */
function alan(t: string, desen: RegExp): string | null {
  return t.match(desen)?.[1]?.trim() || null;
}

/** Sayfanın Next.js gömülü verisi (`self.__next_f` içinde `\"` kaçışlı JSON) açık metne çevrilir. */
function gomuluVeri(html: string): string {
  return html.replace(/\\"/g, '"');
}

/** ISO zaman damgası -> İstanbul (UTC+3) takvim günü; okunamazsa null. */
function istanbulGunu(iso: string | null): string | null {
  const m = iso?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Girişim adı: önce <h1>, sonra <h2>, sonra <title>'ın " | Ecofolio" öncesi; yoksa null. */
function girisimAdi(html: string): string | null {
  for (const desen of [/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, /<h2\b[^>]*>([\s\S]*?)<\/h2>/i]) {
    const ad = html.match(desen);
    const temiz = ad ? metne(ad[1]) : '';
    if (temiz) return temiz;
  }
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const parcalar = baslik ? metne(baslik[1]).split(/\s+\|\s+Ecofolio/) : [];
  return parcalar.length > 1 && parcalar[0].trim() ? parcalar[0].trim() : null;
}

/** Platformun durum alanı: <h1>'den "Proje Hakkında" sekmesine kadar olan üst bölüm. Açıklama metni dışarıda kalır. */
function durumAlani(html: string): string {
  const bas = html.search(/<h1\b/i);
  const t = metne(bas >= 0 ? html.slice(bas) : html);
  const son = t.indexOf('Proje Hakkında');
  return son >= 0 ? t.slice(0, son) : t;
}

function detay(html: string): KampanyaDetay {
  const t = metne(html);
  const durum = durumAlani(html);
  const veri = gomuluVeri(html);

  // Bitiş yalnız üst durum alanındaki platform ifadesinden okunur (örnekte bitmiş kampanya yok; ifade tahminidir).
  const bitti = /(?:Kampanya|Fonlama)\s+(?:Sona\s+Erdi|Tamamland[ıI]|[İi]ptal)/.test(durum);

  const gun = bitti ? null : durum.match(/Son\s*(\d+)\s*G[uü]n/i);
  const kalanGun = gun ? Number(gun[1]) : null;
  const sonGun = !bitti && kalanGun !== null && kalanGun <= 1;

  const hedef = tutar(alan(t, /Fonlama Hedefi\s*(\d[\d.,]*)\s*TL/));
  const toplanan = tutar(alan(t, /Toplanan Talep\s*(\d[\d.,]*)\s*TL/));

  // degerleme = bu kampanyanın yatırım sonrası değeri = yatırım öncesi değer + hedef fon (ek fon hariç).
  // Sayfa yalnız yatırım öncesini (enterprise_amount) söyler; company_value_after_investment ek fon dahildir, kullanılmaz.
  const onceki = tamSayi(alan(veri, /"enterprise_amount":(\d+)[,}]/));
  const hedefFon = hedef ?? tamSayi(alan(veri, /"fundable_amount":(\d+)[,}]/));
  const degerleme = onceki !== null && hedefFon !== null ? onceki + hedefFon : null;

  return {
    ad: girisimAdi(html),
    hedef,
    arzOrani: oran(alan(veri, /"supply_rate":(\d+(?:\.\d+)?)/)),
    degerleme,
    baslangic: istanbulGunu(alan(veri, /"start_date":"([^"]+)"/)),
    bitis: istanbulGunu(alan(veri, /"end_date":"([^"]+)"/)),
    toplanan,
    yatirimci: tamSayi(alan(t, /Yatırımcı Sayısı\s*(\d[\d.]*)/)),
    nitelikli: null,
    kalanGun,
    sonGun,
    bitti,
    fonlandi: bitti ? hedef !== null && toplanan !== null && toplanan >= hedef : null,
  };
}

/** Kart adı yalnız adres sluğundan türetilir (geçici); gerçek ad detay()'dan gelir. */
function kartAdi(href: string): string {
  const slug = href.match(/kampanyalar\/([^/?#]+)/)?.[1] ?? '';
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

const BITMIS = /başar[ıI]l[ıI]|başar[ıI]s[ıI]z|tamamlan|sona er|[iİ]ptal|hedefine ula|ulaşamay|ulaşan|fonlanan|sonuçlan|kapan|geçmiş|arşiv|reddedil/i;
const YAKINDA = /yak[ıI]nda|ön talep|başlayacak/i;

/** Her kart `<article>`; sol üstteki rozet durumu söyler (Aktif, Yakında, Başarılı, Başarısız, İptal...). */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  // Liste verisi her kampanya için fon türünü taşır (fund_collection_type, ardından seo.slug); yalnız pay (SHRE) kalır.
  // Veride görünmeyen kampanya bilerek korunur (fail-open).
  const turler = new Map<string, string>();
  for (const m of gomuluVeri(html).matchAll(/"fund_collection_type":"([A-Z_]+)"[\s\S]*?"slug":"([^"]+)"/g)) {
    turler.set(m[2], m[1]);
  }
  const sonuc: ListeKaydi[] = [];
  const goruldu = new Set<string>();
  for (const kart of html.split(/<article\b/).slice(1)) {
    const rozet = metne(kart.match(/<span\b[^>]*inline-block[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? '');
    if (BITMIS.test(rozet)) continue;
    // Bilinmeyen rozet bilerek 'aktif' sayılır (fail-open): yeni bir kampanyayı sessizce kaçırmak, bitmiş birini
    // listeye almaktan kötüdür; bitmişleri sonraki adım detay().bitti ile eler.
    const bolum: Bolum = YAKINDA.test(rozet) ? 'yakinda' : 'aktif';
    const href = kart.match(/href="(\/kampanyalar\/[^"/?#]+)"/i)?.[1];
    if (!href) continue; // bağlantısız kart izlenemez
    const tur = turler.get(kartAdi(href));
    if (tur !== undefined && tur !== 'SHRE') continue;
    const url = new URL(href, listeUrl).href;
    if (goruldu.has(url)) continue;
    goruldu.add(url);
    sonuc.push({ ad: kartAdi(href), url, bolum });
  }
  return sonuc;
}

export const ecofolio: Okuyucu = {
  platform: 'ecofolio',
  listeUrller: ['https://ecofolio.com.tr/kampanyalar'],
  liste,
  detay,
};
