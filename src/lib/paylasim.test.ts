import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENEL_BULTEN_URL, bultenBaglantisi, gorselAdresi, gunSayfasiCanliMi, metinBaglantisiniCikar, metinBaglantisiniDegistir, utmEkle } from './paylasim.ts';

const sahte = (durum: number | 'hata') => (async () => {
  if (durum === 'hata') throw new Error('ağ');
  return new Response(null, { status: durum });
}) as typeof fetch;

test('UTM kanala göre eklenir ve kampanya parametreleri sabittir', () => {
  const t = utmEkle('https://kifobu.com/gunluk-bulten/2026-10-15/', 'telegram');
  assert.equal(t, 'https://kifobu.com/gunluk-bulten/2026-10-15/?utm_source=telegram&utm_medium=social&utm_campaign=gunluk-bulten');
  const l = utmEkle(GENEL_BULTEN_URL, 'linkedin');
  assert.equal(l, 'https://kifobu.com/gunluk-bulten/?utm_source=linkedin&utm_medium=social&utm_campaign=gunluk-bulten');
});

test('metindeki bağlantı değiştirilir, metnin geri kalanı aynı kalır', () => {
  const metin = '🔗 https://kifobu.com/gunluk-bulten/\n\n#kitlefonlama';
  assert.equal(
    metinBaglantisiniDegistir(metin, 'https://kifobu.com/gunluk-bulten/2026-10-15/?utm_source=linkedin'),
    '🔗 https://kifobu.com/gunluk-bulten/2026-10-15/?utm_source=linkedin\n\n#kitlefonlama',
  );
  assert.equal(metinBaglantisiniDegistir('bağlantısız metin', 'https://x.test/'), 'bağlantısız metin');
});

test('gün sayfası yalnız 200 ise canlı sayılır', async () => {
  assert.equal(await gunSayfasiCanliMi('2026-10-15', sahte(200)), true);
  assert.equal(await gunSayfasiCanliMi('2026-10-15', sahte(404)), false);
  assert.equal(await gunSayfasiCanliMi('2026-10-15', sahte('hata')), false);
});

test('gün sayfası canlıysa o gün, değilse genel sayfa UTM\'li döner', async () => {
  const canli = await bultenBaglantisi('telegram', '2026-10-15', sahte(200));
  assert.equal(canli.gunSayfasi, true);
  assert.equal(canli.url, 'https://kifobu.com/gunluk-bulten/2026-10-15/?utm_source=telegram&utm_medium=social&utm_campaign=gunluk-bulten');
  const yok = await bultenBaglantisi('linkedin', '2026-10-15', sahte(404));
  assert.equal(yok.gunSayfasi, false);
  assert.equal(yok.url, 'https://kifobu.com/gunluk-bulten/?utm_source=linkedin&utm_medium=social&utm_campaign=gunluk-bulten');
});

test('Meta metninde bülten bağlantısının satırı çıkar, boş satır üst üste binmez', () => {
  const metin = '🌻 Bugün\n\n• Madde\n\n🔗 https://kifobu.com/gunluk-bulten/\n\n#kitlefonlama #yatırım';
  assert.equal(metinBaglantisiniCikar(metin), '🌻 Bugün\n\n• Madde\n\n#kitlefonlama #yatırım');
  assert.equal(metinBaglantisiniCikar('bağlantısız metin'), 'bağlantısız metin');
});

test('görsel adresi güne göre önbellek kırıcı alır', () => {
  assert.equal(gorselAdresi('bulten-story.png', '2026-10-17'), 'https://kifobu.com/bulten-story.png?v=2026-10-17');
});
