import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EN_AZ_KELIME } from './indeks.ts';
import { EN_AZ_HABER, KONULAR, haberKonulari, platformHaberleri, platformlar, platformSayfasi, slugTr, yayimlananKonular, type KonuAday } from './konular.ts';
import { kampanyalar, girisimEslesir } from './kampanya.ts';
import { bultenGunleri, bultenSayisi, istanbulGunu } from './gunler.ts';
import { ceyrek, ceyrekOzeti, gunCeyregi, turAnahtari, veriliCeyrekler, type RaporAday } from './rapor.ts';
import type { ArsivKaydi } from './arsiv/tipler.ts';

const govde = Array.from({ length: EN_AZ_KELIME }, (_, i) => `kelime${i}`).join(' ');
let saat = 0;
const h = (id: string, data: Partial<RaporAday['data']> = {}, body = govde): RaporAday => ({
  id,
  body,
  data: { title: id, description: '', category: 'yatirimlar', date: new Date(Date.UTC(2026, 9, 14, 6 + saat++)), ...data },
});
const konu = (slug: string) => KONULAR.find((k) => k.slug === slug)!;

test('Türkçe adres parçası', () => {
  assert.equal(slugTr('OYLİO'), 'oylio');
  assert.equal(slugTr('Şırnak Çay Ürünleri'), 'sirnak-cay-urunleri');
});

test('konu eşleşmeleri: tur alanı, başlık ve kelime sınırı', () => {
  assert.ok(konu('tohum-yatirim').eslesir(h('a', { tur: 'Tohum öncesi' })));
  assert.ok(!konu('tohum-yatirim').eslesir(h('b', { tur: 'Seri A' })));
  assert.ok(konu('seri-a').eslesir(h('c', { tur: 'Pre-Seri A' })));
  assert.ok(!konu('seri-a').eslesir(h('d', { title: 'Seri AB turu' })));
  // SPK kısaltması kelime içinde eşleşmez, ekli hâli eşleşir.
  assert.ok(konu('spk').eslesir(h('e', { description: "SPK'nın yeni kararı" })));
  assert.ok(!konu('spk').eslesir(h('f', { description: 'XSPKY şirketi' })));
  assert.ok(konu('melek-yatirim').eslesir(h('g', { yatirimcilar: 'melek yatırımcılar' })));
  assert.ok(konu('kitle-fonlamasi').eslesir(h('h', { platform: 'Örnek Platform' })));
  assert.deepEqual(
    haberKonulari(h('i', { title: 'İstanbul merkezli girişim tohum turunda yatırım aldı' })).map((k) => k.slug),
    ['tohum-yatirim', 'turkiye-girisim-ekosistemi'],
  );
});

test('konu sayfası en az EN_AZ_HABER listelenen haberle üretilir; bülten ve kısa haber sayılmaz', () => {
  const tohum = Array.from({ length: EN_AZ_HABER - 1 }, (_, i) => h(`t${i}`, { tur: 'Tohum' }));
  const bulten = h('bulten', { tur: 'Tohum', category: 'gunluk-bulten' });
  const kisa = h('kisa', { tur: 'Tohum' }, 'kısa');
  assert.equal(yayimlananKonular([...tohum, bulten, kisa]).find((x) => x.konu.slug === 'tohum-yatirim'), undefined);
  const tam = yayimlananKonular([...tohum, h('son', { tur: 'Tohum' })]).find((x) => x.konu.slug === 'tohum-yatirim');
  assert.equal(tam?.haberler.length, EN_AZ_HABER);
  assert.equal(tam?.haberler[0].id, 'son');
});

test('platformlar: bültenin platformları ve künyedeki adlar; eşleşme ve sayfa kuralı', () => {
  const liste = platformlar(['Örnek Fon', 'fonangels']);
  assert.ok(liste.some((p) => p.slug === 'fonangels'));
  assert.equal(liste.filter((p) => p.slug === 'fonangels').length, 1);
  const ornek = liste.find((p) => p.slug === 'ornek-fon')!;
  const hs = [h('x', { platform: 'Örnek Fon' }), h('y', { description: 'Örnek Fon üzerinde kampanya' }), h('z', { description: 'Örnek Fonları' })];
  assert.deepEqual(platformHaberleri(ornek, hs).map((x) => x.id).sort(), ['x', 'y']);
  assert.deepEqual(platformSayfasi(0, 0), { uret: false, indeks: false });
  assert.deepEqual(platformSayfasi(1, 2), { uret: true, indeks: false });
  assert.deepEqual(platformSayfasi(EN_AZ_HABER, 0), { uret: true, indeks: true });
});

const kayit = (tarih: string, sayi: number, girisimler: Partial<ArsivKaydi['girisimler'][number]>[]): ArsivKaydi => ({
  tarih,
  sayi,
  baslangic: false,
  platformlar: [],
  girisimler: girisimler.map((g) => ({ ad: 'A', platform: 'p1', bugun: 0, alinan: 0, kalan: null, hedef: 100, degerleme: 1000, yuzde: 0, durum: 'son 5 gün', veriAlinamadi: false, birikmis: false, ...g })),
});

