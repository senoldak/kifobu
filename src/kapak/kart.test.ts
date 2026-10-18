import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bol, kartSvg, kunyeEtiketi, tahtaRengi } from './kart.ts';

test('bültende tarih başlıktan ayrılır; haberde ayrılmaz', () => {
  assert.deepEqual(bol('Gece Bülteni — 17 Ekim 2026', 'gunluk-bulten'), { ana: 'Gece Bülteni', tarih: '17 Ekim 2026' });
  assert.deepEqual(bol('X — Y', 'yatirimlar'), { ana: 'X — Y', tarih: null });
});

test('künye etiketi: bölüm adı; bültende tarih (bülten numarası yok)', () => {
  assert.equal(kunyeEtiketi('girisimler', null), 'GİRİŞİMLER');
  assert.equal(kunyeEtiketi('gunluk-bulten', '17 Ekim 2026'), '17 EKİM 2026');
});

test('bölüm renkleri: bilinmeyen bölüm bülten tahtasını alır', () => {
  assert.deepEqual(tahtaRengi('emekli-bolum'), tahtaRengi('gunluk-bulten'));
  assert.notDeepEqual(tahtaRengi('girisimler'), tahtaRengi('yatirimlar'));
});

for (const [bicim, g, y] of [['kapak', 1200, 675], ['post', 1080, 1350], ['story', 1080, 1920]] as const) {
  test(`kartSvg ${bicim}: ${g}×${y}, yazılar glif yolu, bölümün tahta tonu`, () => {
    const s = kartSvg({ baslik: 'Unravel Health, evde hormon takibi teknolojisi için 2,96 milyon euro yatırım aldı', kategori: 'yatirimlar' }, bicim);
    assert.match(s, new RegExp(`width="${g}" height="${y}"`));
    assert.match(s, /<path transform=/);
    assert.doesNotMatch(s, /<text/);
    assert.match(s, new RegExp(`fill="${tahtaRengi('yatirimlar').tahta}"`));
  });
}
