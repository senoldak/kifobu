import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunEkle, gunlukYaz, istanbulGunu, retKodlari, sayan, turSayilari, SAKLA_GUN } from './gunluk-sayilar.mjs';

test('retKodlari: bilinen gerekçe sabit kod, standart kural başına, bilinmeyen diger', () => {
  assert.deepEqual(retKodlari('düşük haber değeri (42, eşik 55)'), ['dusuk-haber-degeri']);
  assert.deepEqual(retKodlari('kapsam dışı'), ['kapsam-disi']);
  assert.deepEqual(retKodlari('zaten yazıldı (özel ad eşleşmesi)'), ['zaten-yazildi']);
  assert.deepEqual(retKodlari('kısa, eş bulunamadı'), ['kisa-es-yok']);
  assert.deepEqual(retKodlari('denetimden geçemedi: rakam kaynakta yok'), ['denetim-durdu']);
  assert.deepEqual(retKodlari('standart:kirmizi:kaynak-benzerligi,medya-adi'), ['standart:kaynak-benzerligi', 'standart:medya-adi']);
  assert.deepEqual(retKodlari('standart kapısı'), ['standart']);
  assert.deepEqual(retKodlari('bayat (3 günü geçti)'), ['bayat']);
  assert.deepEqual(retKodlari('başka bir şey haber.example.com'), ['diger']);
  assert.deepEqual(retKodlari(undefined), ['diger']);
});

test('turSayilari: kaynak öğeleri sayılır, yazılan benzersiz haberdir; metin yazılmaz', () => {
  const t = turSayilari({
    bulunan: 9,
    sonuclar: [
      { kimlik: 'a', durum: 'yazildi', slug: 's1' }, { kimlik: 'b', durum: 'yazildi', slug: 's1' },
      { kimlik: 'c', durum: 'yazildi', slug: 's2' },
      { kimlik: 'd', durum: 'elendi', gerekce: 'düşük haber değeri (30, eşik 55)' }, { kimlik: 'e', durum: 'elendi', gerekce: 'kapsam dışı' },
      { kimlik: 'f', durum: 'bekliyor', gerekce: 'havuzda' },
    ],
  });
  assert.deepEqual(t, { tur: 1, bulunan: 9, degerlendirilen: 5, elenen: { 'dusuk-haber-degeri': 1, 'kapsam-disi': 1 }, yazilan: 2, yayimlanan: 2, bekleyen: 1 });
  assert.doesNotMatch(JSON.stringify(t), /haber\.example|eşik/);
});

test('gunEkle: aynı gün toplanır, iç içe sayılar dahil; eski günler düşer', () => {
  const a = gunEkle({}, '2026-11-02', { tur: 1, bulunan: 3, elenen: { x: 1 } }, 't1');
  const b = gunEkle(a, '2026-11-02', { tur: 1, bulunan: 2, elenen: { x: 2, y: 1 } }, 't2');
  assert.deepEqual(b, { guncellendi: 't2', gunler: { '2026-11-02': { tur: 2, bulunan: 5, elenen: { x: 3, y: 1 } } } });
  const cok = { gunler: Object.fromEntries(Array.from({ length: SAKLA_GUN + 5 }, (_, i) => [`2025-${String(i).padStart(4, '0')}`, { tur: 1 }])) };
  assert.equal(Object.keys(gunEkle(cok, '2026-11-02', { tur: 1 }, 't').gunler).length, SAKLA_GUN);
});

test('sayan: adaylar ve isle sonuçları (hatayla gelen kısmi sonuçlar dahil) sayılır', async () => {
  const u = { adaylar: async () => [1, 2, 3], isle: async () => { const e = new Error('x'); e.sonuclar = [{ durum: 'elendi', gerekce: 'kapsam dışı' }]; throw e; } };
  const s = sayan(u);
  await s.uyarlayici.adaylar();
  await assert.rejects(s.uyarlayici.isle([]));
  assert.equal(s.sayilar().bulunan, 3);
  assert.deepEqual(s.sayilar().elenen, { 'kapsam-disi': 1 });
});

test('gunlukYaz: dosya yoksa kurulur, İstanbul gününe yazılır', async () => {
  const dosya = path.join(mkdtempSync(path.join(tmpdir(), 'gunluk-')), 'alt', 'gunluk.json');
  await gunlukYaz(dosya, { tur: 1, bulunan: 4 }, new Date('2026-11-02T22:30:00Z'));
  const v = JSON.parse(readFileSync(dosya, 'utf8'));
  assert.deepEqual(v.gunler['2026-11-03'], { tur: 1, bulunan: 4 });
  writeFileSync(dosya, '{bozuk');
  await assert.rejects(gunlukYaz(dosya, { tur: 1 }));
  assert.equal(istanbulGunu(new Date('2026-11-02T20:59:00Z')), '2026-11-02');
});
