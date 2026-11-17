import type { KampanyaDetay, ListeKaydi, Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { slugTr } from '../../../src/lib/konular.ts';
import { metne, oran, para, tamSayi, tarih } from '../ayristir.ts';

const BITTI_DURUMLARI = ['hedefine ulaştı', 'tamamlandı', 'sona erdi', 'iptal'];

/** "Etiket: değer" çiftinden değeri çeker; yoksa null. */
function alan(t: string, desen: RegExp): string | null {
  return t.match(desen)?.[1]?.trim() || null;
}

/** Tutarı okur; ondalıklı ("1.234,56") ise para() yanlış sayı üreteceğinden null döner. */
function tutar(s: string | null): number | null {
  if (!s || /,\d/.test(s)) return null;
  return para(s);
}

function detay(html: string): KampanyaDetay {
  const t = metne(html);
  const durum = alan(t, /Kampanya Durumu:\s*(.+?)\s+Kalan Süre/)?.toLocaleLowerCase('tr-TR') ?? null;
  const bitti = durum !== null && BITTI_DURUMLARI.some((d) => durum.includes(d));

  const kalan = alan(t, /Kalan Süre\s+(\S+(?:\s+(?:Gün|Saat))?)/);
  const gunMu = kalan?.match(/^(\d+)\s+Gün$/);
  const saatMi = kalan !== null && /^\d+\s+Saat$/.test(kalan);
  const kalanGun = bitti ? null : gunMu ? Number(gunMu[1]) : saatMi ? 0 : null;
  const sonGun = !bitti && (saatMi || (kalan !== null && /^(Son|Bugün)/i.test(kalan)) || kalanGun === 0);

  return {
    ad: girisimAdi(html),
    hedef: tutar(alan(t, /Hedeflenen Fonlama:\s*(₺?\s?[\d.,]+)/)),
    arzOrani: oran(alan(t, /Arz Oranı:\s*(%?\s?[\d.,]+)/)),
    degerleme: null,
    baslangic: tarih(alan(t, /Başlama Tarihi:\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    bitis: tarih(alan(t, /Kapanış Tarihi:\s*(\d{1,2}\.\d{1,2}\.\d{4})/)),
    toplanan: tutar(alan(t, /Toplam Yatırım:\s*(₺?\s?[\d.,]+)/)),
    yatirimci: tamSayi(alan(t, /Toplam Yatırımcı:\s*([\d.]+)/)),
    nitelikli: tamSayi(alan(t, /Nitelikli Yatırımcı:\s*([\d.]+)/)),
    kalanGun,
    sonGun,
    bitti,
    fonlandi: bitti ? durum!.includes('hedefine ulaştı') : null,
  };
}

/** Kart adı yalnız adres sluğundan türetilir (geçici); gerçek ad detay()'dan gelir. */
function kartAdi(href: string): string {
  const slug = href.match(/projehakkinda\/([^/?#]+)/)?.[1] ?? '';
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Girişim adı: önce <h1>, yoksa <title>'ın " - Proje Hakkında" öncesi; ikisi de yoksa null. */
function girisimAdi(html: string): string | null {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Ad = h1 ? metne(h1[1]) : '';
  if (h1Ad) return h1Ad;
  const baslik = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const parcalar = baslik ? metne(baslik[1]).split(/\s+-\s+Proje Hakkında/) : [];
  return parcalar.length > 1 && parcalar[0].trim() ? parcalar[0].trim() : null;
}

const SIFIR_GENISLIK = /[\u200B-\u200D\uFEFF]/g;
const kartMetni = (html: string | undefined): string => (html ? metne(html).replace(SIFIR_GENISLIK, '').trim() : '');

/**
 * Bağlantısız "yakında" kartının adı, kartın kendi yazısından: açıklama paragrafının ";" ya da ","
 * öncesindeki ilk öbeği 1-3 sözcükse o ("Neurox; yapay zeka ..."); değilse kartın başlık/slogan metni. Uydurma yok.
 */
function yakindaKartAdi(parca: string): string | null {
  const aciklama = kartMetni(parca.match(/<div class="genislige-x-satir[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]);
  const ilk = aciklama.split(/[;,]/)[0]?.trim() ?? '';
  const sozcuk = ilk.split(/\s+/).filter(Boolean).length;
  if (aciklama.search(/[;,]/) > 0 && sozcuk >= 1 && sozcuk <= 3) return ilk;
  return kartMetni(parca.match(/<div class="[^"]*fw-bold[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]) || null;
}

/** Liste kartları `invest-box <durum>` sınıfıyla ayrılır: acik, yakinda, basarili, basarisiz, iptal. */
function liste(html: string, listeUrl: string): ListeKaydi[] {
  const sonuc: ListeKaydi[] = [];
  const parcalar = html.split(/<div class="invest-box\s+/).slice(1);
  for (const parca of parcalar) {
    const sinif = parca.match(/^([a-z]+)/)?.[1];
    const bolum = sinif === 'acik' ? 'aktif' : sinif === 'yakinda' ? 'yakinda' : null;
    if (!bolum) continue;
    const href = parca.match(/href="(\/[^"]*projehakkinda\/[^"]*\?pid=\d+)"/i)?.[1];
    if (!href) {
      // Bağlantısız "YAKINDA" kartının kendi sayfası yok: liste adresi + ad parçasıyla detaysiz kayıt olarak döner.
      const ad = bolum === 'yakinda' ? yakindaKartAdi(parca) : null;
      const slug = ad ? slugTr(ad) : '';
      if (ad && slug) sonuc.push({ ad, url: `${listeUrl}#yakinda-${slug}`, bolum, detaysiz: true });
      continue;
    }
    sonuc.push({ ad: kartAdi(href), url: new URL(href.replace(/&amp;/g, '&'), listeUrl).href, bolum });
  }
  return sonuc;
}

const LISTE_URL = 'https://fonangels.com/kampanyalar';

export const fonangels: Okuyucu = {
  platform: 'fonangels',
  listeUrller: [LISTE_URL],
  liste,
  detay,
};
