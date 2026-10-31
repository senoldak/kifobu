import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GENEL_BULTEN_URL, bultenBaglantisi, dosyaOzeti, gorselAdresi, gorselYayindaMi, gunSayfasiCanliMi, metinBaglantisiniCikar, metinBaglantisiniDegistir, utmEkle } from './paylasim.ts';

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

test('Facebook bağlantısı kendi UTM kaynağıyla gün sayfasına gider', async () => {
  const fb = await bultenBaglantisi('facebook', '2026-10-18', sahte(200));
  assert.equal(fb.url, 'https://kifobu.com/gunluk-bulten/2026-10-18/?utm_source=facebook&utm_medium=social&utm_campaign=gunluk-bulten');
});

test('Meta metninde bülten bağlantısının satırı çıkar, boş satır üst üste binmez', () => {
  const metin = '🌻 Bugün\n\n• Madde\n\n🔗 https://kifobu.com/gunluk-bulten/\n\n#kitlefonlama #yatırım';
  assert.equal(metinBaglantisiniCikar(metin), '🌻 Bugün\n\n• Madde\n\n#kitlefonlama #yatırım');
  assert.equal(metinBaglantisiniCikar('bağlantısız metin'), 'bağlantısız metin');
});

test('görsel adresi güne göre önbellek kırıcı alır', () => {
  assert.equal(gorselAdresi('bulten-story.png', '2026-10-17'), 'https://kifobu.com/bulten-story.png?v=2026-10-17');
});

test('görsel yayında sayılması için sitedeki baytlar yerel dosyayla aynı olmalı', async () => {
  const yeni = new Uint8Array([1, 2, 3]);
  const eski = new Uint8Array([9, 9]);
  const sunan = (veri: Uint8Array | 'hata' | 404) => (async () => {
    if (veri === 'hata') throw new Error('ağ');
    if (veri === 404) return new Response('yok', { status: 404 });
    return new Response(veri, { status: 200 });
  }) as unknown as typeof fetch;
  const ozet = dosyaOzeti(yeni);
  assert.equal(ozet.length, 12);
  assert.equal(await gorselYayindaMi('https://kifobu.com/x.png', ozet, sunan(yeni)), true);
  assert.equal(await gorselYayindaMi('https://kifobu.com/x.png', ozet, sunan(eski)), false);
  assert.equal(await gorselYayindaMi('https://kifobu.com/x.png', ozet, sunan(404)), false);
  assert.equal(await gorselYayindaMi('https://kifobu.com/x.png', ozet, sunan('hata')), false);
});
