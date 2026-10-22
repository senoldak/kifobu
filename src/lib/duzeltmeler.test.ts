import test from 'node:test';
import assert from 'node:assert/strict';
import { duzeltmeKayitlari, notuAyir } from './duzeltmeler.ts';

test('notuAyir: başındaki tarihi ayırır', () => {
  assert.deepEqual(notuAyir('20.10.2026 14:00: Tutar düzeltildi.', '2026-01-01'), { tarih: '2026-10-20', metin: 'Tutar düzeltildi.' });
  assert.deepEqual(notuAyir('Tutar düzeltildi.', '2026-01-01'), { tarih: '2026-01-01', metin: 'Tutar düzeltildi.' });
});

test('duzeltmeKayitlari: iki kaynağı birleştirir, yeniden eskiye sıralar', () => {
  const k = duzeltmeKayitlari(
    [{ baslik: 'A', href: '/haber/a/', duzeltme: '19.10.2026: Rakam düzeltildi.', yedekTarih: '2026-10-01' }, { baslik: 'B', href: '/haber/b/', yedekTarih: '2026-10-01' }],
    [{ tarih: '2026-10-20', ilkYayin: '2026-10-12', neden: 'Kaldırıldı.' }],
  );
  assert.equal(k.length, 2);
  assert.equal(k[0].tur, 'Yayından kaldırıldı');
  assert.match(k[0].metin, /12 Ekim 2026/);
  assert.equal(k[1].baslik, 'A');
});
