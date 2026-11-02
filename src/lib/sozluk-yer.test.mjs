import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN_COK, terimDugumleri, terimleriBul } from './sozluk.mjs';
import { haberinIli, haritaCiz, ILLER } from './yer.mjs';

const sozluk = JSON.parse(readFileSync(new URL('../data/sozluk.json', import.meta.url), 'utf8'));
const bul = (t) => terimleriBul(t, sozluk).map((b) => [t.slice(b.bas, b.son), b.terim]);

test('sözlük: ekli biçimler, uzun terim kısa olandan önce, büyük harfle başlayan cümle', () => {
  assert.deepEqual(bul('Seri A öncesi turda melek yatırımcıların katılımıyla.'), [['Seri A öncesi', 'Seri A öncesi'], ['melek yatırımcıların', 'melek yatırımcı']]);
  assert.deepEqual(bul('Kitle fonlaması büyüyor.'), [['Kitle fonlaması', 'kitle fonlaması']]);
  assert.deepEqual(bul('Şirket ARR’ı aştı.'), [['ARR’ı', 'ARR']]);
  assert.deepEqual(bul('Seriamız ve meleklerimiz.'), []);
});

test('sözlük: haber başına en çok üç terim, aynı terim ikinci kez işaretlenmez', () => {
  const kullanilan = new Set();
  const d = terimDugumleri('Seri A, değerleme, halka arz ve unicorn.', sozluk, kullanilan);
  assert.equal(d.filter((x) => x.tagName === 'button').length, EN_COK);
  assert.equal(terimDugumleri('Bir daha Seri A.', sozluk, kullanilan), null);
  const b = d.find((x) => x.tagName === 'button');
  assert.deepEqual(b.properties.className, ['yh-terim']);
  assert.ok(b.properties.dataTanim.length > 10);
});

test('sözlük: her terimin tanımı dolu ve kısa', () => {
  for (const t of sozluk.terimler) {
    assert.ok(t.terim && t.tanim, t.terim);
    assert.ok(t.tanim.length <= 160, t.terim);
  }
});

test('yer: yalnız künyeli bot haberinde "<İl> merkezli"', () => {
  assert.equal(haberinIli({ girisim: 'egaranti', uretim: 'yapay-zeka', govde: 'İstanbul merkezli girişim büyüyor.' }), 'İstanbul');
  assert.equal(haberinIli({ uretim: 'yapay-zeka', govde: 'İstanbul merkezli girişim.' }), null);
  assert.equal(haberinIli({ girisim: 'x', uretim: 'yazi-isleri', govde: 'Ankara merkezli.' }), null);
  assert.equal(haberinIli({ girisim: 'x', uretim: 'yapay-zeka', govde: 'İstanbul’da bir etkinlik.' }), null);
  assert.equal(haberinIli({ girisim: 'x', uretim: 'yapay-zeka', govde: 'Büyükİzmir merkezli' }), null);
});

test('yer: çizim il noktasını kutunun içine koyar', () => {
  const sinir = JSON.parse(readFileSync(new URL('../data/turkiye-sinir.json', import.meta.url), 'utf8'));
  for (const il of Object.keys(ILLER)) {
    const c = haritaCiz(sinir, il);
    assert.ok(c.cx > 0 && c.cx < c.genislik && c.cy > 0 && c.cy < c.yukseklik, il);
    assert.match(c.yol, /^M[\d. L]+Z/);
  }
});
