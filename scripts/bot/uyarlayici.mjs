// kifobu haber akışının motor uyarlayıcısı: calistir.mjs'nin eski akış gövdesi, ortak motorun sürebileceği iki parçaya bölündü.
//   adaylar({ simdi, log }) → [{ kimlik, yuk, baslik }]   akışları okur, taze öğelerin hepsini döner (gorulen'e bakmaz)
//   isle(adaylar, { surVar, log }) → Sonuc[]               mükerrer kalkanı + ön eleme + yazım + havuz akışı; karar verilenler Sonuc olarak döner
// Motor yokken yerelTur aynı akışı eskisi gibi sürer (davranış değişmedi). Karar verilen her üye durum.gorulen'e işaretlenir
// ve habere özgü hatalar durum.hatalar'a sayılır (3 deneme kuralı bunu okur); iki modda da.
// Sonuc = { kimlik, durum: 'yazildi' | 'elendi' | 'bekliyor', gerekce?, hata?, slug?, havuzda? }
// Sonucu olmayan aday bekliyor kalır (puanlanamadı, denetim tamamlanamadı, süre ya da Gemini payı doldu).
import { KAYNAKLAR, anahtarlar, baslikTemiz, benzer, tamMetin } from './kaynaklar.mjs';
import { MIN_DEGER, onbellekliPuanla, taslakYaz, derlemeYaz, derlemeUzat, derlemeHedefi } from './yazar.mjs';
import { HAFIZA_SAAT, hafizaKur, kayitKur, tekrarBul } from './tekrar.mjs';
import { ciftleriKur, onbellekliEsle, ozelAdlar, uygula } from './esleme.mjs';
import { denetle, derlemeEnAz } from './denetci.mjs';
import { adNorm, haberYaz, hentTekst, istanbulIso, rssOku, sonHaberler } from './lib.mjs';
import { geminiPayiBitti } from './butce.mjs';
import { adresiSil, gizliId, kaynakIzi } from './gizli.mjs';
import { medyaGizle } from './yerel.mjs';
import { standartKapisi } from './standart-kapi.mjs';
import { havuzOlayi, havuzuIsle, dilimEki } from './havuz.mjs';
import { motorKimlik } from './motor.mjs';

const EN_FAZLA_HATA = 3;
// Kaynak metinlerinin toplamı bundan kısaysa olay yazılmaz (en az 200 kelimelik haber çıkmaz).
const KAYNAK_EN_AZ_KELIME = 180;
const GUN_MS = 86_400_000;

// Motor yükü şifreli 16 KB'a sığmalı: uzun alanlar hem karakter hem UTF-8 bayt sınırıyla kırpılır (yük JSON'u ~11 KB altında).
const kes = (m, enCok, enCokBayt) => {
  let t = String(m ?? '').slice(0, enCok);
  while (Buffer.byteLength(t) > enCokBayt) t = t.slice(0, Math.floor(t.length * 0.9));
  return t;
};
export const ICERIK_ENCOK = 6000;

/** Aday öğenin motora giden yükü: düz kaynak adı/adresi yok, kaynak yalnız kısa koduyla anılır. Akış içeriği (icerik) kırpılarak taşınır. */
export const adayYuku = (o) => ({
  id: o.id,
  guid: o.guid,
  link: o.link,
  title: kes(o.title, 300, 600),
  description: kes(o.description, 1500, 2000),
  icerik: kes(o.icerik, ICERIK_ENCOK, 7000),
  pubDate: o.pubDate,
  kaynak: o.kaynak.kod,
});

/** Yükten aday öğeyi yeniden kurar; kod kaynak listesinde yoksa null. */
export function adayiKur(yuk, kaynaklar = KAYNAKLAR) {
  const k = kaynaklar.find((x) => x.kod === yuk.kaynak);
  if (!k) return null;
  const baslik = baslikTemiz(yuk.title);
  return {
    guid: yuk.guid,
    title: yuk.title,
    link: yuk.link,
    description: yuk.description,
    icerik: yuk.icerik ?? '',
    pubDate: yuk.pubDate,
    id: yuk.id,
    tarih: new Date(yuk.pubDate),
    baslik,
    kaynak: k,
    anahtar: anahtarlar(baslik),
    adlar: ozelAdlar(baslik),
  };
}

// Sonuc'a giden metinler: adres ve yayın adı taşımaz.
const temiz = (m) => medyaGizle(adresiSil(String(m)));

/** Durum dosyasında karar verilmemiş (gorulen'de olmayan) adaylar. */
export const gorulmeyen = (adaylar, durum) => adaylar.filter((a) => !durum.gorulen?.[a.yuk.id]);

