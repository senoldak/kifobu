import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dilimle, ozetHesapla, kampanyaTablosu, kampanyaSerileri, takvimAyi, csvUret } from './hesap.ts';
import type { ArsivKaydi, ArsivGirisim } from './tipler.ts';

function gir(ad: string, platform: string, bugun: number | null, ek: Partial<ArsivGirisim> = {}): ArsivGirisim {
  return {
    ad, platform, bugun, alinan: 1_000_000, kalan: 4_000_000, hedef: 5_000_000, degerleme: 50_000_000,
    yuzde: 20, durum: 'Aktif', veriAlinamadi: false, birikmis: false, ...ek,
  };
}

function kayit(tarih: string, girisimler: ArsivGirisim[], baslangic = false): ArsivKaydi {
  const gruplar = new Map<string, number>();
  for (const g of girisimler) gruplar.set(g.platform, (gruplar.get(g.platform) ?? 0) + (g.bugun ?? 0));
  return {
    tarih, sayi: girisimler.length, baslangic, girisimler,
    platformlar: [...gruplar].map(([anahtar, bugun]) => ({ anahtar, ad: anahtar, renk: '#123456', bugun, toplam: 0 })),
  };
}

const ORNEK_DIZIN = new URL('./ornek/', import.meta.url);
function ornek(): ArsivKaydi[] {
  return readdirSync(ORNEK_DIZIN).filter((d) => d.endsWith('.json')).sort()
    .map((d) => JSON.parse(readFileSync(new URL(d, ORNEK_DIZIN), 'utf8')) as ArsivKaydi);
}

const BASLIK = 'tarih,sayi,girisim,platform,gunluk_giris,toplam,hedef,yuzde,durum,veri_alinamadi,birikmis,baslangic';

test('boş arşiv', () => {
  for (const d of ['gun', 'hafta', 'ay'] as const) {
    assert.deepEqual(dilimle([], d), []);
    assert.equal(ozetHesapla([], d).donemToplami, null);
    assert.deepEqual(kampanyaTablosu([], d), []);
  }
  const o = ozetHesapla([], 'gun');
  assert.equal(o.degisimYuzde, null);
  assert.equal(o.gunlukOrtalama, null);
  assert.deepEqual(o.platformPaylari, []);
  assert.deepEqual(kampanyaSerileri([]), []);
  assert.equal(takvimAyi([], 2026, 10, '2026-10-13').length, 31);
  assert.equal(csvUret([]), `﻿${BASLIK}\n`);
});

test('başlangıç günü toplama girmez', () => {
  const d = dilimle([kayit('2026-10-13', [gir('A', 'x', null)], true)], 'gun');
  assert.equal(d[0].toplam, null);
});

test('ISO hafta Pazartesi başlar', () => {
  const d = dilimle([
    kayit('2026-10-16', [gir('A', 'x', 10)]),
    kayit('2026-10-18', [gir('A', 'x', 20)]),
    kayit('2026-10-19', [gir('A', 'x', 30)]),
  ], 'hafta');
  assert.equal(d.length, 2);
  assert.equal(d[0].toplam, 30);
  assert.equal(d[1].toplam, 30);
  assert.equal(d[0].son, '2026-10-18');
});

test('etiketler', () => {
  const k = [kayit('2026-10-13', [gir('A', 'x', 1)]), kayit('2026-10-16', [gir('A', 'x', 1)])];
  assert.equal(dilimle(k, 'hafta')[0].etiket, '12–16 Eki');
  assert.equal(dilimle(k, 'gun')[0].etiket, '13.10');
  assert.equal(dilimle(k, 'ay')[0].etiket, 'Ekim 2026');
});

test('değişim yüzdesi', () => {
  const o = ozetHesapla([
    kayit('2026-10-14', [gir('A', 'x', 100_000)]),
    kayit('2026-10-15', [gir('A', 'x', 150_000)]),
  ], 'gun');
  assert.equal(o.degisimYuzde, 50);
  assert.equal(o.donemToplami, 150_000);
});

test('önceki dilim yoksa değişim null', () => {
  const o = ozetHesapla([kayit('2026-10-14', [gir('A', 'x', 100_000)])], 'gun');
  assert.equal(o.degisimYuzde, null);
  assert.equal(o.gunlukOrtalama, 100_000);
});

test('günlük ortalama ve aktif/sona eren', () => {
  const sona = { durum: 'SONA ERDİ' };
  const o = ozetHesapla([
    kayit('2026-10-14', [gir('A', 'x', 100_000), gir('B', 'x', 0, sona)]),
    kayit('2026-10-15', [gir('A', 'x', 100_000), gir('B', 'x', 0, sona)]),
    kayit('2026-10-16', [gir('A', 'x', 300_000), gir('B', 'x', 0, sona)]),
  ], 'hafta');
  assert.equal(o.donemToplami, 500_000);
  assert.equal(o.gunlukOrtalama, 500_000 / 3);
  assert.equal(o.aktifKampanya, 1);
  assert.equal(o.sonaEren, 1);
});

