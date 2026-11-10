import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { virmanOzeti, virmanRengi, kisaUnvan } from './sekundery-virman.mjs';

const V = {
  donemler: [
    { acilis: '2024-07-11', kapanis: '2024-07-19', kapanisKaynak: 'duyuru' },
    { acilis: '2024-08-16', kapanis: '2024-08-23', kapanisKaynak: 'duyuru' },
    { acilis: '2026-11-09', kapanis: '2026-11-15', kapanisKaynak: 'duyuru' },
  ],
  sirketler: {
    AAA: { unvan: 'AAA TEKNOLOJİ ANONİM ŞİRKETİ', gruplar: ['B'], virman: { '2024-07-11': { gun: 12 }, '2024-08-16': { gun: 17 } } },
    BBB: { unvan: 'BBB', gruplar: ['B'], virman: { '2024-07-11': { gun: 20 } } },
    CCC: { unvan: 'CCC', gruplar: ['B'], virman: {} },
  },
};

test('virmanOzeti: açık dönem gösterilmez, duyurusu olmayan girişim sayılmaz, dönem medyanları', () => {
  const o = virmanOzeti(V, '2026-11-10');
  assert.equal(o.donemler.length, 2);
  assert.equal(o.sirketler.length, 2);
  assert.deepEqual(o.donemMedyan, [16, 17]);
  assert.deepEqual(o.donemSayi, [2, 1]);
  assert.equal(o.tumMedyan, 17);
});

test('virmanRengi: kısa açık, uzun hardal; 45 gün üstü sabit', () => {
  assert.equal(virmanRengi(0), 'rgb(252,249,238)');
  assert.equal(virmanRengi(45), 'rgb(214,160,40)');
  assert.equal(virmanRengi(90), virmanRengi(45));
});

test('kisaUnvan: şirket türü atılır', () => {
  assert.equal(kisaUnvan('AAA TEKNOLOJİ ANONİM ŞİRKETİ'), 'AAA TEKNOLOJİ');
  assert.equal(kisaUnvan('LIMBIKBOX AI YAZILIM ANONİM ŞİRKETİ (FULLEGAL YAZILIM ANONİM ŞİRKETİ)'), 'LIMBIKBOX AI YAZILIM');
});

test('virman.json: sahibin Excel kayıtlarıyla aynı yöntem (Ağustos 2024 dönemi ACTVB 12 gün)', () => {
  const v = JSON.parse(readFileSync(new URL('../data/sekundery/virman.json', import.meta.url), 'utf8'));
  assert.equal(v.sirketler.ACTVB.virman['2024-07-11'].gun, 12);
  assert.equal(v.sirketler.ACTVB.virman['2024-08-16'].gun, 17);
  assert.equal(v.sirketler.SUITE.virman['2024-07-11'].gun, 30); // Excel'de elle 27 yazılmıştı
});

test('tamUnvan: tam ad, şirket türü kısaltılır', async () => {
  const { tamUnvan } = await import('./sekundery-virman.mjs');
  assert.equal(tamUnvan('ACTV BİYOTEKNOLOJİ LABORATUVAR SANAYİ VE TİCARET ANONİM ŞİRKETİ'), 'ACTV BİYOTEKNOLOJİ LABORATUVAR SANAYİ VE TİCARET A.Ş.');
  assert.equal(tamUnvan('LIMBIKBOX AI YAZILIM ANONİM ŞİRKETİ (FULLEGAL YAZILIM ANONİM ŞİRKETİ)'), 'LIMBIKBOX AI YAZILIM A.Ş.');
  assert.equal(tamUnvan(null), null);
});
