import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraKisa, paraTam, yuzdeBicim, degisimBicim, tarihTr, dosyaParcasi, yuzdeEkli } from './bicim.ts';

test('paraKisa', () => {
  assert.equal(paraKisa(1_250_000), '₺1,25 M');
  assert.equal(paraKisa(142_000), '₺142 B');
  assert.equal(paraKisa(950), '₺950');
  assert.equal(paraKisa(1_000_000), '₺1 M');
  assert.equal(paraKisa(999_960), '₺1 M');
  assert.equal(paraKisa(999.6), '₺1 B');
  assert.equal(paraKisa(999_949), '₺999,9 B');
});

test('paraTam binlik ayraç nokta', () => {
  assert.equal(paraTam(7_602_500), '₺7.602.500');
});

test('yüzde ve değişim: iki ondalık, kesilerek (BRAND.md §9)', () => {
  assert.equal(yuzdeBicim(50.64), '%50,64');
  assert.equal(yuzdeBicim(99.996), '%99,99');
  assert.equal(yuzdeBicim(100), '%100,00');
  assert.equal(degisimBicim(4.2), '▲ %4,20');
  assert.equal(degisimBicim(-3), '▼ %3,00');
  assert.equal(degisimBicim(null), '—');
});

test('tarihTr', () => {
  assert.equal(tarihTr('2026-10-13'), '13.10.2026');
  assert.equal(tarihTr(''), '');
});

test('dosyaParcasi Türkçe küçük harf', () => {
  assert.equal(dosyaParcasi('OYLİO'), 'oylio');
  assert.equal(dosyaParcasi('ATHLETICLABS'), 'athleticlabs');
  assert.equal(dosyaParcasi('Çiğ Şeker Ölçü'), 'cig-seker-olcu');
  assert.equal(dosyaParcasi('  A.B & C  '), 'a-b-c');
});

test('yuzdeEkli okunan son sayıya uyar (iki ondalık)', () => {
  assert.equal(yuzdeEkli(51.71), "%51,71'i"); // yetmiş bir
  assert.equal(yuzdeEkli(50.64), "%50,64'ü"); // altmış dört
  assert.equal(yuzdeEkli(50.6), "%50,60'ı"); // altmış
  assert.equal(yuzdeEkli(42.3), "%42,30'u"); // otuz
  assert.equal(yuzdeEkli(12.9), "%12,90'ı"); // doksan
  assert.equal(yuzdeEkli(7.2), "%7,20'si"); // yirmi
  assert.equal(yuzdeEkli(8.5), "%8,50'si"); // elli
  assert.equal(yuzdeEkli(8.1), "%8,10'u"); // on
  assert.equal(yuzdeEkli(30), "%30,00'u"); // yüzde otuz
  assert.equal(yuzdeEkli(100), "%100,00'ü"); // yüzde yüz
  assert.equal(yuzdeEkli(7), "%7,00'si"); // yüzde yedi
});

test('null ve sonlu olmayan sayılar tire', () => {
  for (const n of [null, NaN, Infinity, -Infinity]) {
    assert.equal(yuzdeBicim(n), '—');
    assert.equal(paraKisa(n), '—');
    assert.equal(paraTam(n), '—');
    assert.equal(degisimBicim(n), '—');
    assert.equal(yuzdeEkli(n), '—');
  }
});

test('yuzdeEkli binin üstünde okunuşa uyar', () => {
  assert.equal(yuzdeEkli(1200), "%1200,00'ü"); // bin iki yüz
  assert.equal(yuzdeEkli(1000), "%1000,00'i"); // bin
  assert.equal(yuzdeEkli(2500), "%2500,00'ü"); // iki bin beş yüz
  assert.equal(yuzdeEkli(1230), "%1230,00'u"); // bin iki yüz otuz
  assert.equal(yuzdeEkli(10000), "%10000,00'i"); // on bin
  assert.equal(yuzdeEkli(200), "%200,00'ü"); // iki yüz
});
