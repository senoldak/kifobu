import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  urlAnahtari,
  kesfiUygula,
  arsiveTasi,
  bultenListesi,
  alarmSuz,
  type Olay,
  type KampanyaDetay,
  type PlatformTurSonucu,
  type TakipDosyasi,
  type TakipKaydi,
  type ElListesi,
} from './kampanya-takip.ts';
import { gecmisGirisimler, type GecmisKampanya } from './kampanya-gecmis.ts';

test('urlAnahtari: büyük/küçük harf ve pid dışındaki parametreler anahtarı değiştirmez', () => {
  assert.equal(
    urlAnahtari('https://Fonangels.com/kampanyalar/projehakkinda/VisitExtra?pid=1803&utm=x'),
    urlAnahtari('https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1803'),
  );
});

test('urlAnahtari: sondaki eğik çizgi anahtarı değiştirmez', () => {
  assert.equal(
    urlAnahtari('https://kfs.trinkfon.com/projeler/pupaq/kampanya'),
    urlAnahtari('https://kfs.trinkfon.com/projeler/pupaq/kampanya/'),
  );
});

test('urlAnahtari: farklı pid farklı anahtar verir', () => {
  assert.notEqual(
    urlAnahtari('https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1803'),
    urlAnahtari('https://fonangels.com/kampanyalar/projehakkinda/visitextra?pid=1804'),
  );
});

test('urlAnahtari: fongogo URLKey kimliği taşır', () => {
  const taban = 'https://yatirim.fongogo.com/ProjectDetail/PreliminaryInformation';
  assert.notEqual(urlAnahtari(`${taban}?URLKey=ilk-proje`), urlAnahtari(`${taban}?URLKey=ikinci-proje`));
  assert.equal(
    urlAnahtari(`${taban}?URLKey=Ilk-Proje&utm_source=x`),
    urlAnahtari(`${taban}?urlkey=ilk-proje`),
  );
});

// ---- kesfiUygula ----
const GUN = '2026-11-17';
const P = 'fonx';
const U1 = 'https://fonx.example.com/kampanya/alfa';
const U2 = 'https://fonx.example.com/kampanya/beta';
const bosEl: ElListesi = { ekle: [], cikar: [], duzelt: {} };

function detay(o: Partial<KampanyaDetay> = {}): KampanyaDetay {
  return {
    ad: null, hedef: 5000000, arzOrani: 0.1, degerleme: null, baslangic: '2026-11-01', bitis: '2026-12-01',
    toplanan: 100000, yatirimci: 10, nitelikli: null, kalanGun: 14, sonGun: false, bitti: false, fonlandi: null, ...o,
  };
}
function kayit(o: Partial<TakipKaydi> = {}): TakipKaydi {
  return {
    ad: 'ALFA', platform: P, url: U1, durum: 'aktif', hedef: 5000000, arzOrani: 0.1, degerleme: 50000000,
    baslangic: '2026-11-01', bitis: '2026-12-01', toplanan: 100000, yatirimci: 10, nitelikli: null, fonlandi: null,
    ilkGorulme: '2026-11-10', sonGorulme: '2026-11-16', bittiGorulme: null, eksik: [], kayipTur: 0, ...o,
  };
}
function takip(k: TakipKaydi[] = []): TakipDosyasi { return { sonKesif: null, kampanyalar: k, alarmlar: {} }; }
function sonuc(o: Partial<PlatformTurSonucu> = {}): PlatformTurSonucu {
  return { platform: P, hata: null, liste: [], detaylar: {}, ...o };
}
function uygula(t: TakipDosyasi, s: PlatformTurSonucu[], extra: { el?: ElListesi; arsivAdlari?: string[]; gun?: string } = {}) {
  return kesfiUygula({ takip: t, sonuclar: s, gun: extra.gun ?? GUN, el: extra.el ?? bosEl, arsivAdlari: extra.arsivAdlari ?? [] });
}
const tekListe = (ad: string, url: string, bolum: 'aktif' | 'yakinda', d: KampanyaDetay | null) =>
  sonuc({ liste: [{ ad, url, bolum }], detaylar: { [urlAnahtari(url)]: d } });

