import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arsivKaydiOlustur, atlananGun } from './kayit.ts';
import type { TaramaSonucu } from './kayit.ts';
import type { ArsivKaydi } from './tipler.ts';

const AYARLAR = {
  fonangels: { ad: 'fonangels', renk: '#f47b3d' },
  ecofolio: { ad: 'ecofolio', renk: '#009bae' },
};

function tarama(ek: Partial<TaramaSonucu> = {}): TaramaSonucu {
  return {
    ad: 'OYLİO', platform: 'fonangels', toplanan: 2_532_200, durum: 'Aktif',
    hata: false, hedef: 5_000_000, degerleme: 50_000_000, ...ek,
  };
}

function onceki(tarih: string, veriAlinamadi = false, alinan = 2_000_000): ArsivKaydi {
  return {
    tarih, sayi: 1, baslangic: false, platformlar: [],
    girisimler: [{
      ad: 'OYLİO', platform: 'fonangels', bugun: null, alinan, kalan: 5_000_000 - alinan,
      hedef: 5_000_000, degerleme: 50_000_000, yuzde: 40, durum: 'Aktif', veriAlinamadi, birikmis: false,
    }],
  };
}

function olustur(taramalar: TaramaSonucu[], oncekiKayit: ArsivKaydi | null, referans: Record<string, number>, tarih = '2026-10-14') {
  return arsivKaydiOlustur({ tarih, sayi: 1, taramalar, referans, oncekiKayit, platformAyarlari: AYARLAR });
}

test('ilk kayıt başlangıç günüdür', () => {
  const k = olustur([tarama(), tarama({ ad: 'B', toplanan: 10 })], null, {});
  assert.equal(k.baslangic, true);
  assert.ok(k.girisimler.every((g) => g.bugun === null));
});

test('normal gün farkı yazar', () => {
  const k = olustur([tarama()], onceki('2026-10-13'), { OYLİO: 2_000_000 });
  const g = k.girisimler[0];
  assert.equal(k.baslangic, false);
  assert.equal(g.bugun, 532_200);
  assert.equal(g.veriAlinamadi, false);
  assert.equal(g.birikmis, false);
});

test('hata dünkü toplamı korur', () => {
  const k = olustur([tarama({ hata: true, toplanan: 0 })], onceki('2026-10-13'), { OYLİO: 2_000_000 });
  const g = k.girisimler[0];
  assert.equal(g.alinan, 2_000_000);
  assert.equal(g.bugun, null);
  assert.equal(g.veriAlinamadi, true);
});

test('sessiz sıfır veri alınamadıdır', () => {
  const k = olustur([tarama({ toplanan: 0 })], onceki('2026-10-13', false, 354_200), { OYLİO: 354_200 });
  const g = k.girisimler[0];
  assert.equal(g.veriAlinamadi, true);
  assert.equal(g.alinan, 354_200);
});

test('düşen toplam veri alınamadıdır', () => {
  const k = olustur([tarama({ toplanan: 20_000 })], onceki('2026-10-13', false, 24_282), { OYLİO: 24_282 });
  assert.equal(k.girisimler[0].veriAlinamadi, true);
  assert.equal(k.girisimler[0].alinan, 24_282);
});

test('önceki kayıt yoksa referans taban olur', () => {
  // Önceki kayıtta kampanya yok: referansa düşülür.
  const k = olustur([tarama({ ad: 'B', toplanan: 1_500 })], onceki('2026-10-13'), { B: 1_000 });
  assert.equal(k.girisimler[0].bugun, 500);
  const d = olustur([tarama({ ad: 'B', toplanan: 900 })], onceki('2026-10-13'), { B: 1_000 });
  assert.equal(d.girisimler[0].veriAlinamadi, true);
  assert.equal(d.girisimler[0].alinan, 1_000);
});

test('sessiz sıfır sonrası bozuk referans tüm toplamı tek güne yazmaz', () => {
  const x = olustur(
    [tarama({ toplanan: 0 })], onceki('2026-10-13', false, 2_500_000), { OYLİO: 2_500_000 }, '2026-10-14',
  );
  assert.equal(x.girisimler[0].veriAlinamadi, true);
  assert.equal(x.girisimler[0].alinan, 2_500_000);
  // Bot sıfırı ertesi günün referansı olarak kaydetti.
  const y = olustur([tarama({ toplanan: 2_520_000 })], x, { OYLİO: 0 }, '2026-10-15');
  const g = y.girisimler[0];
  assert.equal(g.veriAlinamadi, false);
  assert.equal(g.bugun, 20_000);
  assert.equal(g.birikmis, true);
});

