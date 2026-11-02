import test from 'node:test';
import assert from 'node:assert/strict';
import { yayinOdasiVerisi } from './yayin-odasi.mjs';

const simdi = new Date('2026-11-03T10:00:00+03:00');
const haber = (slug, gun, ek = {}) => ({ slug, title: `Başlık ${slug}`, date: new Date(`2026-11-0${gun}T09:00:00+03:00`), uretim: 'yapay-zeka', category: 'yatirimlar', ...ek });

test('yayinOdasiVerisi: kayıt yoksa sayı uydurulmaz', () => {
  const r = yayinOdasiVerisi({ haberler: [], simdi });
  assert.equal(r.gun, null);
  assert.equal(r.hafta, null);
  assert.deepEqual(r.elenenler, []);
  assert.equal(r.sonZincir, null);
});

test('yayinOdasiVerisi: son gün, yedi günlük toplam, ret metinleri; standart kuralları tek başlıkta', () => {
  const gunluk = { gunler: {
    '2026-11-01': { tur: 2, bulunan: 10, degerlendirilen: 8, elenen: { 'dusuk-haber-degeri': 3, 'standart:medya-adi': 1 }, yazilan: 2, yayimlanan: 2 },
    '2026-11-03': { tur: 1, bulunan: 4, degerlendirilen: 3, elenen: { 'kapsam-disi': 2, yeni: 1 }, yazilan: 1, yayimlanan: 1 },
    '2026-11-09': { tur: 1, bulunan: 99 },
  } };
  const r = yayinOdasiVerisi({ haberler: [], gunluk, simdi });
  assert.equal(r.gun.tarih, '2026-11-03');
  assert.equal(r.gun.bugun, true);
  assert.equal(r.gun.bulunan, 4);
  assert.equal(r.hafta.gun, 2);
  assert.equal(r.hafta.bulunan, 14);
  assert.deepEqual(r.elenenler.map((e) => [e.kod, e.sayi]), [['dusuk-haber-degeri', 3], ['kapsam-disi', 2], ['diger', 1], ['standart', 1]]);
  assert.ok(r.elenenler.every((e) => e.metin));
});

test('yayinOdasiVerisi: son haberler yalnız bot haberleri; zincir kaydı ve sahibin son yazısı', () => {
  const r = yayinOdasiVerisi({
    haberler: [
      haber('a', 1), haber('b', 2, { haberDegeri: 70 }), haber('bulten', 2, { category: 'gunluk-bulten' }), haber('gelecek', 9),
      haber('zincir', 1, { uretim: 'yazi-isleri', yaziTuru: 'analiz', kjede: { runder: { dogrulama: 2, dil: 0 }, kontrollert: 40, hentet: 12 } }),
    ],
    simdi,
  });
  assert.deepEqual(r.sonHaberler.map((s) => s.url), ['/haber/b/', '/haber/a/']);
  assert.equal(r.sonHaberler[0].haberDegeri, 70);
  assert.deepEqual(r.sonZincir.turlar, [{ adim: 'dogrulama', ad: 'Doğrulayıcı', figur: 'faktasjekk', sayi: 2 }]);
  assert.equal(r.sonZincir.geri, 2);
  assert.equal(r.sonSahip.url, '/haber/zincir/');
});
