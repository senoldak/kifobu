// Kısa haber havuzu ve dilim derlemesi: yalnızca uzunluk denetiminden (denetci.mjs → uzunlukKontrol) geçemediği için
// yayımlanmayan olaylar tek başına YAYIMLANMAZ; çalıştırmalar arasında havuzda bekler. Olayın havuza girdiği zaman
// dilimi (açılış 06-12 / öğle 12-18 / kapanış 18-06, İstanbul) bitince o dilimin kısa olayları kategori aranmadan tek
// derleme yazısı olur (en az DERLEME_EN_AZ, en fazla DERLEME_AZAMI olay; yazıda her kategori bir ara başlık).
// Dilimde tek kalan olay (ya da DERLEME_AZAMI'yı aşan artan) bir sonraki dilimin derlemesine devredilir; HAVUZ_SAAT
// dolunca eş bulamamış olarak havuzdan düşer. (kifobu'ya olay seyrek geldiği için bekleme 24 saat; kısa haber bülten
// satırı olamaz: özet bültenler yalnız yayımlanmış haberleri listeler, bkz. ozet-bulten.mjs.)
// Derleme de aynı denetimden (denetci.mjs → denetle, derlemeEnAz alt sınırıyla) geçer.
// Olaylar kaynak metni ve adresi taşır: durum dosyasında kayıt başına şifreli durur (gizli.mjs). Anahtar yoksa havuz
// yazılmaz; düz metin hiçbir zaman dosyaya girmez.
import { anahtarVar, coz, sifrele } from './gizli.mjs';

export const HAVUZ_SAAT = 24; // kifobu'ya olay seyrek gelir: bir gün eş bekler (tek kalan sonraki dilime devredilir)
export const HAVUZ_AZAMI = 16; // aşan en eski olaylar düşer
export const DERLEME_EN_AZ = 2; // bir derlemede en az bu kadar kısa olay
export const DERLEME_AZAMI = 8; // bir derlemede en fazla bu kadar kısa olay
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

// ── Zaman dilimleri (İstanbul): açılış 06-12, öğle 12-18, kapanış 18-06 ─────────────────────────────
const TZ = 'Europe/Istanbul';
export const DILIM_ADLARI = { acilis: 'açılış', ogle: 'öğle', kapanis: 'kapanış' };
const TR_AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const istanbul = (t) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', day: 'numeric', month: 'numeric', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(t)
      .map((x) => [x.type, Number(x.value)]),
  );

// Gece yarısından sonraki saatler bir önceki günün kapanış dilimine düşer.
export function bultenDilimi(simdi) {
  const { hour: saat } = istanbul(simdi);
  const dilim = saat >= 6 && saat < 12 ? 'acilis' : saat >= 12 && saat < 18 ? 'ogle' : 'kapanis';
  const p = istanbul(saat < 6 ? new Date(simdi.getTime() - 6 * 3600e3) : simdi);
  const iso = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { anahtar: `${iso}:${dilim}`, dilim, ad: DILIM_ADLARI[dilim], gun: p.day, ay: TR_AY[p.month - 1], yil: p.year };
}

// Olayın havuza girdiği dilim (ör. "2026-10-18:ogle"); 
export const dilimAnahtari = (o) => bultenDilimi(new Date(o.havuzaGirdi)).anahtar;

// Derleme başlığının eki: "18 Ekim, öğle" (grubun en yeni olayının dilimi, yani derlemeyi tetikleyen dilim).
export function dilimEki(grup) {
  const son = grup.reduce((en, o) => (Date.parse(o.havuzaGirdi) > Date.parse(en.havuzaGirdi) ? o : en), grup[0]);
  const { gun, ay, ad } = bultenDilimi(new Date(son.havuzaGirdi));
  return `${gun} ${ay}, ${ad}`;
}

// Dilim anahtarları zaman sırasına dizilir (alfabetik değil: kapanış, öğleden sonra gelir).
const DILIM_SIRASI = { acilis: 0, ogle: 1, kapanis: 2 };
const dilimSirasi = (a, b) => {
  const [ga, da] = a.split(':');
  const [gb, db] = b.split(':');
  return ga < gb ? -1 : ga > gb ? 1 : DILIM_SIRASI[da] - DILIM_SIRASI[db];
};

// Dilimi bitmiş (olgun) kısa olayları dilime göre gruplar; kategori aranmaz. Dilimler eskiden yeniye işlenir, olaylar
// dilim içinde giriş sırasındadır. DERLEME_EN_AZ'dan az kalan olay ve DERLEME_AZAMI'dan artan tek olay "artan"dır:
// sonraki dilimin olaylarına katılır (devir); sonraki dilim yoksa havuzda kalır.
export function dilimGruplari(olaylar) {
  const dilimler = new Map();
  for (const o of [...olaylar].sort((a, b) => Date.parse(a.havuzaGirdi) - Date.parse(b.havuzaGirdi))) {
    const d = dilimAnahtari(o);
    if (!dilimler.has(d)) dilimler.set(d, []);
    dilimler.get(d).push(o);
  }
  const gruplar = [];
  let artan = [];
  for (const d of [...dilimler.keys()].sort(dilimSirasi)) {
    let liste = [...artan, ...dilimler.get(d)];
    while (liste.length >= DERLEME_EN_AZ) {
      gruplar.push(liste.slice(0, DERLEME_AZAMI));
      liste = liste.slice(DERLEME_AZAMI);
    }
    artan = liste;
  }
  return { gruplar, artan };
}

// bekleyen: dilimi süren olaylar (dilim bitince derlemeye girer); olgun: dilimi bitmiş olaylar.
export function havuzAyir(havuz, simdi) {
  const simdikiDilim = bultenDilimi(simdi).anahtar;
  const bekleyen = [];
  const olgun = [];
  for (const o of havuz) (dilimAnahtari(o) === simdikiDilim ? bekleyen : olgun).push(o);
  return { bekleyen, olgun };
}

// Derleme yazarının ve denetimin kaynağı: her haberin kaynakları kendi bölümünde.
export const derlemeKaynagi = (grup) =>
  grup.map((o, i) => `### ${i + 1}. ${o.baslik}\n${o.kaynaklar.map((k) => `${k.baslik}\n${k.metin}`).join('\n\n')}`).join('\n\n---\n\n');

/**
 * Havuzu bir tur ilerletir. Bağımlılıklar:
 *   mukerrer(o) → gerekçe | null   (olay bu arada tam haber olarak yazıldı mı)
 *   yaz(grup, kaynak) → taslak | null;  denetle(taslak, kaynak, grup) → { haber, sorunlar } (düzeltme turları içinde)
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
  const { gruplar } = dilimGruplari(havuzAyir(kalan, simdi).olgun);
  for (const grup of gruplar.slice(0, DERLEME_MAKS)) {
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
      const { haber, sorunlar, belirsiz } = await denetle(t, kaynak, grup);
      if (belirsiz) {
        // Denetim tamamlanamadı: derleme yayımlanmaz, olaylar havuzda kalıp sonraki turda yeniden denenir.
        log(`havuz: derleme (${grup.length} haber) BEKLİYOR (denetim tamamlanamadı)`);
        kalan.push(...grup);
        continue;
      }
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
  if (kalan.length) log(`havuz: ${kalan.length} kısa haber dilim sonunu ya da eş bekliyor`);
  return { havuz: kalan, yazilan, ayarHatasi };
}