test('platform payı dönem girişinden', () => {
  const o = ozetHesapla([
    kayit('2026-10-14', [gir('A', 'fonangels', 500), gir('B', 'ecofolio', 500)]),
    kayit('2026-10-15', [gir('A', 'fonangels', 90_000), gir('B', 'ecofolio', 10_000)]),
  ], 'gun');
  assert.deepEqual(o.platformPaylari.map((p) => [p.anahtar, p.pay]), [['fonangels', 0.9], ['ecofolio', 0.1]]);
  assert.equal(o.platformPaylari[0].renk, '#123456');
});

test('toplam 0 ise pay boş', () => {
  const o = ozetHesapla([kayit('2026-10-14', [gir('A', 'x', 0)])], 'gun');
  assert.deepEqual(o.platformPaylari, []);
});

test('tabloda null girişler sonda', () => {
  const t = kampanyaTablosu([
    kayit('2026-10-14', [gir('N', 'x', null, { alinan: 9_000_000 }), gir('K', 'x', 10), gir('B', 'x', 500, { alinan: 2 })]),
  ], 'gun');
  assert.deepEqual(t.map((s) => s.ad), ['B', 'K', 'N']);
  assert.equal(t[2].donemGirisi, null);
});

test('tabloda eşitlikte toplam azalan', () => {
  const t = kampanyaTablosu([
    kayit('2026-10-14', [gir('A', 'x', null, { alinan: 5 }), gir('B', 'x', null, { alinan: 9 })]),
  ], 'gun');
  assert.deepEqual(t.map((s) => s.ad), ['B', 'A']);
});

test('listeden çıkan kampanya serisi biter', () => {
  const s = kampanyaSerileri([
    kayit('2026-10-14', [gir('A', 'x', 1), gir('B', 'x', 1)]),
    kayit('2026-10-15', [gir('A', 'x', 1), gir('B', 'x', 1)]),
    kayit('2026-10-16', [gir('A', 'x', 1)]),
  ]);
  const a = s.find((x) => x.ad === 'A')!;
  const b = s.find((x) => x.ad === 'B')!;
  assert.equal(a.noktalar.length, 3);
  assert.equal(b.noktalar.length, 2);
  assert.equal(b.noktalar[1].tarih, '2026-10-15');
  assert.equal(b.renk, '#123456');
  assert.equal(b.hedef, 5_000_000);
});

test('takvim türleri', () => {
  const k = ornek();
  const gun = takvimAyi(k, 2026, 10, '2026-11-06');
  const tur = (t: string) => gun.find((g) => g.tarih === t)!.tur;
  assert.equal(gun.length, 31);
  assert.equal(tur('2026-10-17'), 'kapanis-yok'); // Cumartesi
  assert.equal(tur('2026-10-13'), 'baslangic');
  assert.equal(tur('2026-10-21'), 'kapanis-yok'); // atlanan iş günü
  assert.equal(tur('2026-10-22'), 'eksik');
  assert.notEqual(gun.find((g) => g.tarih === '2026-10-22')!.toplam, null);
  assert.equal(tur('2026-10-23'), 'veri');
  assert.equal(tur('2026-10-31'), 'kapanis-yok'); // geçmiş hafta sonu
  const kasim = takvimAyi(k, 2026, 11, '2026-11-06');
  assert.equal(kasim.find((g) => g.tarih === '2026-11-06')!.tur, 'veri');
  assert.equal(kasim.find((g) => g.tarih === '2026-11-07')!.tur, 'gelecek');
  assert.equal(kasim.find((g) => g.tarih === '2026-11-09')!.tur, 'gelecek');
});

test('seri öncesi günler kapanis-yok sayılmaz', () => {
  const gun = takvimAyi(ornek(), 2026, 10, '2026-11-06');
  assert.equal(gun.find((g) => g.tarih === '2026-10-01')!.tur, 'seri-oncesi');
  assert.equal(gun.find((g) => g.tarih === '2026-10-10')!.tur, 'seri-oncesi'); // hafta sonu da
  assert.equal(gun.find((g) => g.tarih === '2026-10-12')!.tur, 'seri-oncesi');
  assert.equal(gun.find((g) => g.tarih === '2026-10-13')!.tur, 'baslangic');
});

