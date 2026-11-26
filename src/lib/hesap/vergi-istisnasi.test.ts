import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASGARI_YATIRIM_2026, YILLIK_AZAMI_TAVAN, bkyIndirimiHesapla, gelirVergisi2026 } from './vergi-istisnasi.ts';

test('gelirVergisi2026: GİB rehberindeki sabit tutarlarla aynı (332 Seri No.lu Tebliğ)', () => {
  assert.equal(gelirVergisi2026(190_000), 28_500);
  assert.equal(gelirVergisi2026(400_000), 70_500);
  assert.equal(gelirVergisi2026(1_000_000), 232_500);
  assert.equal(gelirVergisi2026(5_300_000), 1_737_500);
  assert.equal(gelirVergisi2026(1_500_000, 'ucret'), 367_500);
  assert.equal(gelirVergisi2026(5_300_000, 'ucret'), 1_697_500);
  assert.equal(gelirVergisi2026(0), 0);
});

test('bkyIndirimiHesapla: %75 oran, vergi farkı kademeli tarifeyle hesaplanır', () => {
  const r = bkyIndirimiHesapla({ yatirimTutari: 400_000, beyanMatrahi: 3_000_000, oranTuru: 'standart' });
  assert.equal(r.uygulananOran, 0.75);
  assert.equal(r.indirim, 300_000);
  assert.equal(r.vergiFarki, 105_000); // 300.000 TL tamamı %35 diliminde
  assert.equal(r.efektifOran, 26.25);
  assert.equal(r.asgariAltinda, false);
});

test('bkyIndirimiHesapla: dilim sınırını aşan indirim iki dilimden vergi düşürür', () => {
  const r = bkyIndirimiHesapla({ yatirimTutari: 500_000, beyanMatrahi: 1_200_000, oranTuru: 'arge' });
  assert.equal(r.indirim, 500_000);
  // 1.200.000 → 700.000: 200.000 × %35 + 300.000 × %27
  assert.equal(r.vergiFarki, 151_000);
});

test('bkyIndirimiHesapla: 2.500.000 TL tavanı ve beyan matrahı sınırı', () => {
  const t = bkyIndirimiHesapla({ yatirimTutari: 5_000_000, beyanMatrahi: 10_000_000, oranTuru: 'standart' });
  assert.equal(t.indirim, YILLIK_AZAMI_TAVAN);
  assert.equal(t.tavanaTakildi, true);
  const m = bkyIndirimiHesapla({ yatirimTutari: 1_000_000, beyanMatrahi: 300_000, oranTuru: 'arge' });
  assert.equal(m.indirim, 300_000);
  assert.equal(m.matrahaTakildi, true);
  assert.equal(m.vergiSonra, 0);
});

test('bkyIndirimiHesapla: asgari yatırımın altı işaretlenir; boş girdi sıfır döner', () => {
  assert.equal(bkyIndirimiHesapla({ yatirimTutari: ASGARI_YATIRIM_2026 - 1, beyanMatrahi: 3_000_000, oranTuru: 'standart' }).asgariAltinda, true);
  const s = bkyIndirimiHesapla({ yatirimTutari: 0, beyanMatrahi: 0, oranTuru: 'standart' });
  assert.equal(s.vergiFarki, 0);
  assert.equal(s.efektifOran, 0);
});
