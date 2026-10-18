import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bol, kartSvg, tahtaRengi } from './kart.ts';

test('bültende tarih ikinci satıra ayrılır; haberde ayrılmaz', () => {
  assert.deepEqual(bol('Gece Bülteni — 17 Ekim 2026', 'gunluk-bulten'), { kicker: null, ana: 'Gece Bülteni', tarih: '17 Ekim 2026' });
  assert.deepEqual(bol('X — Y', 'yatirimlar'), { kicker: null, ana: 'X — Y', tarih: null });
});

test('iki noktalı ön ek üst etikete çıkar, ana başlık büyük harfle başlar', () => {
  assert.deepEqual(bol('Rapor: ilk çeyrekte yatırım arttı', 'analiz'), { kicker: 'Rapor', ana: 'İlk çeyrekte yatırım arttı', tarih: null });
});

test('bölüm renkleri: bilinmeyen bölüm bülten tahtasını alır', () => {
  assert.deepEqual(tahtaRengi('emekli-bolum'), tahtaRengi('gunluk-bulten'));
  assert.notDeepEqual(tahtaRengi('girisimler'), tahtaRengi('yatirimlar'));
});

for (const [bicim, g, y] of [['kapak', 1200, 675], ['post', 1080, 1350], ['story', 1080, 1920]] as const) {
  test(`kartSvg ${bicim}: ${g}×${y}, yazılar glif yolu, tutar ayrıca yazılmaz`, () => {
    const s = kartSvg({ baslik: 'Unravel Health, evde hormon takibi teknolojisi için 2,96 milyon euro yatırım aldı', kategori: 'yatirimlar' }, bicim);
    assert.match(s, new RegExp(`width="${g}" height="${y}"`));
    assert.match(s, /<path transform=/);
    assert.doesNotMatch(s, /<text/);
    assert.match(s, new RegExp(`fill="${tahtaRengi('yatirimlar').tahta}"`));
  });
}

test('story yönlendirme notu yalnız story biçiminde var', () => {
  const k = kartSvg({ baslik: 'Kısa başlık', kategori: 'analiz' }, 'kapak');
  const s = kartSvg({ baslik: 'Kısa başlık', kategori: 'analiz' }, 'story');
  assert.ok(s.length > k.length);
});
