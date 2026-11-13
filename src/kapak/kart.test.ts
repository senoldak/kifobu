import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bol, bultenMaddeleri, kapakDuzeni, kartSvg, kunyeEtiketi } from './kart.ts';

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
    for (const v of [ORNEKLER.kunye]) {
      const s = kartSvg(v, bicim);
      assert.ok(oznitelik(s, 'tutar-sag') <= oznitelik(s, 'icerik-sag'), `${bicim} tutar taşıyor`);
    }
  }
});

const BICIMLER = ['kapak', 'post', 'story'] as const;

test('çok uzun girişim ve platform adı kenardan taşmaz', () => {
  const v = { ...ORNEKLER.kunye, girisim: 'Uluslararası Yenilenebilir Enerji ve Akıllı Şebeke Teknolojileri Anonim Şirketi', platform: 'çok uzun bir kitle fonlama platformu adı örneği ve devamı burada uzar gider' };
  for (const b of BICIMLER) {
    const s = kartSvg(v, b);
    assert.ok(oznitelik(s, 'ad-sag') <= oznitelik(s, 'icerik-sag'), `${b} ad`);
    assert.ok(oznitelik(s, 'platform-sag') <= oznitelik(s, 'icerik-sag'), `${b} platform`);
  }
});

test('tek başına satırdan uzun kelime başlıkta taşmaz', () => {
  const uzun = 'Süpercalifragilistikekspialidosyusvarimsiuzunbirkelimedahabudaha çok uzundur';
  for (const b of BICIMLER) {
    for (const v of [{ baslik: uzun, kategori: 'mevzuat' }, { ...ORNEKLER.yatirim, baslik: uzun }]) {
      const s = kartSvg(v, b);
      assert.ok(oznitelik(s, 'baslik-sag') <= oznitelik(s, 'icerik-sag'), `${b}`);
    }
  }
});

test('yatırım kapağında büyük tutar yok, başlık alt satıra binmez', () => {
  const v = { ...ORNEKLER.yatirim, baslik: 'Uzun bir yatırım haberi başlığı ki üç satıra kadar iner ve alt satırla yarışır, kısalmalıdır gerektiğinde', toplanan: 987_654_321_000, paraBirimi: 'USD' };
  for (const b of BICIMLER) {
    const s = kartSvg(v, b);
    assert.doesNotMatch(s, /tutar-/, b);
    assert.ok(oznitelik(s, 'baslik-alt') <= oznitelik(s, 'alt-ust'), b);
  }
});

test('alt satırda logo ile kategori birbirine yaklaşmaz', async () => {
  const { CATEGORIES } = await import('../lib/site.ts');
  for (const b of BICIMLER) {
    for (const c of CATEGORIES) {
      const s = kartSvg({ baslik: 'X', kategori: c.slug }, b);
      assert.ok(oznitelik(s, 'logo-sag') + 24 <= oznitelik(s, 'kategori-sol'), `${b} ${c.slug}`);
    }
    const s = kartSvg({ baslik: 'Gece Bülteni — 30 Eylül 2026', kategori: 'gunluk-bulten' }, b);
    assert.ok(oznitelik(s, 'logo-sag') + 24 <= oznitelik(s, 'kategori-sol'), `${b} bülten`);
  }
});

