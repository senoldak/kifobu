import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  urlAnahtari,
  kesfiUygula,
  type KampanyaDetay,
  type PlatformTurSonucu,
  type TakipDosyasi,
  type TakipKaydi,
  type ElListesi,
} from './kampanya-takip.ts';

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
