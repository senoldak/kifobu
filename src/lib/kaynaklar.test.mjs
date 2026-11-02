import test from 'node:test';
import assert from 'node:assert/strict';
import { haberKaynaklari, kaynakSec, konuTutar } from './kaynaklar.mjs';

// Uydurma yayın adları ve adresleri (gerçek kaynaklar repoya yazılmaz).
const LISTE = [
  { ad: 'Örnek Haber Yatırım', gorunen: 'Örnek Haber' },
  { ad: 'Örnek Haber Girişim', gorunen: 'Örnek Haber' },
  { ad: 'Example News' },
  { ad: 'Gizli Yayın', goster: false },
];
const haber = { title: 'Plinto, pre-tohum turunda 2,9 milyon euro yatırım aldı', girisim: 'Plinto' };

test('konuTutar: adresteki sözcük başlıkta ya da girişim adında geçmeli; genel sözcükler sayılmaz', () => {
  assert.equal(konuTutar('https://haber.example.com/2026/10/plinto-raises-2-9m/', haber), true);
  assert.equal(konuTutar('https://news.example.org/seed-funding-round-million/', haber), false);
  assert.equal(konuTutar('bozuk adres', haber), false);
});

test('kaynakSec: tek kaynak her zaman gösterilir; çok kaynakta konusu tutmayan düşer', () => {
  assert.deepEqual(kaynakSec([{ ad: 'Example News', url: 'https://news.example.org/genel-bir-yazi/' }], LISTE, haber), [{ ad: 'Example News', url: 'https://news.example.org/genel-bir-yazi/' }]);
  const iki = kaynakSec(
    [{ ad: 'Example News', url: 'https://news.example.org/plinto-ai-agents/' }, { ad: 'Örnek Haber Yatırım', url: 'https://haber.example.com/baska-sirket-yatirim/' }],
    LISTE,
    haber,
  );
  assert.deepEqual(iki.map((k) => k.ad), ['Example News']);
});

test('kaynakSec: gösterme işaretli yayın çıkmaz; görünen ad kullanılır, aynı yayın iki kez yazılmaz; listede olmayan çıkmaz', () => {
  const r = kaynakSec(
    [
      { ad: 'Örnek Haber Yatırım', url: 'https://haber.example.com/plinto-1/' },
      { ad: 'Örnek Haber Girişim', url: 'https://haber.example.com/plinto-2/' },
      { ad: 'Gizli Yayın', url: 'https://gizli.example.net/plinto/' },
      { ad: 'Listede Yok', url: 'https://yok.example.net/plinto/' },
    ],
    LISTE,
    haber,
  );
  assert.deepEqual(r, [{ ad: 'Örnek Haber', url: 'https://haber.example.com/plinto-1/' }]);
});

test('kaynakSec: yalnız http(s) bağlantı', () => {
  assert.deepEqual(kaynakSec([{ ad: 'Example News', url: 'javascript:alert(1)' }], LISTE, haber), []);
});

test('haberKaynaklari: iz yoksa ya da çözülemezse boş (anahtarsız derlemede adsız satır kalır)', () => {
  assert.deepEqual(haberKaynaklari({ title: 'x' }), []);
  assert.deepEqual(haberKaynaklari({ title: 'x', kaynakIzi: 'v1.bozuk.iz' }), []);
});
