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

test('yüzde ve değişim', () => {
  assert.equal(yuzdeBicim(50.64), '%50,6');
  assert.equal(degisimBicim(4.2), '▲ %4,2');
  assert.equal(degisimBicim(-3), '▼ %3,0');
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

test('yuzdeEkli son rakamın okunuşuna uyar', () => {
  assert.equal(yuzdeEkli(50.6), "%50,6'sı");
  assert.equal(yuzdeEkli(100), "%100,0'ı");
  assert.equal(yuzdeEkli(42.3), "%42,3'ü");
  assert.equal(yuzdeEkli(12.9), "%12,9'u");
  assert.equal(yuzdeEkli(7.2), "%7,2'si");
  assert.equal(yuzdeEkli(8.5), "%8,5'i");
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