test('ortadan eklenen kampanyanın serisi ilk görüldüğü günde başlar', () => {
  const n = kampanyaSerileri(ornek()).find((s) => s.ad === 'NARPOS')!;
  assert.equal(n.noktalar[0].tarih, '2026-10-27');
  assert.ok(n.noktalar.every((p) => p.tarih >= '2026-10-27'));
});

test('örnek veri kuralları', () => {
  const k = ornek();
  assert.ok(k.length >= 15 && k.length <= 18);
  assert.equal(k[0].baslangic, true);
  assert.ok(k.slice(1).every((x) => !x.baslangic));
  assert.ok(k.every((x) => ![0, 6].includes(new Date(`${x.tarih}T00:00:00Z`).getUTCDay())));
  assert.ok(k.some((x) => x.girisimler.some((g) => g.veriAlinamadi)));
  assert.ok(k.some((x) => x.girisimler.some((g) => g.birikmis)));
  assert.ok(new Set(k.map((x) => x.girisimler.length)).size > 1);
  const son = k[k.length - 1];
  assert.ok(son.girisimler.filter((g) => g.durum !== 'SONA ERDİ').every((g) => (g.bugun ?? 0) > 0));
});

test('csv null alanları boş', () => {
  const csv = csvUret([
    kayit('2026-10-15', [gir('B', 'x', 5), gir('A', 'x', null, { veriAlinamadi: true })]),
    kayit('2026-10-14', [gir('A', 'x', 7)]),
  ]);
  const satirlar = csv.split('\n');
  assert.equal(satirlar[0], `﻿${BASLIK}`);
  assert.equal(satirlar[1], '2026-10-14,1,A,x,7,1000000,5000000,20,Aktif,false,false,false');
  assert.equal(satirlar[2], '2026-10-15,2,A,x,,1000000,5000000,20,Aktif,true,false,false');
  assert.equal(satirlar[3].split(',')[2], 'B');
  assert.equal(satirlar[4], '');
});

test('csv virgül içeren alanı tırnaklar', () => {
  const csv = csvUret([kayit('2026-10-14', [gir('A, B', 'x', 1)])]);
  assert.ok(csv.includes('"A, B"'));
});

test('payı 0 olan platform listelenmez', () => {
  const o = ozetHesapla([
    kayit('2026-10-15', [gir('A', 'fonangels', 90_000), gir('B', 'ecofolio', 0), gir('C', 'x', null)]),
  ], 'gun');
  assert.deepEqual(o.platformPaylari.map((p) => [p.anahtar, p.pay]), [['fonangels', 1]]);
});

test('dönem sürüyor bayrağı', () => {
  const hafta = [kayit('2026-10-13', [gir('A', 'x', 1)]), kayit('2026-10-15', [gir('A', 'x', 1)])];
  assert.equal(ozetHesapla(hafta, 'hafta').donemSuruyor, true); // Perşembe: hafta bitmedi
  assert.equal(ozetHesapla([...hafta, kayit('2026-10-17', [gir('A', 'x', 1)])], 'hafta').donemSuruyor, true); // Cumartesi: Pazar kaldı
  assert.equal(ozetHesapla([...hafta, kayit('2026-10-18', [gir('A', 'x', 1)])], 'hafta').donemSuruyor, false);
  assert.equal(ozetHesapla(hafta, 'ay').donemSuruyor, true);
  // Kapanış her gün: Ekim, son günü 31 Ekim'de biter.
  assert.equal(ozetHesapla([kayit('2026-10-30', [gir('A', 'x', 1)])], 'ay').donemSuruyor, true);
  assert.equal(ozetHesapla([kayit('2026-10-31', [gir('A', 'x', 1)])], 'ay').donemSuruyor, false);
  assert.equal(ozetHesapla(hafta, 'gun').donemSuruyor, false);
  assert.equal(ozetHesapla([], 'hafta').donemSuruyor, false);
});

test('tabloda dönem içindeki eksik gün işaretlenir, toplam korunur', () => {
  const k = [
    kayit('2026-10-13', [gir('A', 'x', 100), gir('B', 'x', 50)]),
    kayit('2026-10-14', [gir('A', 'x', null, { veriAlinamadi: true }), gir('B', 'x', 70)]),
    kayit('2026-10-15', [gir('A', 'x', null, { veriAlinamadi: true }), gir('B', 'x', 30)]),
  ];
  const h = kampanyaTablosu(k, 'hafta');
  const a = h.find((s) => s.ad === 'A')!;
  assert.equal(a.donemGirisi, 100);
  assert.equal(a.donemdeEksik, true);
  assert.equal(h.find((s) => s.ad === 'B')!.donemdeEksik, false);
  const g = kampanyaTablosu(k, 'gun').find((s) => s.ad === 'A')!;
  assert.equal(g.donemGirisi, null);
  assert.equal(g.donemdeEksik, true);
});
