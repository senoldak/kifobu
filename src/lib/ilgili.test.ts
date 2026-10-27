import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EN_AZ_KELIME } from './indeks.ts';
import { ilgiliHaberler, yatirimciListesi, type IlgiliAday } from './ilgili.ts';

const govde = Array.from({ length: EN_AZ_KELIME }, (_, i) => `kelime${i}`).join(' ');
let gun = 1;
const h = (id: string, data: Partial<IlgiliAday['data']> = {}, body = govde): IlgiliAday => ({
  id,
  body,
  data: { category: 'yatirimlar', date: new Date(Date.UTC(2026, 9, gun++)), ...data },
});

test('yatırımcı listesi ayrılır, genel ifadeler atılır', () => {
  assert.deepEqual(yatirimciListesi('Örnek Ventures, Deneme Capital ve melek yatırımcılar'), ['örnek ventures', 'deneme capital']);
  assert.deepEqual(yatirimciListesi(undefined), []);
});

test('ortak varlığı olan haber önce gelir; bülten, noindex ve haberin kendisi önerilmez', () => {
  const ana = h('ana', { girisim: 'Örnek', yatirimcilar: 'Deneme Capital' });
  const ayniGirisim = h('ayni-girisim', { girisim: 'örnek', category: 'girisimler' });
  const ortakYatirimci = h('ortak-yatirimci', { yatirimcilar: 'Başka Fon, Deneme Capital' });
  const bulten = h('bulten', { girisim: 'Örnek', category: 'gunluk-bulten' });
  const kapali = h('kapali', { girisim: 'Örnek', noindex: true });
  const kisa = h('kisa', { girisim: 'Örnek' }, 'kısa metin');
  const ayniBolum = h('ayni-bolum');
  const sonuc = ilgiliHaberler(ana, [ana, ayniGirisim, ortakYatirimci, bulten, kapali, kisa, ayniBolum]).map((x) => x.id);
  assert.deepEqual(sonuc, ['ayni-girisim', 'ortak-yatirimci', 'ayni-bolum']);
});

test('ortak varlık yoksa aynı bölümün en yeni haberleri', () => {
  const ana = h('ana2');
  const eski = h('eski');
  const yeni = h('yeni');
  const baska = h('baska', { category: 'mevzuat' });
  assert.deepEqual(ilgiliHaberler(ana, [ana, eski, yeni, baska], 2).map((x) => x.id), ['yeni', 'eski']);
});

// Gemini Faz 2 (27 Ekim): anlam benzerliği. Sahte anlam: kimlik çiftine göre benzerlik.
const anlamIle = (tablo: Record<string, number>) => (a: IlgiliAday, b: IlgiliAday) => tablo[`${a.id}|${b.id}`] ?? null;
const kurB = () => {
  const ana = h('anaB', { category: 'yatirimlar' });
  return { ana, tum: [ana, h('y1', { category: 'yatirimlar' }), h('g1', { category: 'girisimler' }), h('y2', { category: 'yatirimlar' }), h('bltn', { category: 'gunluk-bulten' })] };
};

test('anlam yoksa bugünkü sıra birebir', () => {
  const { ana, tum } = kurB();
  assert.deepEqual(ilgiliHaberler(ana, tum, 3, () => null).map((x) => x.id), ilgiliHaberler(ana, tum, 3).map((x) => x.id));
});

test('anlamca yakın haber ortak varlığı olmasa da öne gelir; bülten yine çıkmaz; düşük benzerlik etkisiz', () => {
  const { ana, tum } = kurB();
  assert.equal(ilgiliHaberler(ana, tum, 3, anlamIle({ 'anaB|g1': 0.9 }))[0].id, 'g1');
  assert.ok(!ilgiliHaberler(ana, tum, 4, anlamIle({ 'anaB|bltn': 0.95 })).some((x) => x.id === 'bltn'));
  assert.deepEqual(ilgiliHaberler(ana, tum, 3, anlamIle({ 'anaB|g1': 0.5 })).map((x) => x.id), ilgiliHaberler(ana, tum, 3).map((x) => x.id));
});