test('kesfiUygula 1: yeni aktif kampanya eklenir', () => {
  const r = uygula(takip(), [tekListe('alfa', U1, 'aktif', detay({ ad: 'Alfa Girişim' }))]);
  assert.equal(r.takip.kampanyalar.length, 1);
  const k = r.takip.kampanyalar[0];
  assert.equal(k.durum, 'aktif');
  assert.equal(k.ad, 'ALFA GİRİŞİM');
  assert.equal(k.ilkGorulme, GUN);
  assert.equal(k.sonGorulme, GUN);
  assert.equal(k.degerleme, 50000000);
  assert.deepEqual(k.eksik, []);
  const o = r.olaylar.find((x) => x.tur === 'yeni')!;
  assert.ok(o);
  assert.equal(o.anahtar, `${P}:yeni:${urlAnahtari(U1)}`);
  for (const parca of ['ALFA GİRİŞİM', P, '₺5.000.000', '₺50.000.000', U1]) assert.ok(o.metin.includes(parca), parca);
});

test('kesfiUygula 2: değerleme okunamayınca eksik işaretlenir', () => {
  const r = uygula(takip(), [tekListe('alfa', U1, 'aktif', detay({ arzOrani: null }))]);
  const k = r.takip.kampanyalar[0];
  assert.equal(k.degerleme, null);
  assert.ok(k.eksik.includes('degerleme'));
  assert.ok(r.olaylar.find((x) => x.tur === 'yeni')!.metin.includes('okunamadı'));
});

test('kesfiUygula 3: bitmiş yeni kayıt eklenmez', () => {
  const r = uygula(takip(), [tekListe('alfa', U1, 'aktif', detay({ bitti: true }))]);
  assert.equal(r.takip.kampanyalar.length, 0);
});

test('kesfiUygula 4: detayı açılamayan yeni kayıt eklenmez, okuyucu-bozuk olayı', () => {
  const r = uygula(takip(), [tekListe('alfa', U1, 'aktif', null)]);
  assert.equal(r.takip.kampanyalar.length, 0);
  assert.ok(r.olaylar.some((x) => x.tur === 'okuyucu-bozuk' && x.anahtar === `${P}:okuyucu-bozuk`));
});

test('kesfiUygula 5: hatalı platform sonucu kayıtları olduğu gibi bırakır', () => {
  const r = uygula(takip([kayit()]), [sonuc({ hata: 'ağ hatası' })]);
  assert.deepEqual(r.takip.kampanyalar, [kayit()]);
  assert.ok(r.olaylar.some((x) => x.tur === 'okuyucu-bozuk'));
});

test('kesfiUygula 6: boş liste ve takipte kayıt varsa okuyucu-bozuk, kayıtlar aynı', () => {
  const t = [kayit(), kayit({ url: U2, durum: 'yakinda', ad: 'BETA' })];
  const r = uygula(takip(t), [sonuc()]);
  assert.deepEqual(r.takip.kampanyalar, [kayit(), kayit({ url: U2, durum: 'yakinda', ad: 'BETA' })]);
  assert.ok(r.olaylar.some((x) => x.tur === 'okuyucu-bozuk'));
});

test('kesfiUygula 7: yakında kayıt aktife geçer', () => {
  const r = uygula(takip([kayit({ durum: 'yakinda' })]), [tekListe('alfa', U1, 'aktif', detay())]);
  assert.equal(r.takip.kampanyalar[0].durum, 'aktif');
  assert.ok(r.olaylar.some((x) => x.tur === 'aktife-gecti'));
});

test('kesfiUygula 8: detay bitti derse durum bitti, olay yalnız ilk kez', () => {
  const s = () => [tekListe('alfa', U1, 'aktif', detay({ bitti: true }))];
  const r1 = uygula(takip([kayit()]), s());
  assert.equal(r1.takip.kampanyalar[0].durum, 'bitti');
  assert.equal(r1.takip.kampanyalar[0].bittiGorulme, GUN);
  assert.equal(r1.olaylar.filter((x) => x.tur === 'bitti').length, 1);
  const r2 = uygula(r1.takip, s(), { gun: '2026-11-18' });
  assert.equal(r2.takip.kampanyalar[0].bittiGorulme, GUN);
  assert.equal(r2.olaylar.filter((x) => x.tur === 'bitti').length, 0);
});

test('kesfiUygula 8b: bitiş tarihi geçen aktif kayıt bitti sayılır; yakında kayıt bitmez', () => {
  const r = uygula(takip([kayit()]), [tekListe('alfa', U1, 'aktif', detay({ bitis: '2026-11-16' }))]);
  assert.equal(r.takip.kampanyalar[0].durum, 'bitti');
  assert.ok(r.olaylar.find((x) => x.tur === 'bitti')!.metin.includes('bitiş tarihi geçti'));
  const y = uygula(takip([kayit({ durum: 'yakinda' })]), [tekListe('alfa', U1, 'yakinda', detay({ bitis: '2024-05-01' }))]);
  assert.equal(y.takip.kampanyalar[0].durum, 'yakinda');
  assert.equal(y.olaylar.filter((x) => x.tur === 'bitti').length, 0);
});

