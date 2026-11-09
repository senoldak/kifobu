import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  vergiIstisnasiHesapla,
  vergiDilimiBul,
  YILLIK_AZAMI_TAVAN
} from './vergi-istisnasi.ts';

test('vergiDilimiBul: matrah büyüklüğüne göre doğru marjinal dilimi verir', () => {
  assert.equal(vergiDilimiBul(100_000), 0.15);
  assert.equal(vergiDilimiBul(200_000), 0.20);
  assert.equal(vergiDilimiBul(500_000), 0.27);
  assert.equal(vergiDilimiBul(2_000_000), 0.35);
  assert.equal(vergiDilimiBul(5_000_000), 0.40);
});

test('vergiIstisnasiHesapla: standart projede %75 indirim oranı uygular', () => {
  // Yıllık gelir: 2.000.000 TL, Yatırım: 100.000 TL, Standart (%75)
  // Gelir tavanı: 2.000.000 * 0.10 = 200.000 TL
  // Ham indirim: 100.000 * 0.75 = 75.000 TL (tavanın altında, geçerli)
  // Marjinal dilim: 0.35 (veya manuel)
  const res = vergiIstisnasiHesapla({
    yatirimTutari: 100_000,
    yillikBeyanGeliri: 2_000_000,
    projeTuru: 'standart',
    vergiDilimi: 0.35
  });

  assert.equal(res.uygulananOran, 0.75);
  assert.equal(res.hamIndirimTutari, 75_000);
  assert.equal(res.uygulanabilirMatrahIndirimi, 75_000);
  assert.equal(res.tavanAsildiMi, false);
  assert.equal(res.netVergiAvantaji, 26_250); // 75.000 * 0.35
  assert.equal(res.netYatirimMaliyeti, 73_750); // 100.000 - 26.250
  assert.equal(res.efektifDestekOrani, 26.25);
});

test('vergiIstisnasiHesapla: Ar-Ge ve Sanayi Bakanlığı onaylı projede %100 indirim uygular', () => {
  const res = vergiIstisnasiHesapla({
    yatirimTutari: 100_000,
    yillikBeyanGeliri: 2_000_000,
    projeTuru: 'arge',
    vergiDilimi: 0.40
  });

  assert.equal(res.uygulananOran, 1.0);
  assert.equal(res.hamIndirimTutari, 100_000);
  assert.equal(res.uygulanabilirMatrahIndirimi, 100_000);
  assert.equal(res.netVergiAvantaji, 40_000); // 100.000 * 0.40
  assert.equal(res.netYatirimMaliyeti, 60_000);
  assert.equal(res.efektifDestekOrani, 40);
});

test('vergiIstisnasiHesapla: beyan edilen gelirin %10 tavanı aşıldığında matrahı sınırlar', () => {
  // Yıllık gelir: 1.000.000 TL -> %10 tavanı 100.000 TL
  // Yatırım: 200.000 TL, Ar-Ge (%100) -> Ham indirim 200.000 TL
  // Uygulanabilir indirim 100.000 TL ile sınırlandırılmalı
  const res = vergiIstisnasiHesapla({
    yatirimTutari: 200_000,
    yillikBeyanGeliri: 1_000_000,
    projeTuru: 'arge',
    vergiDilimi: 0.35
  });

  assert.equal(res.hamIndirimTutari, 200_000);
  assert.equal(res.gelirTavanSiniri, 100_000);
  assert.equal(res.uygulanabilirMatrahIndirimi, 100_000);
  assert.equal(res.tavanAsildiMi, true);
  assert.equal(res.netVergiAvantaji, 35_000); // 100.000 * 0.35
  assert.equal(res.netYatirimMaliyeti, 165_000); // 200.000 - 35.000
});

test('vergiIstisnasiHesapla: yıllık yasal azami tavanı aşamaz', () => {
  const res = vergiIstisnasiHesapla({
    yatirimTutari: 10_000_000,
    yillikBeyanGeliri: 100_000_000,
    projeTuru: 'arge',
    vergiDilimi: 0.40
  });

  assert.equal(res.uygulanabilirMatrahIndirimi, YILLIK_AZAMI_TAVAN);
  assert.equal(res.tavanAsildiMi, true);
  assert.equal(res.netVergiAvantaji, YILLIK_AZAMI_TAVAN * 0.40);
});