// Durum dosyasındaki kimlikler anahtarlı özettir (gizliId); çift ve grup anahtarları çalışma anında aynı biçimde kurulur.
const ciftAnahtar = (a, b) => [a, b].map(gizliId).sort().join('|');
const grupKimligi = (ids) => ids.map(gizliId).sort().join('+');

/**
 * @param {{ rot: string, durum: object, simdi: Date, ayar?: object, bag?: object }} p
 *   ayar: { enFazla, teyit, yasGun, sureMs, baslangic }
 *   bag: yalnız testler için bağımlılık değişimi (Gemini/ağ/disk çağıran işlevler).
 */
export function uyarlayiciKur({ rot, durum, simdi, ayar = {}, bag = {} }) {
  const A = { enFazla: 12, teyit: 1, yasGun: 3, sureMs: 18 * 60_000, baslangic: Date.now(), ...ayar };
  const B = {
    KAYNAKLAR, hentTekst, rssOku, tamMetin, taslakYaz, derlemeYaz, derlemeUzat, denetle, onbellekliPuanla, onbellekliEsle,
    haberYaz, sonHaberler, geminiPayiBitti, standartKapisi,
    geminiVar: () => Boolean(process.env.GEMINI_API_KEY),
    ...bag,
  };
  const MOTOR = { url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI };
  durum.gorulen ??= {};
  durum.taranan ??= {};
  durum.hatalar ??= {};
  durum.ayrik ??= {};
  durum.ayni ??= {};
  durum.puan ??= {};
  durum.havuz ??= [];

  const ozet = { yazilan: [], elenen: [], atlanan: [], hata: [] };
  const icerikler = new Map(); // bu turda okunan tam akış içerikleri (yükte kırpılı taşınır); yerel yol eskisi gibi tamını kullanır
  const aciklamalar = new Map(); // aynı şekilde tam description
  let hazir = null;

  const gorulduIsaretle = (id) => (durum.gorulen[id] = simdi.toISOString());
  // Yazarın "aynı olay değil" dediği haber çiftleri; bir daha aynı gruba konmaz.
  const ayrikMi = (a, b) => Boolean(durum.ayrik[ciftAnahtar(a, b)]);
  // Olayın puan anahtarı üyelerinden kurulur; gruba yeni haber katılırsa olay yeniden puanlanır.
  const grupAnahtar = (g) => grupKimligi(g.uyeler.map((u) => u.id));
  const grupBitti = (g) => g.uyeler.forEach((u) => gorulduIsaretle(u.id));
  const grupBilgisi = (g) => {
    g.siteler = new Set(g.uyeler.map((u) => u.kaynak.kod));
    g.yerli = g.uyeler.some((u) => u.kaynak.yerli);
    g.tarih = new Date(Math.max(...g.uyeler.map((u) => u.tarih)));
    return g;
  };
  const surDolduMu = () => Date.now() - A.baslangic > A.sureMs;

  async function hazirla() {
    if (hazir) return hazir;
    // Daha önce yazılmış olaylar (son 10 gün): başlık benzerliği, aynı girişim ya da özel ad eşleşmesi.
    const yazilmis = await B.sonHaberler(rot, 10);
    // Mükerrer kalkanı (tekrar.mjs): son HAFIZA_SAAT saatte yayımlanmış haberlerin başlık ve özel adları.
    const hafiza = hafizaKur(yazilmis, simdi.valueOf());
    // Başlık ve spot birlikte: aynı olay farklı başlıklarla yazılabiliyor.
    const yazilmisAnahtar = yazilmis.flatMap((h) => [anahtarlar(h.title), anahtarlar(`${h.title} ${h.description}`)]);
    const bilinenGirisimler = new Set(yazilmis.map((h) => adNorm(h.girisim)).filter(Boolean));
    hazir = { yazilmis, hafiza, yazilmisAnahtar, bilinenGirisimler };
    return hazir;
  }

  const yazildiMi = (g, { yazilmisAnahtar }) => g.uyeler.some((u) => yazilmisAnahtar.some((k) => benzer(k, u.anahtar)));

  async function adaylar({ simdi: s = simdi, log = console.log } = {}) {
    const cikti = [];
    for (const k of B.KAYNAKLAR) {
      let ogeler = [];
      try {
        ogeler = B.rssOku(await B.hentTekst(k.akis));
      } catch (e) {
        console.warn(`${k.kod}: akış okunamadı (${adresiSil(e.message)})`);
        continue;
      }
      const taze = ogeler
        .map((o) => ({ ...o, id: gizliId(`${k.kisa}:${o.guid || o.link}`), tarih: new Date(o.pubDate), baslik: baslikTemiz(o.title), kaynak: k }))
        .filter((o) => o.link.startsWith('https://') && !Number.isNaN(o.tarih.valueOf()))
        .filter((o) => s - o.tarih <= A.yasGun * GUN_MS);
      // Zaman olarak yayın tarihi (gelecekteyse şimdi): ilk turda akışta günlerdir duran adaylar bugüne yığılmasın.
      for (const o of taze) durum.taranan[o.id] ??= { zaman: new Date(Math.min(o.tarih, s)).toISOString(), kod: k.kod, ...(k.yerli && { yerli: true }) };
      for (const o of taze) if (o.icerik) icerikler.set(o.id, o.icerik);
      for (const o of taze) if (o.description) aciklamalar.set(o.id, o.description);
      // Günlükteki sayı karar bekleyen (gorulen'de olmayan) adaylardır; dönen liste hepsini içerir.
      log(`${k.kod}: ${taze.filter((o) => !durum.gorulen[o.id]).length} aday`);
      for (const o of taze) cikti.push({ kimlik: motorKimlik(o.id), yuk: adayYuku(o), baslik: o.baslik });
    }
    return cikti;
  }

  // Yüklerden öğeleri kurar, olaylara gruplar. Havuzdakiler, bayat / listeden çıkmış eski adaylar ve mükerrer kalkanına takılanlar ayıklanır
  // (sonuçları koy'a gider; kuru çalışmada hiçbir şey işaretlenmez).
  function grupla(girdi, koy, { kuru = false, log = console.log } = {}, { hafiza }) {
    const havuzdaki = new Set(durum.havuz.flatMap((h) => h.uyeIdler ?? [h.id]));
    const isaretle = (id) => {
      if (!kuru) gorulduIsaretle(id);
    };
    const tekrarMi = (baslik, nerede) => {
      const t = tekrarBul(baslik, hafiza);
      if (t) log(`zaten yazıldı (${nerede}, son ${HAFIZA_SAAT} saat: ${t.baslik}): ${baslik}`);
      return Boolean(t);
    };
    const os = [];
    for (const a of girdi) {
      if (havuzdaki.has(a.yuk.id)) continue; // havuzda bekliyor (taze ya da eski gelse de): işlenmez, Sonuc dönmez, bekliyor kalır, havuz büyümez
      const o = adayiKur(a.yuk, B.KAYNAKLAR);
      if (!o) {
        if (!kuru) koy({ kimlik: a.kimlik, durum: 'elendi', gerekce: 'kaynak listeden çıkarıldı' });
        isaretle(a.yuk.id);
        continue;
      }
      if (a.eski && simdi - o.tarih > A.yasGun * GUN_MS) {
        if (!kuru) koy({ kimlik: a.kimlik, durum: 'elendi', gerekce: `bayat (${A.yasGun} günü geçti)` });
        isaretle(a.yuk.id);
        continue;
      }
      if (icerikler.has(o.id)) o.icerik = icerikler.get(o.id);
      if (aciklamalar.has(o.id)) o.description = aciklamalar.get(o.id);
      if (tekrarMi(o.baslik, 'mükerrer kalkanı')) {
        if (!kuru) koy({ kimlik: motorKimlik(o.id), durum: 'elendi', gerekce: `zaten yazıldı (mükerrer kalkanı, son ${HAFIZA_SAAT} saat)` });
        isaretle(o.id);
        continue;
      }
      os.push(o);
    }
    const gruplar = [];
    // Aynı olayı anlatan başlıklar bir gruba girer. Grubun ilk haberiyle karşılaştırılır; zincirleme (A~B, B~C ama A≁C) büyümeyi önler.
    for (const a of os.sort((x, y) => y.tarih - x.tarih)) {
      const g = gruplar.find((grp) => benzer(grp.uyeler[0].anahtar, a.anahtar) && !grp.uyeler.some((u) => ayrikMi(u.id, a.id)));
      if (g) g.uyeler.push(a);
      else gruplar.push({ uyeler: [a] });
    }
    gruplar.forEach(grupBilgisi);
    const teyitli = gruplar.filter((g) => g.siteler.size >= A.teyit);
    return { os, gruplar, teyitli };
  }

  // Kuru çalışma: olayları gruplar ve yazdırır, hiçbir şey yazmaz ve işaretlemez.
  async function kuru(girdi, { log = console.log, hepsi = false } = {}) {
    const h = await hazirla();
    const { gruplar, teyitli } = grupla(girdi, () => {}, { kuru: true, log }, h);
    log(`\n${gruplar.length} olay, ${teyitli.length} tanesi en az ${A.teyit} sitede (${teyitli.filter((g) => g.yerli).length} yerli).`);
    for (const g of gruplar.filter((x) => x.siteler.size >= 2 || hepsi)) {
      log(`\n[${g.siteler.size} site]${yazildiMi(g, h) ? ' (zaten yazıldı)' : ''}`);
      for (const u of g.uyeler) log(`  - ${u.kaynak.kod}: ${u.baslik}`);
    }
  }

  async function isle(girdi, { surVar, log = console.log } = {}) {
    const h = await hazirla();
    const { yazilmis, hafiza, yazilmisAnahtar, bilinenGirisimler } = h;
    const sonuclar = [];
    const yer = new Map();
    // Aynı kimliğe sonradan gelen sonuç öncekinin yerine geçer (havuza girip aynı turda düşen olay gibi).
    const koy = (s) => {
      if (yer.has(s.kimlik)) sonuclar[yer.get(s.kimlik)] = s;
      else {
        yer.set(s.kimlik, sonuclar.length);
        sonuclar.push(s);
      }
    };
    const kim = (u) => motorKimlik(u.id);
    const uyeler = (o) => (o.uyeIdler ?? [o.id]).map((id) => motorKimlik(id)); // havuz olayının üyeleri
    const elendi = (g, gerekce) => g.uyeler.forEach((u) => koy({ kimlik: kim(u), durum: 'elendi', gerekce: temiz(gerekce) }));
    const ele = (g, gerekce) => {
      grupBitti(g);
      elendi(g, gerekce);
    };
    // Sonuc'a yazi eklenmez (jendume ile aynı): Telegram'a gidiş saat'in RSS süpürgesinden yapılır.
    const yazildi = (g, slug) => g.uyeler.forEach((u) => koy({ kimlik: kim(u), durum: 'yazildi', slug }));
    const tekrarMi = (baslik, nerede) => {
      const t = tekrarBul(baslik, hafiza);
      if (t) log(`zaten yazıldı (${nerede}, son ${HAFIZA_SAAT} saat: ${t.baslik}): ${baslik}`);
      return Boolean(t);
    };
    const payNedeni = () => {
      if (surVar) return surVar() ? null : 'Tur payı';
      if (surDolduMu()) return 'Süre bütçesi';
      return B.geminiPayiBitti() ? 'Gemini tur payı' : null;
    };
    const gemini = B.geminiVar();

    const { gruplar, teyitli } = grupla(girdi, koy, { log }, h);
    log(`\n${gruplar.length} olay, ${teyitli.length} tanesi en az ${A.teyit} sitede (${teyitli.filter((g) => g.yerli).length} yerli).`);

    // ── Ön eleme ──────────────────────────────────────────────────────────
    // a) Başlık kelimeleri zaten yazılmış bir haberle örtüşen olaylar düşer.
    let sira = [];
    for (const g of teyitli) {
      if (yazildiMi(g, h)) {
        log(`zaten yazıldı: ${g.uyeler[0].baslik}`);
        ele(g, 'zaten yazıldı');
      } else sira.push(g);
    }

    // b) Dilden bağımsız eşleme (esleme.mjs): İngilizce kaynaklı olay yazılmış Türkçe haberle, Türkçe ve İngilizce
    //    kaynaklar birbiriyle özel adlar üzerinden eşleşir; kelime benzerliğiyle kurulan gruplar da doğrulanır.
    if (gemini && sira.length) {
      const yazilmisAdlar = yazilmis.map((x) => ({
        id: `haber:${x.slug}`,
        metin: `${x.title} — ${x.description}`,
        adlar: ozelAdlar(`${x.title} ${x.description} ${x.girisim ?? ''}`),
      }));
      const ciftler = ciftleriKur(sira, yazilmisAdlar, ayrikMi);
      // Gemini hatası (ör. art arda 503) turu düşürmez: eşleme atlanır, gruplar kelime benzerliğiyle kalır.
      const ayni = await B.onbellekliEsle(ciftler, durum.ayni, (c) => ciftAnahtar(c.idA, c.idB), { zaman: simdi.toISOString() }).catch((e) => {
        console.warn(`Eşleme hatası: ${e.message}`);
        return null;
      });
      if (ayni) {
        const sonuc = uygula(sira, ciftler, ayni);
        for (const [x, y] of sonuc.ayrik) durum.ayrik[ciftAnahtar(x, y)] = simdi.toISOString();
        sira = [];
        for (const g of sonuc.gruplar.map(grupBilgisi)) {
          if (g.yazilmis) {
            log(`zaten yazıldı (özel ad eşleşmesi): ${g.uyeler[0].baslik}`);
            ele(g, 'zaten yazıldı (özel ad eşleşmesi)');
          } else sira.push(g);
        }
        log(`Eşleme: ${ciftler.length} çift soruldu, ${ayni.size} tanesi aynı olay; ${sira.length} olay kaldı.`);
      } else {
        console.warn('Eşleme yapılamadı; gruplar kelime benzerliğiyle kaldı.');
      }
    }

    // c) Kapsam ve haber değeri: her olaya 0–100 puan (0 kapsam dışı). MIN_DEGER altı yazılmaz.
    //    Sıralama: puan, sonra yerli kaynak, sonra yeniden eskiye. Gemini hatası olayları yazara göndermez (emin değilse yayımlama):
    //    olaylar görülmedi kalır, sonraki turda yeniden puanlanır.
    const puan = new Map();
    if (gemini && sira.length) {
      const sonuc = await B.onbellekliPuanla(
        sira.map((g) => `${g.yerli ? '[TR]' : '[Dünya]'} ${g.uyeler.map((u) => u.baslik).join(' / ')}`),
        sira.map(grupAnahtar),
        durum.puan,
        { parca: 80, zaman: simdi.toISOString() },
      ).catch((e) => {
        console.warn(`Ön eleme hatası: ${e.message}`);
        return null;
      });
      const eleme = sonuc !== null;
      if (eleme) sonuc.forEach((p, n) => puan.set(sira[n], p));
      if (eleme) {
        const disari = sira.filter((g) => puan.get(g) < MIN_DEGER);
        for (const g of disari) {
          const gerekce = puan.get(g) === 0 ? 'kapsam dışı' : `düşük haber değeri (${puan.get(g)}, eşik ${MIN_DEGER})`;
          log(`${gerekce}: ${g.uyeler[0].baslik}`);
          ele(g, gerekce);
        }
        log(`Ön eleme: ${sira.length} olaydan ${sira.length - disari.length} tanesi yazılacak; ${disari.length} tanesi ayıklandı.`);
        // Puanı gelmeyen olay (model atladı) bu tur yazılmaz, görülmedi kalır ve sonraki turda yeniden sorulur.
        const puansiz = sira.filter((g) => puan.get(g) === undefined).length;
        if (puansiz) console.warn(`Ön eleme: ${puansiz} olay puansız kaldı, sonraki tura bırakıldı.`);
        sira = sira.filter((g) => puan.get(g) >= MIN_DEGER);
      } else {
        puan.clear();
        sira = [];
        console.warn('Ön eleme yapılamadı; bu tur hiçbir olay yazılmayacak, olaylar sonraki turda yeniden denenecek.');
      }
    }
    sira.sort((a, b) => (puan.get(b) ?? 0) - (puan.get(a) ?? 0) || (a.yerli !== b.yerli ? (a.yerli ? -1 : 1) : b.tarih - a.tarih));

    // ── Yazma ─────────────────────────────────────────────────────────────
    let yazilanSayi = 0;
    let ayarHatasi = null;

    // sira döngü içinde büyüyebilir: "aynı olay değil" denen grup tek tek haberlere bölünüp sona eklenir.
    for (const g of sira) {
      if (yazilanSayi >= A.enFazla || !gemini) break;
      const pay = payNedeni();
      if (pay) {
        log(`\n${pay} doldu; kalan olaylar sonraki çalışmaya kaldı.`);
        break;
      }
      const ad = g.uyeler[0].baslik;
      log(`\n[${[...g.siteler].join(', ')}] ${ad}`);
      const hataId = g.uyeler[0].id;
      // Bu çalışmada az önce yazılan bir olayla aynıysa (aynı turda iki gruba bölünmüş olay) yazılmaz.
      if (g.uyeler.some((u) => tekrarMi(u.baslik, 'bu çalışmada'))) {
        ozet.atlanan.push(`${ad} (son ${HAFIZA_SAAT} saatte yazıldı)`);
        ele(g, `zaten yazıldı (bu çalışmada, son ${HAFIZA_SAAT} saat)`);
        continue;
      }
      try {
        // Her siteden bir haber (en uzun metinli), en fazla 3 kaynak.
        const secilen = [];
        for (const kod of g.siteler) secilen.push(g.uyeler.find((u) => u.kaynak.kod === kod));
        const kaynaklar = [];
        for (const u of secilen.slice(0, 3)) {
          const metin = await B.tamMetin(u);
          if (metin.length >= 200) {
            kaynaklar.push({ baslik: u.baslik, metin, tarih: u.tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }) });
          }
        }
        // 250–400 kelimelik haber için kaynakta yeterli olgu olmalı; kısa özetten uzun haber yazılmaz (uydurma riski).
        const kaynakKelime = kaynaklar.reduce((n, k) => n + k.metin.split(/\s+/).filter(Boolean).length, 0);
        if (kaynaklar.length < A.teyit || kaynakKelime < KAYNAK_EN_AZ_KELIME) {
          const gerekce = kaynaklar.length < A.teyit ? 'kaynak metinleri okunamadı' : `kaynak metni kısa: ${kaynakKelime} kelime`;
          ozet.atlanan.push(`${ad} (${gerekce})`);
          ele(g, gerekce);
          continue;
        }
        const t = await B.taslakYaz(kaynaklar);
        if (!t) break;
        if (!t.ayniOlay && g.uyeler.length > 1) {
          // Başlıklar benziyordu ama farklı olaylar: çiftler hatırlanır, haberler ayrı ayrı yazılmak üzere sona eklenir.
          log(`  aynı olay değil: ${medyaGizle(t.neden)}`);
          for (const a of g.uyeler) for (const b of g.uyeler) if (a.id < b.id) durum.ayrik[ciftAnahtar(a.id, b.id)] = simdi.toISOString();
          for (const u of g.uyeler) sira.push({ uyeler: [u], siteler: new Set([u.kaynak.kod]), tarih: u.tarih });
          continue;
        }
        if (!t.uygun) {
          log(`  atlandı: ${medyaGizle(t.neden)}`);
          ozet.atlanan.push(`${ad} (${medyaGizle(t.neden)})`);
          ele(g, `uygun değil (${t.neden})`);
          continue;
        }
        // Yazılan başlık da hafızayla karşılaştırılır: kaynak başlığı farklı olsa da Türkçe başlık aynı olayı anlatabilir.
        if (tekrarMi(t.title, 'yazılan başlık')) {
          ozet.atlanan.push(`${ad} (son ${HAFIZA_SAAT} saatte yazıldı)`);
          ele(g, `zaten yazıldı (yazılan başlık, son ${HAFIZA_SAAT} saat)`);
          continue;
        }
        const girisimNorm = adNorm(t.girisim);
        if (girisimNorm && t.toplanan > 0 && bilinenGirisimler.has(girisimNorm)) {
          ozet.atlanan.push(`${ad} (aynı yatırım zaten yazıldı)`);
          ele(g, 'aynı yatırım zaten yazıldı');
          continue;
        }
        const kunye = {
          girisim: t.girisim?.trim() || undefined,
          toplanan: t.toplanan > 0 ? t.toplanan : undefined,
          paraBirimi: t.paraBirimi,
          tur: t.tur?.trim() || undefined,
          yatirimcilar: t.yatirimcilar?.trim() || undefined,
          platform: t.platform?.trim() || undefined,
          hedef: t.hedef > 0 ? t.hedef : undefined,
          yatirimci: t.yatirimci > 0 ? t.yatirimci : undefined,
        };
        // Denetimde bütün kaynakların başlık ve metinleri birlikte kullanılır.
        const kaynakMetni = kaynaklar.map((k) => `${k.baslik}\n${k.metin}`).join('\n\n');
        const { haber, sorunlar, belirsiz } = await B.denetle({ title: t.title, description: t.description, body: t.body, kunye, why_matters: t.why_matters, key_points: t.key_points }, kaynakMetni);
        // Denetim çalıştırılamadıysa (boş yanıt, kota, zaman aşımı) olay görülmedi kalır ve sonraki turda yeniden denenir.
        if (belirsiz) {
          log(`  BEKLİYOR (denetim tamamlanamadı): ${medyaGizle(sorunlar.join(' | '))}`);
          ozet.hata.push(`${haber.title} — denetim tamamlanamadı, sonraki turda yeniden denenecek`);
          continue;
        }
        grupBitti(g);
        if (sorunlar.length) {
          // Bütün düzeltme turlarından sonra hâlâ sorunlu: yayımlanmaz, taslak da açılmaz.
          log(`  YAYIMLANMADI (denetim): ${medyaGizle(sorunlar.join(' | '))}`);
          ozet.elenen.push(`${haber.title} — ${medyaGizle(sorunlar.join('; '))}`);
          // Yalnız uzunluk yüzünden duran olay havuza girer: dilimi (açılış/öğle/kapanış) bitince derlemeye girer; kısa haber tek başına yayımlanmaz.
          if (sorunlar.every((s) => s.startsWith('Metin çok kısa'))) {
            const kullanilan = secilen.slice(0, 3).map((u) => ({ ad: u.kaynak.ad, url: u.link }));
            // uyeIdler: olayın bütün üyeleri (havuzdan derleme yazılınca ya da olay düşünce her üyeye sonuç verilir).
            durum.havuz.push(havuzOlayi({ id: hataId, taslak: { ...haber, category: t.category }, basliklar: g.uyeler.map((u) => u.baslik), kaynaklar, kullanilan, iso: simdi.toISOString(), uyeIdler: g.uyeler.map((u) => u.id) }));
            log('  havuza alındı: dilim sonunda derlemeye girecek');
            g.uyeler.forEach((u) => koy({ kimlik: kim(u), durum: 'bekliyor', gerekce: 'havuzda', havuzda: true }));
          } else elendi(g, `denetimden geçemedi: ${sorunlar.join('; ')}`);
          continue;
        }
        // Standartlar: kırmızı süzgeç, dosya yazılmadan hemen önce.
        const kapi = await B.standartKapisi({ baslik: haber.title, ozet: haber.description, metin: haber.body, ekler: [haber.why_matters ?? t.why_matters, ...(haber.key_points ?? t.key_points ?? [])], kaynakMetni, kimlik: hataId, motor: MOTOR, log: (m) => log(medyaGizle(m)) });
        if (!kapi.yayimla) {
          ozet.elenen.push(`${haber.title} — ${kapi.std.gerekce}`);
          elendi(g, kapi.std.gerekce);
          continue;
        }
        const slug = await B.haberYaz(rot, { ...haber, category: t.category, date: istanbulIso(simdi), draft: false, kaynakIzi: kaynakIzi(secilen.slice(0, 3).map((u) => ({ ad: u.kaynak.ad, url: u.link }))), why_matters: haber.why_matters ?? t.why_matters, key_points: haber.key_points ?? t.key_points });
        delete durum.hatalar[hataId];
        await kapi.yazildi(slug);
        if (girisimNorm) bilinenGirisimler.add(girisimNorm);
        hafiza.push(kayitKur({ title: haber.title, description: haber.description, girisim: kunye.girisim, slug }));
        yazilmisAnahtar.push(anahtarlar(haber.title), anahtarlar(`${haber.title} ${haber.description}`), ...g.uyeler.map((u) => u.anahtar));
        yazilanSayi++;
        log(`  yazıldı: ${slug}`);
        ozet.yazilan.push(haber.title);
        yazildi(g, slug);
      } catch (e) {
        const mesaj = adresiSil(e.message);
        console.warn(`  hata: ${mesaj}`);
        if (e.ayar) {
          // Anahtar ya da model hatası: haberin suçu değil, sonra tekrar denenir.
          ozet.hata.push(mesaj);
          ayarHatasi = e;
          break;
        }
        // Habere özgü hata: 3 denemeden sonra görüldü sayılır (her turda Gemini harcamasın).
        const hh = (durum.hatalar[hataId] ??= { sayi: 0 });
        hh.sayi++;
        hh.mesaj = mesaj;
        hh.zaman = simdi.toISOString();
        ozet.hata.push(`${ad}: ${mesaj}`);
        if (hh.sayi >= EN_FAZLA_HATA) ele(g, '3 denemede yazılamadı');
        else g.uyeler.forEach((u) => koy({ kimlik: kim(u), durum: 'bekliyor', hata: new Error(temiz(mesaj)) }));
      }
    }

    // Kısa haber havuzu: dilimi bitmiş kısa haberler kategori aranmadan tek bir derleme yazısı olur (havuz.mjs).
    if (gemini) {
      try {
        const onceki = [...durum.havuz];
        const yazilanOlaylar = new Set(); // derlemeye giren olaylar
        let derlemeKapisi = null;
        const dusenNeden = new Map(); // havuzdan düşen olay -> düşme gerekçesi (grubun her olayı için)
        const nedenKoy = (grup, gerekce) => grup.forEach((o) => dusenNeden.set(o, temiz(gerekce)));
        const sh = await havuzuIsle(durum.havuz, {
          simdi,
          // Bu arada (bu turda ya da son 72 saatte) tam haber olarak yazılan olay düşer.
          mukerrer: (o) => {
            const t = o.basliklar.map((b) => tekrarBul(b, hafiza)).find(Boolean);
            return t ? `son ${HAFIZA_SAAT} saatte yazıldı` : null;
          },
          yaz: async (grup, kaynak) => {
            try {
              const t = await B.derlemeYaz(grup, kaynak);
              if (!t) nedenKoy(grup, 'derleme yazılamadı');
              return t;
            } catch (e) {
              if (!e.ayar) nedenKoy(grup, `derleme hatası: ${e.message}`);
              throw e;
            }
          },
          // Derleme alt sınırı derlemeEnAz(n); kısa kalan derleme denetimden önce ve düzeltme turundan sonra kaynaklarından uzatılır.
          denetle: async (t, kaynak, grup) => {
            const { alt, ust } = derlemeHedefi(grup.length);
            let sonuc;
            try {
              sonuc = await B.denetle(t, kaynak, { enAz: derlemeEnAz(grup.length), hedef: `${alt}-${ust}`, uzat: (tas, kelime) => B.derlemeUzat(tas, grup, kelime) });
            } catch (e) {
              if (!e.ayar) nedenKoy(grup, `derleme hatası: ${e.message}`);
              throw e;
            }
            // Denetim tamamlanmadıysa derleme yayımlanmaz ve olaylar havuzda kalır (havuz.mjs belirsiz bayrağına bakar).
            if (sonuc.sorunlar.length) {
              if (!sonuc.belirsiz) nedenKoy(grup, `derleme denetimden geçemedi: ${sonuc.sorunlar.join('; ')}`);
              return sonuc;
            }
            // Standartlar: kırmızı süzgeç derlemenin tamamında; madde madde ayıklanamadığı için kırmızıysa derleme yayımlanmaz.
            const kapi = await B.standartKapisi({ baslik: sonuc.haber.title, ozet: sonuc.haber.description, metin: sonuc.haber.body, ekler: [sonuc.haber.why_matters ?? t.why_matters, ...(sonuc.haber.key_points ?? t.key_points ?? [])], kaynakMetni: kaynak, kimlik: grup[0].id, motor: MOTOR, log: (m) => log(medyaGizle(m)) });
            derlemeKapisi = kapi;
            if (!kapi.yayimla) nedenKoy(grup, kapi.std.gerekce);
            return kapi.yayimla ? sonuc : { ...sonuc, sorunlar: [kapi.std.gerekce] };
          },
          kaydet: async (haber, t, grup) => {
            const slug = await B.haberYaz(rot, {
              ...haber,
              title: `${haber.title} · ${dilimEki(grup)}`,
              category: t.category,
              date: istanbulIso(simdi),
              draft: false,
              kaynakIzi: kaynakIzi(grup.flatMap((o) => o.kullanilan ?? [])),
              why_matters: haber.why_matters ?? t.why_matters,
              key_points: haber.key_points ?? t.key_points,
            });
            await derlemeKapisi?.yazildi(slug);
            hafiza.push(kayitKur({ title: haber.title, description: haber.description, slug }));
            yazilanSayi++;
            ozet.yazilan.push(`${haber.title} (derleme)`);
            // Derlemedeki her olayın üyeleri yazıldı (üyeler havuza girerken zaten görüldü işaretlenmişti).
            grup.forEach((o) => {
              yazilanOlaylar.add(o);
              uyeler(o).forEach((kimlik, ui) => {
                koy({ kimlik, durum: 'yazildi', slug });
                durum.gorulen[o.uyeIdler?.[ui] ?? o.id] ??= simdi.toISOString();
              });
            });
            return slug;
          },
          surVar: () => !payNedeni(),
          log: (m) => log(medyaGizle(m)),
        });
        const kalan = new Set(sh.havuz);
        // Havuzdan düşenler (süresi doldu, dilimde eş yok, mükerrer, yazılamayan derleme): derlemeye girmeyen ve kalmayan olaylar.
        for (const o of onceki) {
          if (kalan.has(o) || yazilanOlaylar.has(o)) continue;
          uyeler(o).forEach((kimlik, ui) => {
            koy({ kimlik, durum: 'elendi', gerekce: dusenNeden.get(o) ?? 'kısa, eş bulunamadı' });
            durum.gorulen[o.uyeIdler?.[ui] ?? o.id] ??= simdi.toISOString();
          });
        }
        durum.havuz = sh.havuz;
        if (sh.ayarHatasi) {
          ozet.hata.push(`derleme: ${adresiSil(sh.ayarHatasi.message)}`);
          ayarHatasi ??= sh.ayarHatasi;
        }
      } catch (e) {
        console.warn(`havuz hatası: ${adresiSil(e.message)}`);
        ozet.hata.push(`havuz: ${adresiSil(e.message)}`);
      }
    }

    if (ayarHatasi) {
      ayarHatasi.sonuclar = sonuclar;
      throw ayarHatasi;
    }
    return sonuclar;
  }

  return { adaylar, isle, kuru, ozet, simdi };
}