test('bülten kapağı: haber listesinden en çok üç madde, sağ altta tarih, maddeler alt satıra değmez', () => {
  const govde = 'Son bültenden bu yana:\n\n- [Bir haber, uzun bir başlık](/haber/a/)\n- [İki](/haber/b/)\n* [Üç](/haber/c/)\n- [Dört](/haber/d/)\n\nDüz satır [bağlantı](/x/)';
  const m = bultenMaddeleri(govde);
  assert.deepEqual(m, ['Bir haber, uzun bir başlık', 'İki', 'Üç', 'Dört']);
  assert.deepEqual(bultenMaddeleri(undefined), []);
  const uzun = 'Enzo Ventures, Güney Avrupa kökenli girişimler için 20 milyon euro büyüklüğünde ikinci fonunu kapattı';
  for (const b of BICIMLER) {
    const s = kartSvg({ baslik: 'Öğle Bülteni — 19 Ekim 2026', kategori: 'gunluk-bulten', maddeler: [uzun, ...m] }, b);
    assert.match(s, /data-kategori="19 EKİM 2026"/, b);
    assert.ok(oznitelik(s, 'madde-alt') + 24 <= oznitelik(s, 'alt-ust'), `${b} maddeler alt satıra değmez`);
    assert.ok(oznitelik(s, 'logo-sag') + 24 <= oznitelik(s, 'kategori-sol'), `${b} logo ile tarih`);
  }
  // Maddesiz bülten eski düz kapakla çizilir.
  assert.doesNotMatch(kartSvg({ baslik: 'Gece Bülteni — 17 Ekim 2026', kategori: 'gunluk-bulten' }), /data-madde-alt/);
});

// --- Günün Özeti ve kesmesiz bülten listesi (2026-11-14) ---
const GUN = [
  'Mirendil, Seri A turunda 1 milyar dolar yatırım aldı',
  'Q-CTRL, Seri C turunda 290 milyon dolar yatırım alarak unicorn unvanı kazandı',
  'Databento, Seri C turunda 100 milyon dolar yatırım alarak değerlemesini 1,1 milyar dolara çıkardı',
  'Norwest Venture Partners 4 milyar dolar büyüklüğünde yeni fon oluşturdu',
  'Bucked Games, Startupfon Tohum GSYF ve Startupfon Co-Invest’ten yatırım aldı',
  '4Minds, Seri A turunda 15 milyon dolar yatırım aldı',
];
const basliklar = (s: string): string[] => JSON.parse(s.match(/data-basliklar="([^"]*)"/)![1].replaceAll('&quot;', '"'));

test('ozetKartSvg: başlık listesi en çok 4, kalan sayılır, hiçbir başlık kesilmez', async () => {
  const { ozetKartSvg } = await import('./kart.ts');
  const s = ozetKartSvg({ tarih: '13 Kasım 2026', basliklar: GUN, toplam: 11 });
  assert.match(s, /width="1200" height="675"/);
  assert.match(s, /data-kategori="13 KASIM 2026"/);
  const b = basliklar(s);
  assert.ok(b.length >= 2 && b.length <= 4, `madde ${b.length}`);
  for (const x of b) assert.ok(GUN.includes(x), x);
  assert.equal(oznitelik(s, 'kalan'), 11 - b.length);
  assert.ok(oznitelik(s, 'madde-alt') + 24 <= oznitelik(s, 'alt-ust'));
});

test('ozetKartSvg: iki satıra sığmayan başlık kapağa girmez', async () => {
  const { ozetKartSvg } = await import('./kart.ts');
  const dev = 'Çok uzun bir başlık '.repeat(10).trim();
  const s = ozetKartSvg({ tarih: '13 Kasım 2026', basliklar: [dev, GUN[0]], toplam: 2 });
  assert.deepEqual(basliklar(s), [GUN[0]]);
  assert.equal(oznitelik(s, 'kalan'), 1);
});

test('bülten kapağı: uzun madde "…" ile kesilmez, ya tam ya hiç', () => {
  const uzun = 'Çok uzun bir madde '.repeat(8).trim();
  for (const b of BICIMLER) {
    const s = kartSvg({ baslik: 'Öğle Bülteni — 19 Ekim 2026', kategori: 'gunluk-bulten', maddeler: [uzun, ...GUN.slice(0, 3)] }, b);
    const m = basliklar(s);
    for (const x of m) assert.ok(x === uzun || GUN.includes(x), x);
    assert.ok(m.length <= 3, b);
    assert.equal(oznitelik(s, 'kalan'), 4 - m.length, b);
  }
});