test('kesfiUygula 9: listede olmayan kayıt için kayipTur artar, ikinci turda kayboldu', () => {
  const diger = tekListe('beta', U2, 'aktif', detay());
  const r1 = uygula(takip([kayit()]), [diger]);
  assert.equal(r1.takip.kampanyalar.find((k) => k.url === U1)!.kayipTur, 1);
  assert.equal(r1.olaylar.filter((x) => x.tur === 'kayboldu').length, 0);
  const r2 = uygula(r1.takip, [diger], { gun: '2026-11-18' });
  const a = r2.takip.kampanyalar.find((k) => k.url === U1)!;
  assert.equal(a.kayipTur, 2);
  assert.equal(a.durum, 'aktif');
  assert.equal(r2.olaylar.filter((x) => x.tur === 'kayboldu').length, 1);
});

test('kesfiUygula 10: el.cikar içindeki URL eklenmez', () => {
  const r = uygula(takip(), [tekListe('alfa', U1, 'aktif', detay())], { el: { ekle: [], cikar: [U1], duzelt: {} } });
  assert.equal(r.takip.kampanyalar.length, 0);
});

test('kesfiUygula 11: arşivdeki ad birebir eşleşirse arşiv adı kullanılır', () => {
  const r = uygula(takip(), [tekListe('Karma Türkiye', U1, 'aktif', detay())], { arsivAdlari: ['KARMA TÜRKİYE'] });
  assert.equal(r.takip.kampanyalar[0].ad, 'KARMA TÜRKİYE');
  assert.equal(r.olaylar.some((x) => x.tur === 'olasi-cift'), false);
});

test('kesfiUygula 12: arşiv adını içeren ad olası çift sayılır', () => {
  const r = uygula(takip(), [tekListe('Athletic Labs Pro', U1, 'aktif', detay())], { arsivAdlari: ['ATHLETICLABS'] });
  assert.equal(r.takip.kampanyalar[0].ad, 'ATHLETIC LABS PRO');
  assert.ok(r.olaylar.some((x) => x.tur === 'olasi-cift'));
});

test('kesfiUygula 13: null detay alanı eski değeri ezmez', () => {
  const r = uygula(takip([kayit()]), [tekListe('alfa', U1, 'aktif', detay({ hedef: null, arzOrani: null, toplanan: 250000 }))]);
  const k = r.takip.kampanyalar[0];
  assert.equal(k.hedef, 5000000);
  assert.equal(k.arzOrani, 0.1);
  assert.equal(k.degerleme, 50000000);
  assert.equal(k.toplanan, 250000);
});

test('kesfiUygula 14: sonKesif yazılır', () => {
  assert.equal(uygula(takip(), []).takip.sonKesif, GUN);
});

test('kesfiUygula: URL anahtarı çıkarılamayan liste kaydı atlanır, okuyucu-bozuk olayı, tur sürer', () => {
  const s = sonuc({
    liste: [{ ad: 'bozuk', url: '/goreli/yol', bolum: 'aktif' }, { ad: 'alfa', url: U1, bolum: 'aktif' }],
    detaylar: { [urlAnahtari(U1)]: detay() },
  });
  const r = uygula(takip(), [s]);
  assert.equal(r.takip.kampanyalar.length, 1);
  assert.ok(r.olaylar.some((x) => x.tur === 'okuyucu-bozuk' && x.anahtar === `${P}:okuyucu-bozuk`));
});

test('kesfiUygula: ASCII marka adı düz büyük harfe çevrilir, Türkçe ad İ korur', () => {
  const a = uygula(takip(), [tekListe('VisitExtra', U1, 'aktif', detay())]);
  assert.equal(a.takip.kampanyalar[0].ad, 'VISITEXTRA');
  const b = uygula(takip(), [tekListe('Işık Tekstil', U2, 'aktif', detay({ ad: 'Çiçek İnşaat' }))]);
  assert.equal(b.takip.kampanyalar[0].ad, 'ÇİÇEK İNŞAAT');
});

