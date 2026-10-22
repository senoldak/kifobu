import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ceyrek, ceyrekAylari, ceyrekOzeti, gunCeyregi, kaynakNotu, raporCsv, turGrubu, type CeyrekOzeti, type RaporAday } from './rapor.ts';

const ornek = (): CeyrekOzeti => ({
  ceyrek: ceyrek(2026, 4),
  tamamlandi: true,
  yayimlanir: true,
  haberSayisi: 64,
  bolumler: [{ category: 'yatirimlar', adet: 30 }, { category: 'girisimler', adet: 34 }],
  yatirimHaberi: 12,
  tutarDisi: 0,
  tutarlar: [{ paraBirimi: 'USD', adet: 8, toplam: 41_500_000 }],
  turlar: [{ tur: 'Seri A, uzatma', adet: 2 }],
  enBuyukler: [],
  kampanya: { kayitGunu: 92, kampanyaSayisi: 40, hedefeUlasan: 18, platformlar: [{ platform: 'Örnek', kampanya: 5, toplam: 12_000_000 }] },
});

test('çeyrek sınırları ve ay aralığı', () => {
  const c = ceyrek(2026, 4);
  assert.equal(c.slug, '2026-c4');
  assert.equal(c.bas, '2026-10-01');
  assert.equal(c.son, '2026-12-31');
  assert.equal(ceyrekAylari(c), 'Ekim–Aralık 2026');
  assert.equal(gunCeyregi('2026-02-28').slug, '2026-c1');
});

test('kaynak notu raporun adını ve adresini taşır', () => {
  assert.equal(kaynakNotu(ceyrek(2026, 4), 'https://kifobu.com/rapor/2026-c4/'), 'Kaynak: kifobu, 2026 4. çeyrek (Ekim–Aralık) raporu, https://kifobu.com/rapor/2026-c4/');
});

test('CSV: kaynak satırı, başlık ve her tablonun satırları; virgüllü alan tırnaklanır', () => {
  const csv = raporCsv(ornek(), 'https://kifobu.com/rapor/2026-c4/').trim().split('\n');
  assert.match(csv[0], /^# Kaynak: kifobu/);
  assert.equal(csv[1], 'tablo,anahtar,adet,toplam,para_birimi');
  assert.ok(csv.includes('ozet,haber,64,,'));
  assert.ok(csv.includes('bolum,girisimler,34,,'));
  assert.ok(csv.includes('yatirim_tutari,USD,8,41500000,USD'));
  assert.ok(csv.includes('tur,"Seri A, uzatma",2,,'));
  assert.ok(csv.includes('platform,Örnek,5,12000000,TRY'));
});

test('tur grupları: eş anlamlılar birleşir; fon kapanışı ve halka arz girişim turu değildir', () => {
  for (const t of ['Ön Tohum', 'pre-Tohum', 'Tohum öncesi', 'Tohum  Öncesi']) assert.deepEqual(turGrubu(t), { ad: 'Tohum öncesi', girisimTuru: true });
  assert.deepEqual(turGrubu('seri a'), { ad: 'Seri A', girisimTuru: true });
  for (const t of ['Fon Kapanışı', 'Fon Kapama', 'Ilk Fon', 'Üçüncü Fon', 'Büyüme Fonu', 'Erken Aşama Fonu']) assert.equal(turGrubu(t).ad, 'Fon kapanışı', t);
  assert.deepEqual(turGrubu('Halka Arz'), { ad: 'Halka arz', girisimTuru: false });
  assert.deepEqual(turGrubu('Büyüme Finansmanı'), { ad: 'Büyüme Finansmanı', girisimTuru: true });
  assert.equal(turGrubu('Kitle fonlama').girisimTuru, true);
});

test('özet: fon kapanışı ve halka arz tutar toplamına ve en büyüklere girmez; tek haberlik turlar "Diğer"de', () => {
  let n = 0;
  const h = (tur: string, toplanan: number, paraBirimi = 'USD'): RaporAday =>
    ({ id: `h${++n}`, body: 'Haber metni. '.repeat(200), data: { title: `H${n}`, category: 'yatirimlar', date: new Date('2026-11-10T09:00:00Z'), tur, toplanan, paraBirimi } }) as unknown as RaporAday;
  const o = ceyrekOzeti(
    [h('Tohum', 1_000_000), h('Ön Tohum', 500_000), h('pre-Tohum', 300_000), h('Halka Arz', 3_200_000_000), h('Üçüncü Fon', 50_000_000), h('Seri D', 90_000_000), h('Stratejik Yatırım', 2_000_000)],
    [],
    ceyrek(2026, 4),
    '2027-01-02',
  );
  assert.equal(o.yatirimHaberi, 7);
  assert.equal(o.tutarDisi, 2);
  assert.deepEqual(o.tutarlar, [{ paraBirimi: 'USD', adet: 5, toplam: 93_800_000 }]);
  assert.ok(!o.enBuyukler.some((e) => e.toplanan >= 50_000_000 && e.toplanan !== 90_000_000));
  assert.deepEqual(o.turlar, [{ tur: 'Tohum öncesi', adet: 2 }, { tur: 'Diğer', adet: 5 }]);
});
