import { test } from 'node:test';
import assert from 'node:assert/strict';
import { botHaberi, seffaflikVerisi } from './seffaflik.ts';

const SIMDI = new Date('2026-10-18T15:00:00Z');
const haber = (date: string, category = 'yatirimlar', uretim = 'yapay-zeka') => ({ date: new Date(date), category, uretim });

test('seffaflikVerisi: pencere ilk taramadan; yerli/küresel ayrımı, kaynak kodları ve günlük sayılar', () => {
  const taranan = {
    a: { zaman: '2026-10-17T08:00:00Z', kod: 'k111111', yerli: true },
    b: { zaman: '2026-10-17T09:00:00Z', kod: 'k111111', yerli: true },
    c: { zaman: '2026-10-18T09:00:00Z', kod: 'k222222' },
    d: { zaman: '2026-10-18T10:00:00Z', kod: 'k333333' },
  };
  const haberler = [
    haber('2026-10-18T11:00:00Z'),
    haber('2026-10-18T12:00:00Z', 'gunluk-bulten'), // bülten sayılmaz
    haber('2026-10-18T12:00:00Z', 'analiz', 'editor'), // editör yazısı sayılmaz
    haber('2026-10-10T11:00:00Z'), // pencereden önce
  ];
  const v = seffaflikVerisi(haberler, taranan, { simdi: SIMDI });
  assert.equal(v.ilkGun, '2026-10-17');
  assert.equal(v.gunSayisi, 2);
  assert.equal(v.taranan, 4);
  assert.equal(v.yayinlanan, 1);
  assert.equal(v.donusumOrani, 0.25);
  assert.equal(v.kaynakSayisi, 3);
  assert.deepEqual(v.yerli, { taranan: 2, kaynak: 1 });
  assert.deepEqual(v.kuresel, { taranan: 2, kaynak: 2 });
  assert.deepEqual(v.gunluk, [
    { gun: '2026-10-17', taranan: 2, yayinlanan: 0 },
    { gun: '2026-10-18', taranan: 2, yayinlanan: 1 },
  ]);
});

test('seffaflikVerisi: kayıt yoksa yalnız bugün, oran sıfır', () => {
  const v = seffaflikVerisi([haber('2026-10-18T11:00:00Z'), haber('2026-10-17T11:00:00Z')], {}, { simdi: SIMDI });
  assert.equal(v.ilkGun, '2026-10-18');
  assert.equal(v.gunSayisi, 1);
  assert.equal(v.yayinlanan, 1);
  assert.equal(v.donusumOrani, 0);
  assert.equal(v.gunluk.length, 1);
});

test('botHaberi: taslak, bülten ve editör yazısı değil', () => {
  assert.equal(botHaberi(haber('2026-10-18T11:00:00Z')), true);
  assert.equal(botHaberi({ ...haber('2026-10-18T11:00:00Z'), draft: true }), false);
  assert.equal(botHaberi(haber('2026-10-18T11:00:00Z', 'gunluk-bulten')), false);
});