test('kesfiUygula: el.ekle ve el.duzelt takip çıktısını değiştirmez, yalnız cikar etkilidir', () => {
  const t = () => takip([kayit()]);
  const s = () => [tekListe('alfa', U1, 'aktif', detay({ toplanan: 300000 })), tekListe('beta', U2, 'aktif', detay())];
  const doluEl: ElListesi = {
    ekle: [{ ad: 'Elle', platform: P, url: 'https://fonx.example.com/kampanya/elle', bolum: 'aktif', hedef: 1 }],
    cikar: [],
    duzelt: { [U1]: { durum: 'bitti', hedef: 7 } },
  };
  assert.deepEqual(uygula(t(), s(), { el: doluEl }), uygula(t(), s()));
});

test('kesfiUygula: hatalı/boş platform sonucunda dolu el ile de kayıtlar aynı kalır', () => {
  const doluEl: ElListesi = { ekle: [{ ad: 'E', platform: P, url: U2, bolum: 'aktif' }], cikar: [], duzelt: { [U1]: { hedef: 9 } } };
  for (const s of [sonuc({ hata: 'x' }), sonuc()]) {
    const r = uygula(takip([kayit()]), [s], { el: doluEl });
    assert.deepEqual(r.takip.kampanyalar, [kayit()]);
  }
});

test('kesfiUygula: birebir arşiv eşleşmesi varken başka arşiv adına olasi-cift üretilmez', () => {
  const r = uygula(takip(), [tekListe('Karma Türkiye', U1, 'aktif', detay())], { arsivAdlari: ['KARMA', 'KARMA TÜRKİYE'] });
  assert.equal(r.takip.kampanyalar[0].ad, 'KARMA TÜRKİYE');
  assert.equal(r.olaylar.some((x) => x.tur === 'olasi-cift'), false);
});

test('kesfiUygula: mevcut kaydın detayı açılamazsa okuyucu-bozuk, kayıt değişmez', () => {
  const r = uygula(takip([kayit()]), [tekListe('alfa', U1, 'aktif', null)]);
  assert.ok(r.olaylar.some((x) => x.tur === 'okuyucu-bozuk' && x.anahtar === `${P}:okuyucu-bozuk`));
  assert.deepEqual(r.takip.kampanyalar, [kayit({ sonGorulme: GUN })]);
});

// ---- arsiveTasi ----
function arsivK(o: Partial<GecmisKampanya> = {}): GecmisKampanya {
  return {
    anahtar: 'ESKI', ad: 'ESKİ', tur: null, platform: P, durum: 'fonlandi', baslangic: '2025-01-01', bitis: '2025-02-01',
    hedef: 1000000, alinan: 1000000, payArz: 0.1, yatirimci: 5, nitelikli: null, sermaye: null, payFiyati: null,
    payGrubu: null, fonAktarim: null, sirket: null, url: 'https://fonx.example.com/kampanya/eski', ...o,
  };
}
const bitmis = (o: Partial<TakipKaydi> = {}) => kayit({ durum: 'bitti', bittiGorulme: '2026-11-16', ...o });
function tasi(k: TakipKaydi[], arsiv: GecmisKampanya[] = [], gunluk: Record<string, number> = {}) {
  return arsiveTasi({ takip: takip(k), arsiv, gun: GUN, gunlukSonAlinan: gunluk });
}

test('arsiveTasi 1: bittiGorulme bugüne eşitse taşınmaz', () => {
  const r = tasi([bitmis({ bittiGorulme: GUN })]);
  assert.equal(r.takip.kampanyalar.length, 1);
  assert.equal(r.yeniArsiv.length, 0);
  assert.equal(r.olaylar.length, 0);
});

test('arsiveTasi 2: önceki günde biten kayıt arşive taşınır, takipten çıkar, olay üretilir', () => {
  const r = tasi([bitmis({ fonlandi: true, toplanan: 6000000, yatirimci: 40, nitelikli: 3 })]);
  assert.equal(r.takip.kampanyalar.length, 0);
  assert.deepEqual(r.yeniArsiv, [{
    anahtar: 'ALFA', ad: 'ALFA', tur: null, platform: P, durum: 'fonlandi', baslangic: '2026-11-01', bitis: '2026-12-01',
    hedef: 5000000, alinan: 6000000, payArz: 0.1, yatirimci: 40, nitelikli: 3, sermaye: null, payFiyati: null,
    payGrubu: null, fonAktarim: null, sirket: null, url: U1,
  }]);
  assert.equal(r.olaylar.length, 1);
  assert.equal(r.olaylar[0].tur, 'arsive-tasindi');
  assert.match(r.olaylar[0].metin, /ALFA/);
  assert.match(r.olaylar[0].metin, /fonlandı/);
  assert.match(r.olaylar[0].metin, /₺6\.000\.000/);
  assert.doesNotMatch(r.olaylar[0].metin, /günlük kayıttan/);
});

