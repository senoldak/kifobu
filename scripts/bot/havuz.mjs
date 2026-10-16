// Kısa haber havuzu ve tema derlemesi: yalnızca uzunluk denetiminden (denetci.mjs → uzunlukKontrol) geçemediği için
// yayımlanmayan olaylar çöpe gitmez, çalıştırmalar arasında havuzda bekler. Aynı kategoriden DERLEME_EN_AZ olay
// biriktiğinde hepsi tek bir derleme yazısı olur; derleme de aynı denetimden (denetci.mjs → denetle) geçer.
// HAVUZ_SAAT içinde eş bulamayan, bu arada başka kaynaktan tam haber olarak yazılan ya da derlemesi yayımlanamayan
// olay havuzdan düşer. (jendume'deki havuzla aynı kurallar; kifobu tek dilli ve olay seyrek geldiği için bekleme daha uzun.)
// Olaylar kaynak metni ve adresi taşır: durum dosyasında kayıt başına şifreli durur (gizli.mjs). Anahtar yoksa havuz
// yazılmaz; düz metin hiçbir zaman dosyaya girmez.
import { anahtarVar, coz, sifrele } from './gizli.mjs';

export const HAVUZ_SAAT = 24; // kifobu'ya olay seyrek gelir: bir gün eş bekler
export const HAVUZ_AZAMI = 16; // aşan en eski olaylar düşer
export const DERLEME_EN_AZ = 2; // bir derlemede en az bu kadar kısa olay
export const DERLEME_AZAMI = 4; // bir derlemede en fazla bu kadar kısa olay
export const DERLEME_MAKS = 2; // bir çalıştırmada en fazla derleme sayısı
const KAYNAK_AZAMI = 3500; // olay başına saklanan kaynak metni (derleme isteminde de bu kadarı kullanılır)

const yas = (o, simdi) => (simdi.getTime() - Date.parse(o.havuzaGirdi)) / 3600e3;

// Kısa kalan taslaktan havuz olayı: id (olayın ilk kaynağı), kategori, başlık, kaynak başlıkları, kırpılmış kaynak
// metinleri ve haberde şifreli iz olacak kullanılan kaynaklar.
export function havuzOlayi({ id, taslak, basliklar, kaynaklar, kullanilan, iso }) {
  return {
    id,
    kategori: taslak.category,
    baslik: taslak.title ?? basliklar[0] ?? '',
    basliklar,
    kaynaklar: kaynaklar.map((k) => ({ baslik: k.baslik, tarih: k.tarih, metin: String(k.metin).slice(0, KAYNAK_AZAMI) })),
    kullanilan,
    havuzaGirdi: iso,
  };
}

export function havuzAc(kayitlar = []) {
  if (!anahtarVar()) return [];
  const acik = [];
  for (const k of kayitlar) {
    try {
      acik.push({ ...coz(k.sifreli), havuzaGirdi: k.havuzaGirdi, sifreli: k.sifreli });
    } catch {
      // çözülemeyen kayıt (anahtar değişti) düşer
    }
  }
  return acik;
}

// Durum dosyasına yazılacak biçim: yalnız kimlik, kategori, giriş zamanı ve şifreli olay.
export function havuzKapat(olaylar = []) {
  if (!anahtarVar()) return [];
  return olaylar.map(({ sifreli, havuzaGirdi, ...o }) => ({ id: o.id, kategori: o.kategori ?? '', havuzaGirdi, sifreli: sifreli ?? sifrele(o) }));
}

// Kısa olayları kategoriye göre gruplar; her grup en yeni önce en fazla DERLEME_AZAMI olay içerir.
export function kisaGruplari(olaylar) {
  const kategoriler = new Map();
  for (const o of olaylar) {
    if (!kategoriler.has(o.kategori)) kategoriler.set(o.kategori, []);
    kategoriler.get(o.kategori).push(o);
  }
  const gruplar = [];
  for (const liste of kategoriler.values()) {
    for (let i = 0; i < liste.length; i += DERLEME_AZAMI) {
      const parca = liste.slice(i, i + DERLEME_AZAMI);
      if (parca.length >= DERLEME_EN_AZ) gruplar.push(parca);
    }
  }
  return gruplar;
}

// Derleme yazarının ve denetimin kaynağı: her haberin kaynakları kendi bölümünde.
export const derlemeKaynagi = (grup) =>
  grup.map((o, i) => `### ${i + 1}. ${o.baslik}\n${o.kaynaklar.map((k) => `${k.baslik}\n${k.metin}`).join('\n\n')}`).join('\n\n---\n\n');

/**
 * Havuzu bir tur ilerletir. Bağımlılıklar:
 *   mukerrer(o) → gerekçe | null   (olay bu arada tam haber olarak yazıldı mı)
 *   yaz(grup, kaynak) → taslak | null;  denetle(taslak, kaynak) → { haber, sorunlar } (düzeltme turları içinde)
 *   kaydet(haber, taslak, grup) → slug;  surVar() → boolean (zaman bütçesi)
 * Döner: { havuz: kalan olaylar, yazilan: slug listesi, ayarHatasi?: Error } — anahtar/kota hatasında tur durur.
 */
export async function havuzuIsle(havuz, { simdi, mukerrer, yaz, denetle, kaydet, surVar = () => true, log = console.log }) {
  let kalan = [];
  for (const o of [...havuz].sort((a, b) => Date.parse(b.havuzaGirdi) - Date.parse(a.havuzaGirdi))) {
    const neden = yas(o, simdi) >= HAVUZ_SAAT ? 'eş bulamadı' : kalan.length >= HAVUZ_AZAMI ? 'havuz dolu' : mukerrer(o);
    if (neden) log(`havuz: düştü (${neden}): ${o.baslik}`);
    else kalan.push(o);
  }
  const yazilan = [];
  let ayarHatasi;
  for (const grup of kisaGruplari(kalan).slice(0, DERLEME_MAKS)) {
    if (!surVar()) break;
    // Denenen grup sonucu ne olursa olsun havuzdan çıkar: yayımlanamayan derleme her turda Gemini harcamasın.
    kalan = kalan.filter((o) => !grup.includes(o));
    const kaynak = derlemeKaynagi(grup);
    try {
      const t = await yaz(grup, kaynak);
      if (!t) {
        log(`havuz: derleme (${grup.length} haber) yazılamadı`);
        continue;
      }
      const { haber, sorunlar } = await denetle(t, kaynak);
      if (sorunlar.length) {
        log(`havuz: derleme (${grup.length} haber) YAYIMLANMADI: ${sorunlar.join(' | ')}`);
        continue;
      }
      const slug = await kaydet(haber, t, grup);
      yazilan.push(slug);
      log(`havuz: derleme yazıldı (${grup.length} haber): ${slug}`);
    } catch (e) {
      if (e.ayar) {
        kalan.push(...grup); // anahtar/kota hatası olayların suçu değil: beklemeye devam
        ayarHatasi = e;
        break;
      }
      log(`havuz: derleme hatası: ${e.message}`);
    }
  }
  if (kalan.length) log(`havuz: ${kalan.length} kısa haber eş bekliyor`);
  return { havuz: kalan, yazilan, ayarHatasi };
}
