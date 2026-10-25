import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ceyrekBasligi,
  ceyrekSayilari,
  ceyrekteMi,
  defterNotuGerekli,
  kalanElenen,
  kuralAdi,
  kuralDokumu,
  kuralSatirlari,
  kuralToplami,
  raporlariSirala,
  zamanCeyrekteMi,
  type SayimHaber,
} from './standartlar-raporu.ts';

const BAS = '2026-10-01';
const SON = '2026-12-31';
const haber = (date: string, o: Partial<SayimHaber> = {}): SayimHaber => ({ date: new Date(date), category: 'girisim', uretim: 'editor', ...o });

test('çeyrek sınırları İstanbul saatine göre', () => {
  // 30 Eylül 21:00Z = 1 Ekim 00:00 İstanbul (içeride); bir saniye öncesi dışarıda.
  assert.equal(zamanCeyrekteMi(new Date('2026-09-30T21:00:00Z'), BAS, SON), true);
  assert.equal(zamanCeyrekteMi(new Date('2026-09-30T20:59:59Z'), BAS, SON), false);
  // 31 Aralık 20:59:59Z hâlâ 31 Aralık İstanbul (içeride); 21:00Z = 1 Ocak (dışarıda).
  assert.equal(zamanCeyrekteMi(new Date('2026-12-31T20:59:59Z'), BAS, SON), true);
  assert.equal(zamanCeyrekteMi(new Date('2026-12-31T21:00:00Z'), BAS, SON), false);
  assert.equal(ceyrekteMi('2026-10-01', BAS, SON), true);
  assert.equal(ceyrekteMi('2026-12-31', BAS, SON), true);
  assert.equal(ceyrekteMi('2027-01-01', BAS, SON), false);
});

test('boş veri sıfır döner', () => {
  const s = ceyrekSayilari([], [], [], BAS, SON);
  assert.deepEqual(s, { botHaberi: 0, yayinciYazisi: 0, zincirYazisi: 0, duzeltme: 0, kaldirilan: 0, sikayet: { toplam: 0, yerinde: 0, kismen: 0, yerindeDegil: 0 } });
});

test('site içeriğinden sayımlar', () => {
  const s = ceyrekSayilari(
    [
      haber('2026-10-05T10:00:00Z', { uretim: 'yapay-zeka' }),
      haber('2026-10-06T10:00:00Z', { uretim: 'yapay-zeka', category: 'gunluk-bulten' }),
      haber('2026-10-07T10:00:00Z', { uretim: 'yapay-zeka', draft: true }),
      haber('2026-11-07T10:00:00Z', { author: 'Şenol Dak' }),
      haber('2026-11-08T10:00:00Z', { yaziTuru: 'aciklayici' }),
      haber('2026-11-09T10:00:00Z', { uretim: 'yazi-isleri', author: 'Şenol Dak' }),
      haber('2026-11-10T10:00:00Z', { uretim: 'yazi-isleri' }),
      haber('2027-01-02T10:00:00Z', { uretim: 'yapay-zeka' }),
    ],
    [
      { tarih: '2026-10-10', tur: 'Düzeltme' },
      { tarih: '2026-12-31', tur: 'Yayından kaldırıldı' },
      { tarih: '2027-01-01', tur: 'Düzeltme' },
    ],
    [
      { alindi: '2026-09-20', karar: '2026-10-02', sonuc: 'yerinde' },
      { alindi: '2026-10-20', karar: '2026-11-10', sonuc: 'kismen' },
      { alindi: '2026-12-01', karar: '2026-12-20', sonuc: 'yerinde-degil' },
      { alindi: '2026-12-20', karar: '2027-01-05', sonuc: 'yerinde' },
    ],
    BAS,
    SON,
  );
  assert.equal(s.botHaberi, 1);
  assert.equal(s.yayinciYazisi, 3);
  assert.equal(s.zincirYazisi, 1);
  assert.equal(s.duzeltme, 1);
  assert.equal(s.kaldirilan, 1);
  assert.deepEqual(s.sikayet, { toplam: 3, yerinde: 1, kismen: 1, yerindeDegil: 1 });
});

test('kural adları okunur; bilinmeyen kod olduğu gibi', () => {
  assert.equal(kuralAdi('olum-kaza'), 'ölüm ve kaza');
  assert.equal(kuralAdi('savas-dili'), 'savaş tarafı dili');
  assert.equal(kuralAdi('yeni-kural'), 'yeni-kural');
});

test('kural satırları: sıfır yazılmaz, çoktan aza, toplam doğru', () => {
  const k = { suc: 3, teror: 0, cocuk: 5, 'yeni-kural': 3 };
  assert.deepEqual(
    kuralSatirlari(k).map((s) => [s.ad, s.n]),
    [['çocuk', 5], ['suç', 3], ['yeni-kural', 3]],
  );
  assert.equal(kuralToplami(k), 11);
  assert.equal(kuralDokumu(k), 'çocuk 5, suç 3, yeni-kural 3');
  assert.equal(kuralDokumu({ suc: 0 }), '');
  assert.deepEqual(kuralSatirlari(undefined), []);
  assert.equal(kuralToplami(undefined), 0);
});

test('kalan elenen = elendi - kirmizi, negatif olmaz', () => {
  assert.equal(kalanElenen({ elendi: 10, kirmizi: 4 }), 6);
  assert.equal(kalanElenen({ elendi: 3, kirmizi: 5 }), 0);
  assert.equal(kalanElenen({ elendi: 0, kirmizi: 0 }), 0);
});

test('başlık, defter notu ve sıralama', () => {
  assert.equal(ceyrekBasligi({ ceyrek: '2026-c4', bas: BAS, son: SON }), '2026 4. çeyrek (1 Ekim – 31 Aralık 2026)');
  assert.equal(ceyrekBasligi({ ceyrek: '2026-c1', bas: '2026-01-01', son: '2026-03-31' }), '2026 1. çeyrek (1 Ocak – 31 Mart 2026)');
  assert.equal(defterNotuGerekli({ defterBaslangici: '2026-10-20', bas: BAS }), true);
  assert.equal(defterNotuGerekli({ defterBaslangici: '2026-10-01', bas: BAS }), false);
  assert.deepEqual(raporlariSirala([{ bas: '2026-10-01' }, { bas: '2027-01-01' }]).map((r) => r.bas), ['2027-01-01', '2026-10-01']);
});