test('arsiveTasi 3: durum fonlandi alanından, null ise alinan >= hedef', () => {
  const d = (f: boolean | null, t: number) => tasi([bitmis({ fonlandi: f, toplanan: t })]).yeniArsiv[0].durum;
  assert.equal(d(true, 1), 'fonlandi');
  assert.equal(d(false, 9000000), 'fonlanamadi');
  assert.equal(d(null, 5000000), 'fonlandi');
  assert.equal(d(null, 4999999), 'fonlanamadi');
});

test('arsiveTasi 4: payArz arzOrani yoksa hedef/değerlemeden, ikisi de yoksa null', () => {
  const p = (o: Partial<TakipKaydi>) => tasi([bitmis(o)]).yeniArsiv[0].payArz;
  assert.equal(p({ arzOrani: null, hedef: 1000032, degerleme: 25000800 }), 0.04);
  assert.equal(p({ arzOrani: null, degerleme: null }), null);
  assert.equal(p({ arzOrani: 0.2 }), 0.2);
});

test('arsiveTasi 5: toplanan yoksa günlük kayıttan alınır; o da yoksa arsivlenemedi', () => {
  const r = tasi([bitmis({ toplanan: null })], [], { ALFA: 4200000 });
  assert.equal(r.yeniArsiv[0].alinan, 4200000);
  assert.match(r.olaylar[0].metin, /günlük kayıttan/);
  const r2 = tasi([bitmis({ toplanan: null })]);
  assert.equal(r2.yeniArsiv.length, 0);
  assert.equal(r2.takip.kampanyalar.length, 1);
  assert.equal(r2.olaylar[0].tur, 'arsivlenemedi');
});

test('arsiveTasi 6: hedef ya da başlangıç null ise taşınmaz, arsivlenemedi, kayıt takipte kalır', () => {
  for (const o of [{ hedef: null }, { baslangic: null }]) {
    const r = tasi([bitmis(o)]);
    assert.equal(r.yeniArsiv.length, 0);
    assert.equal(r.takip.kampanyalar.length, 1);
    assert.equal(r.olaylar.length, 1);
    assert.equal(r.olaylar[0].tur, 'arsivlenemedi');
  }
});

test('arsiveTasi 7: aynı adlı tek eski kampanya tur 1 olur, yenisi aynı anahtarla tur 2; çok turda max+1', () => {
  const eski = arsivK({ anahtar: 'ESKIGIRISIM', ad: 'ALFA', url: 'https://fonx.example.com/kampanya/alfa-eski' });
  const r = tasi([bitmis()], [eski]);
  const yeni = r.yeniArsiv.find((k) => k.url === U1)!;
  const eskiSon = r.yeniArsiv.find((k) => k.url === eski.url)!;
  assert.equal(yeni.anahtar, 'ESKIGIRISIM');
  assert.equal(yeni.tur, 2);
  assert.equal(eskiSon.tur, 1);
  assert.equal(eski.tur, null, 'girdi değişmez');

  const a1 = arsivK({ anahtar: 'X', ad: 'Alfa', tur: 1, url: 'https://fonx.example.com/k/1' });
  const a2 = arsivK({ anahtar: 'X', ad: 'Alfa', tur: 2, url: 'https://fonx.example.com/k/2', baslangic: '2025-06-01' });
  const r2 = tasi([bitmis()], [a2, a1]);
  const y2 = r2.yeniArsiv.find((k) => k.url === U1)!;
  assert.equal(y2.tur, 3);
  assert.equal(y2.anahtar, 'X');
});

test('arsiveTasi 8: eşleşme yoksa anahtar büyük harfli, harf-rakam dışı atılmış addır', () => {
  const r = tasi([bitmis({ ad: 'Çiğ Köfte-1 A.Ş.' })]);
  assert.equal(r.yeniArsiv[0].anahtar, 'ÇIĞKÖFTE1AŞ');
  assert.equal(tasi([bitmis({ ad: 'Visitextra' })]).yeniArsiv[0].anahtar, 'VISITEXTRA');
  assert.equal(tasi([bitmis({ ad: 'Karma Türkiye' })]).yeniArsiv[0].anahtar, 'KARMATÜRKIYE');
});

test('arsiveTasi 9: arşivde aynı URL varsa yeniden eklenmez, yalnız takipten çıkar', () => {
  const var_ = arsivK({ ad: 'ALFA', url: `${U1}/?utm=x` });
  const r = tasi([bitmis()], [var_]);
  assert.equal(r.takip.kampanyalar.length, 0);
  assert.equal(r.yeniArsiv.length, 1);
  assert.equal(r.yeniArsiv[0].tur, null);
});