test('kampanyalar kayıtlardan birleşir; son kayıt künyeyi verir; aynı ad farklı platformda ayrılır', () => {
  const kps = kampanyalar([
    kayit('2026-10-14', 1528, [{ ad: 'OYLİO', alinan: 50, yuzde: 50 }, { ad: 'Çift', platform: 'p1' }]),
    kayit('2026-10-13', 1527, [{ ad: 'OYLİO', alinan: 40, yuzde: 40 }]),
    kayit('2026-10-15', 1529, [{ ad: 'Çift', platform: 'p2', alinan: 120, yuzde: 120 }]),
  ]);
  const oylio = kps.find((k) => k.ad === 'OYLİO')!;
  assert.equal(oylio.slug, 'oylio');
  assert.equal(oylio.ilkTarih, '2026-10-13');
  assert.equal(oylio.sonTarih, '2026-10-14');
  assert.equal(oylio.son.alinan, 50);
  assert.deepEqual(oylio.gunler.map((g) => g.tarih), ['2026-10-13', '2026-10-14']);
  assert.deepEqual(kps.filter((k) => k.ad === 'Çift').map((k) => k.slug).sort(), ['cift-p1', 'cift-p2']);
  assert.equal(kps[0].sonTarih, '2026-10-15');
  assert.ok(girisimEslesir(oylio, 'Oylio'));
});

test('bülten günleri: sayı, İstanbul günü, indeks kuralı', () => {
  assert.equal(bultenSayisi('2022-08-10'), 1);
  assert.equal(bultenSayisi('2026-10-15'), 1528);
  // 21:30 UTC İstanbul'da ertesi gündür.
  assert.equal(istanbulGunu(new Date('2026-10-14T21:30:00Z')), '2026-10-15');
  const gun = (d: string) => new Date(`${d}T09:00:00Z`);
  const gunler = bultenGunleri(
    [
      h('b1', { category: 'gunluk-bulten', date: gun('2026-10-12') }),
      h('n1', { date: gun('2026-10-12') }),
      h('n2', { date: new Date('2026-10-12T10:00:00Z') }),
      h('n3', { date: gun('2026-10-11') }),
      h('m1', { date: gun('2026-10-10') }),
      h('m2', { date: gun('2026-10-10') }),
      h('m3', { date: gun('2026-10-10') }),
    ],
    [kayit('2026-10-13', 1527, [{}])],
  );
  assert.deepEqual(gunler.map((g) => [g.tarih, g.indeks]), [['2026-10-13', true], ['2026-10-12', false], ['2026-10-10', true]]);
  assert.equal(gunler[0].sayi, 1527);
  assert.deepEqual(gunler[1].haberler.map((x) => x.id), ['n2', 'n1']);
});

test('çeyrek raporu yalnız veriden sayar ve çeyrek bitmeden yayımlanmaz', () => {
  const c = ceyrek(2026, 3);
  assert.equal(c.bas, '2026-07-01');
  assert.equal(c.son, '2026-09-30');
  assert.equal(gunCeyregi('2026-10-15').slug, '2026-c4');
  assert.equal(turAnahtari('Tohum  Öncesi'), turAnahtari('tohum öncesi'));
  const d = (g: string) => new Date(`${g}T09:00:00Z`);
  const hs = [
    h('r1', { date: d('2026-08-01'), toplanan: 100, paraBirimi: 'USD', tur: 'Tohum' }),
    h('r2', { date: d('2026-08-02'), toplanan: 300, paraBirimi: 'USD', tur: 'tohum' }),
    h('r3', { date: d('2026-08-03'), toplanan: 50, paraBirimi: 'TRY' }),
    h('r4', { date: d('2026-10-03'), toplanan: 999, paraBirimi: 'USD' }),
  ];
  const o = ceyrekOzeti(hs, [kayit('2026-09-01', 1, [{ alinan: 150, yuzde: 150 }, { ad: 'B', alinan: 10, yuzde: 10 }])], c, '2026-10-15');
  assert.equal(o.haberSayisi, 3);
  assert.deepEqual(o.tutarlar, [{ paraBirimi: 'USD', adet: 2, toplam: 400 }, { paraBirimi: 'TRY', adet: 1, toplam: 50 }]);
  assert.deepEqual(o.turlar, [{ tur: 'Tohum', adet: 2 }]);
  assert.equal(o.enBuyukler[0].id, 'r2');
  assert.deepEqual(o.kampanya, { kayitGunu: 1, kampanyaSayisi: 2, hedefeUlasan: 1, platformlar: [{ platform: 'p1', kampanya: 2, toplam: 160 }] });
  assert.equal(o.tamamlandi, true);
  assert.equal(o.yayimlanir, false); // haber sayısı eşiğin altında
  assert.equal(ceyrekOzeti(hs, [], ceyrek(2026, 4), '2026-10-15').tamamlandi, false);
  assert.deepEqual(veriliCeyrekler(['2026-10-15', '2026-08-01', '2026-10-01']).map((x) => x.slug), ['2026-c4', '2026-c3']);
});
