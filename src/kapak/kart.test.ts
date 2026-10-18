import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bol, kapakDuzeni, kartSvg, kunyeEtiketi } from './kart.ts';

const oznitelik = (svg: string, ad: string) => Number(svg.match(new RegExp(`data-${ad}="([0-9.]+)"`))?.[1]);

test('bültende tarih başlıktan ayrılır; haberde ayrılmaz', () => {
  assert.deepEqual(bol('Gece Bülteni — 17 Ekim 2026', 'gunluk-bulten'), { ana: 'Gece Bülteni', tarih: '17 Ekim 2026' });
  assert.deepEqual(bol('X — Y', 'yatirimlar'), { ana: 'X — Y', tarih: null });
});

test('künye etiketi: bölüm adı Türkçe büyük harf; bültende tarih', () => {
  assert.equal(kunyeEtiketi('girisimler', null), 'GİRİŞİMLER');
  assert.equal(kunyeEtiketi('gunluk-bulten', '17 Ekim 2026'), '17 EKİM 2026');
});

test('düzen seçimi: rakam yoksa uydurma yok', () => {
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'mevzuat' }), 'haber');
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'kampanyalar', girisim: 'A', toplanan: 1, hedef: 2, durum: 'suruyor' }), 'kunye');
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'kampanyalar', girisim: 'A' }), 'haber');
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'yatirimlar', tur: 'Tohum', toplanan: 10_690_000, paraBirimi: 'EUR' }), 'yatirim');
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'yatirimlar', tur: 'Tohum' }), 'haber');
});

test('künye kapağında verisi olmayan hücre çizilmez', () => {
  const s = kartSvg({ baslik: 'X', kategori: 'kampanyalar', girisim: 'Örnek', toplanan: 2_840_000, hedef: 4_000_000, durum: 'suruyor' });
  assert.doesNotMatch(s, /data-hucre="DEĞERLEME"/);
  assert.doesNotMatch(s, /data-hucre="YATIRIMCI"/);
  const y = kartSvg({ baslik: 'X', kategori: 'kampanyalar', girisim: 'Örnek', toplanan: 2_840_000, hedef: 4_000_000, durum: 'suruyor', yatirimci: 612 });
  assert.match(y, /data-hucre="YATIRIMCI"/);
});

const ORNEKLER = {
  haber: { baslik: 'SPK, paya dayalı kitle fonlamasında yatırım sınırlarını güncelledi', kategori: 'mevzuat' },
  kunye: { baslik: 'X', kategori: 'kampanyalar', girisim: 'Örnek Enerji', platform: 'fonangels', toplanan: 4_495_800, hedef: 4_000_000, durum: 'basarili' as const, yatirimci: 1284 },
  yatirim: { baslik: 'Örnek Girişim tohum turunda yatırım aldı', kategori: 'yatirimlar', tur: 'Tohum', toplanan: 10_690_000, paraBirimi: 'EUR' },
};

for (const [duzen, veri] of Object.entries(ORNEKLER)) {
  for (const [bicim, g, y] of [['kapak', 1200, 675], ['post', 1080, 1350], ['story', 1080, 1920]] as const) {
    test(`${duzen} ${bicim}: ${g}×${y}, glif yolu, sarı bant, <text> yok`, () => {
      const s = kartSvg(veri, bicim);
      assert.match(s, new RegExp(`width="${g}" height="${y}"`));
      assert.match(s, /<path transform=/);
      assert.doesNotMatch(s, /<text/);
      assert.match(s, /fill="#e8b40c"/);
      assert.match(s, /fill="#f7f5ef"/);
    });
  }
}

test('kategori Türkçe büyük harfle yazılır', () => {
  assert.match(kartSvg({ baslik: 'X', kategori: 'girisimler' }), /data-kategori="GİRİŞİMLER"/);
});

test('uzun başlık alttaki logo satırına binmez', () => {
  const uzun = 'Unravel Health, evde hormon takibi teknolojisi için 2,96 milyon euro yatırım aldı ve Avrupa genişlemesi için yeni ofisler açacağını duyurdu';
  for (const bicim of ['kapak', 'post', 'story'] as const) {
    const s = kartSvg({ baslik: uzun, kategori: 'yatirimlar' }, bicim);
    assert.ok(oznitelik(s, 'baslik-alt') < oznitelik(s, 'alt-ust'), bicim);
  }
});

test('fonlanan kampanyada yüzde yeşil ve aşım açık yeşil', () => {
  const s = kartSvg(ORNEKLER.kunye);
  assert.match(s, /fill="#10b981"/);
  assert.match(s, /fill="#a7e9cf"/);
});

test('yatırım kapağında başlık da çizilir', () => {
  const s = kartSvg(ORNEKLER.yatirim);
  const yollar = (s.match(/<path /g) ?? []).length;
  const basliksiz = kartSvg({ ...ORNEKLER.yatirim, baslik: 'X' });
  assert.ok(yollar > (basliksiz.match(/<path /g) ?? []).length + 20);
});

test('büyük tutar ve yüzde kenardan taşmaz, birbirine binmez', () => {
  for (const bicim of ['kapak', 'post', 'story'] as const) {
    for (const v of [ORNEKLER.kunye, ORNEKLER.yatirim]) {
      const s = kartSvg(v, bicim);
      assert.ok(oznitelik(s, 'tutar-sag') <= oznitelik(s, 'icerik-sag'), `${bicim} tutar taşıyor`);
    }
  }
});
