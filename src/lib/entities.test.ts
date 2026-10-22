import test from 'node:test';
import assert from 'node:assert/strict';
import { matchEntities, findEntities } from './entities.ts';

test('SPK matches on exact acronym and suffixes', () => {
  const result1 = matchEntities("SPK haftalık bülteninde yeni karar yayımlandı.");
  assert.equal(result1.some((e) => e.name === 'Sermaye Piyasası Kurulu'), true);

  const result2 = matchEntities("SPK'nın son tebliğine göre onay verildi.");
  assert.equal(result2.some((e) => e.name === 'Sermaye Piyasası Kurulu'), true);
});

test('SPK does NOT match false substring positives', () => {
  const result = matchEntities("Tarihsel bir inceleme: başpiskopos ve ruhban sınıfı.");
  assert.equal(result.some((e) => e.name === 'Sermaye Piyasası Kurulu'), false);
});

test('Kitle fonlaması and melek yatırımcı match properly', () => {
  const result = matchEntities("Paya dayalı kitle fonlama turuna katılan melek yatırımcılar girişimi destekledi.");
  assert.equal(result.some((e) => e.name === 'Kitle Fonlaması'), true);
  assert.equal(result.some((e) => e.name === 'Melek Yatırımcı'), true);
});

test('TÜBİTAK and Girişim Sermayesi match properly', () => {
  const result = matchEntities("TÜBİTAK destekli proje için girişim sermayesi fonu sağlandı.");
  assert.equal(result.some((e) => e.name === 'TÜBİTAK'), true);
  assert.equal(result.some((e) => e.name === 'Girişim Sermayesi'), true);
});

test('findEntities splits into about and mentions', () => {
  const res = findEntities("SPK, TÜBİTAK, kitle fonlama ve girişim sermayesi haberleri.");
  assert.equal(res.about.length, 2);
  assert.ok(res.mentions.length >= 1);
});