test('arsiveTasi 10: çıktı arşivde girişim slugları tekil, başlangıca göre en yeni başta', () => {
  const eski = arsivK({ anahtar: 'ALFA', ad: 'ALFA', baslangic: '2025-01-01' });
  const r = tasi([
    bitmis({ ad: 'ALFA', url: U1, baslangic: '2026-11-01' }),
    bitmis({ ad: 'BETA', url: U2, baslangic: '2026-09-01' }),
    bitmis({ ad: 'BETA', url: 'https://fonx.example.com/kampanya/beta2', baslangic: '2026-10-01' }),
  ], [eski]);
  const slugs = gecmisGirisimler(r.yeniArsiv).map((g) => g.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  const tarihler = r.yeniArsiv.map((k) => k.baslangic);
  assert.deepEqual(tarihler, [...tarihler].sort().reverse());
  assert.deepEqual(r.yeniArsiv.filter((k) => k.ad === 'BETA').map((k) => k.tur).sort(), [1, 2]);
});

test('arsiveTasi: hedef <= 0 ya da toplanan < 0 geçersiz sayılır, arsivlenemedi', () => {
  for (const [o, alan] of [[{ hedef: 0 }, 'hedef'], [{ toplanan: -1 }, 'toplanan tutar']] as const) {
    const r = tasi([bitmis(o)]);
    assert.equal(r.yeniArsiv.length, 0);
    assert.equal(r.takip.kampanyalar.length, 1);
    assert.equal(r.olaylar[0].tur, 'arsivlenemedi');
    assert.match(r.olaylar[0].metin, new RegExp(alan));
  }
});

test('arsiveTasi: bitiş başlangıçtan önceyse arsivlenemedi', () => {
  const r = tasi([bitmis({ baslangic: '2026-11-10', bitis: '2026-11-01' })]);
  assert.equal(r.yeniArsiv.length, 0);
  assert.equal(r.takip.kampanyalar.length, 1);
  assert.equal(r.olaylar[0].tur, 'arsivlenemedi');
  assert.match(r.olaylar[0].metin, /bitiş başlangıçtan önce/);
});

// ---- bultenListesi ----

const EL_U = 'https://fonx.example.com/kampanya/el-girisim';
const bul = (k: TakipKaydi[], el: ElListesi = bosEl) => bultenListesi(takip(k), el);

test('bultenListesi: aktif ve bitti kayıtlar girer, bitti olanda SONA ERDİ ve tamamlandi true', () => {
  const r = bul([kayit(), kayit({ ad: 'BETA', url: U2, durum: 'bitti', bittiGorulme: GUN, fonlandi: true })]);
  assert.equal(r.aktif.length, 2);
  assert.deepEqual(r.aktif[0], { ad: 'ALFA', platform: P, url: U1, hedefFon: 5000000, degerleme: 50000000 });
  assert.equal(r.aktif[1].sabitDurum, 'SONA ERDİ');
  assert.equal(r.aktif[1].tamamlandi, true);
});

test('bultenListesi: hedefi null olan kayıt girmez, degerleme null 0 olur', () => {
  const r = bul([kayit({ hedef: null }), kayit({ ad: 'BETA', url: U2, degerleme: null })]);
  assert.deepEqual(r.aktif.map((x) => x.ad), ['BETA']);
  assert.equal(r.aktif[0].degerleme, 0);
});

test('bultenListesi: yakinda kayıt yakinda listesine gider, tutar gerekmez', () => {
  const r = bul([kayit({ durum: 'yakinda', hedef: null, degerleme: null })]);
  assert.equal(r.aktif.length, 0);
  assert.deepEqual(r.yakinda, [{ ad: 'ALFA', platform: P, url: U1 }]);
});

test('bultenListesi: aktifte aynı adı taşıyan yakinda kaydı çıkarılır', () => {
  const r = bul([kayit(), kayit({ url: U2, durum: 'yakinda' })]);
  assert.equal(r.yakinda.length, 0);
});

test('bultenListesi: sıra platform sonra ilkGorulme', () => {
  const r = bul([
    kayit({ ad: 'C', url: 'https://b.example.com/c', platform: 'b', ilkGorulme: '2026-11-01' }),
    kayit({ ad: 'B', url: U2, ilkGorulme: '2026-11-12' }),
    kayit({ ad: 'A', url: U1, ilkGorulme: '2026-11-05' }),
  ]);
  assert.deepEqual(r.aktif.map((x) => x.ad), ['C', 'A', 'B']);
});

test('bultenListesi: el.ekle aktif eklenir; takipte aynı anahtar varsa takipteki kalır', () => {
  const el: ElListesi = {
    ekle: [
      { ad: 'EL', platform: P, url: EL_U, bolum: 'aktif', hedef: 1000, degerleme: 9000 },
      { ad: 'SAHTE', platform: P, url: U1 + '?utm=x', bolum: 'aktif', hedef: 1, degerleme: 1 },
    ],
    cikar: [], duzelt: {},
  };
  const r = bul([kayit()], el);
  assert.deepEqual(r.aktif.map((x) => x.ad).sort(), ['ALFA', 'EL']);
  assert.equal(r.aktif.find((x) => x.ad === 'ALFA')?.hedefFon, 5000000);
  assert.equal(r.aktif.find((x) => x.ad === 'EL')?.hedefFon, 1000);
});

test('bultenListesi: el.ekle hedefsiz aktif atlanır, yakinda girer', () => {
  const el: ElListesi = {
    ekle: [
      { ad: 'HEDEFSIZ', platform: P, url: EL_U, bolum: 'aktif' },
      { ad: 'YAKIN', platform: P, url: 'https://fonx.example.com/kampanya/yakin', bolum: 'yakinda' },
    ],
    cikar: [], duzelt: {},
  };
  const r = bul([], el);
  assert.equal(r.aktif.length, 0);
  assert.deepEqual(r.yakinda.map((x) => x.ad), ['YAKIN']);
});

test('bultenListesi: el.cikar takip ve el kayıtlarını kaldırır', () => {
  const el: ElListesi = {
    ekle: [{ ad: 'EL', platform: P, url: EL_U, bolum: 'aktif', hedef: 1, degerleme: 1 }],
    cikar: [U1 + '/', EL_U], duzelt: {},
  };
  const r = bul([kayit(), kayit({ ad: 'BETA', url: U2 })], el);
  assert.deepEqual(r.aktif.map((x) => x.ad), ['BETA']);
});

test('bultenListesi: el.duzelt hedef, degerleme ve ad değiştirir; takip girdisine yazılmaz', () => {
  const k = kayit();
  const t = takip([k]);
  const r = bultenListesi(t, { ekle: [], cikar: [], duzelt: { [U1]: { hedef: 7, degerleme: 70, ad: 'YENİ' } } });
  assert.equal(r.aktif[0].hedefFon, 7);
  assert.equal(r.aktif[0].degerleme, 70);
  assert.equal(r.aktif[0].ad, 'YENİ');
  assert.equal(t.kampanyalar[0].hedef, 5000000);
  assert.equal(t.kampanyalar[0].ad, 'ALFA');
});

test('bultenListesi: el.duzelt el.ekle ile gelen ve takipteki kazanan kayda da uygulanır', () => {
  const el: ElListesi = {
    ekle: [{ ad: 'EL', platform: P, url: EL_U, bolum: 'aktif', hedef: 1, degerleme: 1 }],
    cikar: [], duzelt: { [EL_U]: { hedef: 99 } },
  };
  assert.equal(bul([], el).aktif[0].hedefFon, 99);
});

test('bultenListesi: el.duzelt durum bitti SONA ERDİ yapar; hedefsiz kaydı hedefle kurtarır', () => {
  const r = bul([kayit({ hedef: null })], { ekle: [], cikar: [], duzelt: { [U1]: { hedef: 5, durum: 'bitti' } } });
  assert.equal(r.aktif[0].sabitDurum, 'SONA ERDİ');
  assert.equal(r.aktif[0].tamamlandi, true);
});

test('bultenListesi: bozuk adresli el girdileri atlanır, fırlatmaz', () => {
  const el: ElListesi = {
    ekle: [{ ad: 'BOZUK', platform: P, url: 'bozuk adres', bolum: 'aktif', hedef: 1, degerleme: 1 }],
    cikar: ['bozuk'], duzelt: { 'bozuk': { hedef: 1 } },
  };
  assert.equal(bul([kayit()], el).aktif.length, 1);
});

// ---- alarmSuz ----

const olay = (tur: Olay['tur'], anahtar = 'fonx:x'): Olay => ({ tur, anahtar, metin: 'm' });

test('alarmSuz: gürültülü türler aynı anahtar için aynı gün bir kez geçer', () => {
  for (const tur of ['okuyucu-bozuk', 'kayboldu', 'arsivlenemedi', 'olasi-cift'] as const) {
    const ilk = alarmSuz([olay(tur)], {}, GUN);
    assert.equal(ilk.gonderilecek.length, 1, tur);
    assert.equal(ilk.alarmlar['fonx:x'], GUN);
    assert.equal(alarmSuz([olay(tur)], ilk.alarmlar, GUN).gonderilecek.length, 0, tur);
  }
});

test('alarmSuz: aynı anahtar ertesi gün yine geçer, eski kayıtlar silinmez', () => {
  const r = alarmSuz([olay('kayboldu')], { 'fonx:x': '2026-11-16', diger: '2026-11-10' }, GUN);
  assert.equal(r.gonderilecek.length, 1);
  assert.equal(r.alarmlar['fonx:x'], GUN);
  assert.equal(r.alarmlar.diger, '2026-11-10');
});

test('alarmSuz: bilgi türleri her zaman geçer ve alarmlara yazılmaz', () => {
  const o = (['yeni', 'aktife-gecti', 'bitti', 'arsive-tasindi'] as const).map((t) => olay(t));
  const r = alarmSuz(o, { 'fonx:x': GUN }, GUN);
  assert.equal(r.gonderilecek.length, 4);
  assert.deepEqual(r.alarmlar, { 'fonx:x': GUN });
});

test('alarmSuz: aynı çağrıda tekrarlanan gürültülü anahtar bir kez geçer; girdi değişmez', () => {
  const g = { a: '2026-11-01' };
  const r = alarmSuz([olay('kayboldu', 'k'), olay('kayboldu', 'k')], g, GUN);
  assert.equal(r.gonderilecek.length, 1);
  assert.deepEqual(g, { a: '2026-11-01' });
});

test('bultenListesi: bitti kayıtta tamamlandi yalnız gerçekten fonlanmışsa true', () => {
  const b = (o: Partial<TakipKaydi>) => bul([kayit({ durum: 'bitti', ...o })]).aktif[0];
  assert.equal(b({ fonlandi: false, toplanan: 9000000 }).tamamlandi, false);
  assert.equal(b({ fonlandi: null, toplanan: 100000 }).tamamlandi, false);
  assert.equal(b({ fonlandi: null, toplanan: 5000000 }).tamamlandi, true);
  assert.equal(b({ fonlandi: true, toplanan: 1 }).tamamlandi, true);
  assert.equal(b({ fonlandi: false }).sabitDurum, 'SONA ERDİ');
});

test('kesfiUygula (karar 14): listede olmayan ama detayı okunan kayıt işlenir ve biter', () => {
  const d = detay({ bitti: true, fonlandi: true, toplanan: 5135900, hedef: 5000000, bitis: '2026-11-05' });
  const diger = tekListe('beta', U2, 'aktif', detay());
  const sn = (): PlatformTurSonucu[] => [{ ...diger, detaylar: { ...diger.detaylar, [urlAnahtari(U1)]: d } }];
  const r1 = uygula(takip([kayit({ hedef: null, toplanan: null, fonlandi: null, bitis: null })]), sn());
  const k = r1.takip.kampanyalar.find((x) => x.url === U1)!;
  assert.equal(k.durum, 'bitti');
  assert.equal(k.bittiGorulme, GUN);
  assert.equal(k.fonlandi, true);
  assert.equal(k.toplanan, 5135900);
  assert.equal(k.hedef, 5000000);
  assert.equal(k.kayipTur, 0);
  assert.equal(r1.olaylar.filter((x) => x.tur === 'bitti').length, 1);
  const r2 = uygula(r1.takip, sn(), { gun: '2026-11-18' });
  assert.equal(r2.olaylar.filter((x) => x.tur === 'bitti').length, 0);
  assert.equal(r2.takip.kampanyalar.find((x) => x.url === U1)!.bittiGorulme, GUN);
});

test('kesfiUygula (karar 14): listede olmayan, detayı bitmemiş kayıt birleşir ve kayipTur artar', () => {
  const diger = tekListe('beta', U2, 'aktif', detay());
  const s: PlatformTurSonucu[] = [{ ...diger, detaylar: { ...diger.detaylar, [urlAnahtari(U1)]: detay({ toplanan: 777000, hedef: null }) } }];
  const r = uygula(takip([kayit()]), s);
  const k = r.takip.kampanyalar.find((x) => x.url === U1)!;
  assert.equal(k.durum, 'aktif');
  assert.equal(k.toplanan, 777000);
  assert.equal(k.hedef, 5000000);
  assert.equal(k.kayipTur, 1);
});

