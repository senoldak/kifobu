import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { itoCarpani, kurBul, dolara, ayAdi, altinYaz, paraYaz, kurlaGuncelle } from './sekundery-kur.mjs';
import { itoSatirlari, usdSatirlari } from '../../scripts/sekundery/evds.mjs';

const S = [{ yil: 2026, ay: 1, aylik: 10 }, { yil: 2026, ay: 2, aylik: 10 }, { yil: 2026, ay: 3, aylik: 0 }];

test('itoCarpani: kampanya ayından sonraki aydan bileşik', () => {
  const c = itoCarpani('2026-01-20', S);
  assert.equal(Math.round(c.carpan * 1e6) / 1e6, 1.1);
  assert.deepEqual(c.sonAy, { yil: 2026, ay: 3 });
  assert.equal(Math.round(itoCarpani('2025-12-05', S).carpan * 1e6) / 1e6, 1.21);
  assert.equal(itoCarpani('2026-03-01', S).carpan, 1);
  assert.equal(itoCarpani('2020-01-01', S), null);
  assert.equal(itoCarpani(null, S), null);
});

test('kurBul: hafta sonunda önceki iş günü', () => {
  const k = { '2026-11-06': 42.1, '2026-11-09': 42.3 };
  assert.equal(kurBul('2026-11-09', k), 42.3);
  assert.equal(kurBul('2026-11-08', k), 42.1);
  assert.equal(kurBul('2026-10-01', k), null);
  assert.equal(dolara(84.2, 42.1), 2);
  assert.equal(dolara(1, 0), null);
});

test('ayAdi', () => assert.equal(ayAdi({ yil: 2026, ay: 10 }), 'Ekim 2026'));

test('evds ayrıştırma: İTO eski/yeni seri geçişi ve günlük kur', () => {
  const ito = itoSatirlari([
    { Tarih: '2024-1', 'TP_FG_B01_95-1': '6.5', 'TP_FG_IST1_23-1': '9' },
    { Tarih: '2024-2', 'TP_FG_B01_95-1': '9', 'TP_FG_IST1_23-1': '4.12' },
  ]);
  assert.deepEqual(ito, [{ yil: 2024, ay: 1, aylik: 6.5 }, { yil: 2024, ay: 2, aylik: 4.12 }]);
  assert.throws(() => itoSatirlari([{ Tarih: '2024-1', 'TP_FG_B01_95-1': '1' }, { Tarih: '2024-3', 'TP_FG_IST1_23-1': '1' }]), /boşluk/);
  assert.deepEqual(usdSatirlari([{ Tarih: '07-02-2022', TP_DK_USD_S_YTL: '13.558' }, { Tarih: '06-02-2022', TP_DK_USD_S_YTL: null }]), { '2022-02-07': 13.558 });
});

test('gerçek veri: GURLR-B dağıtım kuru Excel Sayfa154 ile aynı (28,02)', () => {
  const k = JSON.parse(readFileSync(new URL('../data/sekundery/usd-try.json', import.meta.url), 'utf8')).kurlar;
  assert.equal(Math.round(kurBul('2023-10-19', k) * 100) / 100, 28.02);
});

test('altinYaz ve paraYaz: birim seçimi', () => {
  assert.equal(altinYaz(0.000693), '0,000693 gr');
  assert.equal(altinYaz(0.0049), '0,00490 gr');
  assert.equal(altinYaz(52067), '52,07 kg');
  assert.equal(altinYaz(12.5), '12,50 gr');
  assert.equal(paraYaz(6.17, 'tl'), '₺6,17');
  assert.equal(paraYaz(0.3105, 'usd'), '$0,311');
  assert.equal(paraYaz(65500000, 'tl', 0), '₺65.500.000');
  assert.equal(paraYaz(null, 'eur'), '—');
});

test('kurlaGuncelle: Excel İTOV DDG ile aynı (ACTVB-B 13,74)', () => {
  // Excel: 6,17 dağıtım, 24 Mayıs 2023 kuru 19,8627, Excel'in son kuru ~44,2178 → 13,7355
  assert.equal(kurlaGuncelle(6.17, 19.8627, 44.2178), 13.74);
  assert.equal(kurlaGuncelle(null, 1, 2), null);
  assert.equal(kurlaGuncelle(5, 0, 2), null);
});