/**
 * Motor yokken yerel tur: karar bekleyen adaylar (gorulen'de olmayanlar) işlenir; yazildi / elendi / havuzda olan her üye
 * gorulen'e işaretlenir, bekleyenler (puanlanamayan, denetimi tamamlanamayan, payı dolan) işaretlenmez. Bugünkü davranışın aynısı.
 * Turu durduran ayar hatası ayarHatasi olarak döner (eskiden de tur durur, durum yine yazılırdı).
 */
export async function yerelTur(uyarlayici, durum, { log } = {}) {
  const hepsi = await uyarlayici.adaylar({ log });
  const kimden = new Map(hepsi.map((a) => [a.kimlik, a.yuk.id]));
  let sonuclar;
  let ayarHatasi = null;
  try {
    sonuclar = await uyarlayici.isle(gorulmeyen(hepsi, durum), { log });
  } catch (e) {
    if (!Array.isArray(e?.sonuclar)) throw e;
    sonuclar = e.sonuclar;
    ayarHatasi = e;
  }
  const zaman = (uyarlayici.simdi ?? new Date()).toISOString();
  for (const s of sonuclar) {
    const karar = s.durum === 'yazildi' || s.durum === 'elendi' || (s.durum === 'bekliyor' && s.havuzda);
    const id = kimden.get(s.kimlik);
    if (karar && id) durum.gorulen[id] ??= zaman;
  }
  return { sonuclar, ayarHatasi };
}