test('aynı gün yeniden çalıştırma dünkü kayda göre hesaplar', () => {
  // Referans bugünün toplamını tutuyor; taban dünkü kayıttır.
  const k = olustur([tarama({ toplanan: 2_532_200 })], onceki('2026-10-13'), { OYLİO: 2_532_200 });
  assert.equal(k.girisimler[0].bugun, 532_200);
  assert.equal(k.girisimler[0].veriAlinamadi, false);
});

test('düşüş sonrası bozuk referans girişi abartmaz', () => {
  const k = olustur([tarama({ toplanan: 24_500 })], onceki('2026-10-13', false, 24_282), { OYLİO: 20_000 });
  assert.equal(k.girisimler[0].veriAlinamadi, false);
  assert.equal(k.girisimler[0].bugun, 218);
});

test('hedef 0 ise yüzde 0 ve kalan null', () => {
  const k = olustur([tarama({ hedef: 0 })], onceki('2026-10-13'), { OYLİO: 2_000_000 });
  const g = k.girisimler[0];
  assert.equal(g.yuzde, 0);
  assert.equal(g.kalan, null);
  assert.ok(JSON.stringify(k).includes('"yuzde":0'));
});

test('hata sonrası gün birikmiştir', () => {
  const k = olustur([tarama()], onceki('2026-10-13', true), { OYLİO: 2_000_000 });
  assert.equal(k.girisimler[0].birikmis, true);
});

test('ardışık gün birikmiş değildir', () => {
  assert.equal(atlananGun('2026-10-18', '2026-10-19'), 0);
  const k = olustur([tarama()], onceki('2026-10-18'), { OYLİO: 2_000_000 }, '2026-10-19');
  assert.equal(k.girisimler[0].birikmis, false);
});

test('kaçırılan hafta sonu günü birikmiştir', () => {
  assert.equal(atlananGun('2026-10-16', '2026-10-18'), 1); // Cumartesi kaçtı
  const k = olustur([tarama()], onceki('2026-10-16'), { OYLİO: 2_000_000 }, '2026-10-18');
  assert.equal(k.girisimler[0].birikmis, true);
});

test('atlanmış gün birikmiştir', () => {
  assert.equal(atlananGun('2026-10-14', '2026-10-16'), 1);
  const k = olustur([tarama()], onceki('2026-10-14'), { OYLİO: 2_000_000 }, '2026-10-16');
  assert.equal(k.girisimler[0].birikmis, true);
});

test('yeni kampanyanın ilk günü null', () => {
  const k = olustur([tarama({ ad: 'YENİ' })], onceki('2026-10-13'), { OYLİO: 2_000_000 });
  const g = k.girisimler[0];
  assert.equal(g.bugun, null);
  assert.equal(g.veriAlinamadi, false);
});

test('fonlanan kampanyada kalan null', () => {
  const k = olustur([tarama({ tamamlandi: true })], onceki('2026-10-13'), { OYLİO: 2_000_000 });
  assert.equal(k.girisimler[0].kalan, null);
});

test('platform toplamları', () => {
  const k = olustur(
    [
      tarama({ ad: 'A', toplanan: 1_100 }),
      tarama({ ad: 'B', toplanan: 2_300 }),
      tarama({ ad: 'C', platform: 'ecofolio', toplanan: 500 }),
    ],
    onceki('2026-10-13'),
    { A: 1_000, B: 2_000, C: 400 },
  );
  const fa = k.platformlar.find((p) => p.anahtar === 'fonangels');
  const eco = k.platformlar.find((p) => p.anahtar === 'ecofolio');
  assert.deepEqual(fa, { anahtar: 'fonangels', ad: 'fonangels', renk: '#f47b3d', bugun: 400, toplam: 3_400 });
  assert.deepEqual(eco, { anahtar: 'ecofolio', ad: 'ecofolio', renk: '#009bae', bugun: 100, toplam: 500 });
});
