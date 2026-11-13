import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ozetKayitlari, ozetSayfasi } from './gunun-ozeti.ts';

const kayit = (tarih: string, kimlikler: string[] = []) => ({ tarih, paragraf: 'P.', kimlikler, yazan: 'gemini' as const, olusturma: `${tarih}T17:45:00Z` });
const h = (id: string, saat: string) => ({ id, data: { title: `Başlık ${id}`, date: new Date(`2026-11-13T${saat}:00+03:00`) } });

test('ozetKayitlari: glob modülünden en yeni önce', () => {
  const m = { '/src/data/gunun-ozeti/2026-11-12.json': kayit('2026-11-12'), '/src/data/gunun-ozeti/2026-11-13.json': kayit('2026-11-13') };
  assert.deepEqual(ozetKayitlari(m).map((k) => k.tarih), ['2026-11-13', '2026-11-12']);
  assert.deepEqual(ozetKayitlari({}), []);
});

test('ozetSayfasi: başlık, kapak sırası (paragraftakiler önce, kalanlar yayın sırasıyla), toplam', () => {
  // gunler.ts haberleri en yeniden eskiye verir.
  const gun = { haberler: [h('c', '18:20'), h('b', '12:20'), h('a', '06:20')], bultenler: [h('sabah', '09:00')] };
  const s = ozetSayfasi(kayit('2026-11-13', ['b', 'yok']), gun);
  assert.equal(s.baslik, 'Günün Özeti · 13 Kasım 2026');
  assert.equal(s.tarihAd, '13 Kasım 2026');
  assert.deepEqual(s.kapakBasliklari, ['Başlık b', 'Başlık a', 'Başlık c']);
  assert.equal(s.toplam, 3);
  assert.deepEqual(s.bultenler.map((x) => x.id), ['sabah']);
  assert.deepEqual(ozetSayfasi(kayit('2026-11-14'), undefined).toplam, 0);
});
