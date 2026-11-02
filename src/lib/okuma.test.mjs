import test from 'node:test';
import assert from 'node:assert/strict';
import { ilerleme, olcekDegeri, turkceSes } from './okuma.mjs';

test('olcekDegeri: geçerli değer kalır, öteki her şey 1', () => {
  for (const s of ['0', '1', '2', '3']) assert.equal(olcekDegeri(s), s);
  assert.equal(olcekDegeri(2), '2');
  for (const x of [null, undefined, '', '4', '-1', 'abc', '1.5', {}, NaN]) assert.equal(olcekDegeri(x), '1');
});

test('ilerleme: 0 ile 1 arası; boş metinde 0', () => {
  assert.equal(ilerleme(1000, 2000, 800), 0);
  assert.equal(ilerleme(-5000, 2000, 800), 1);
  assert.ok(Math.abs(ilerleme(0, 1000, 1000) - 0.6) < 1e-9);
  assert.equal(ilerleme(0, 0, 800), 0);
  assert.equal(ilerleme(0, NaN, 800), 0);
});

test('turkceSes: tr sesi bulunur, yoksa -1', () => {
  assert.equal(turkceSes([{ lang: 'en-US' }, { lang: 'tr-TR' }]), 1);
  assert.equal(turkceSes([{ lang: 'TR_tr' }]), 0);
  assert.equal(turkceSes([{ lang: 'en-US' }, { lang: 'tro' }]), -1);
  assert.equal(turkceSes([]), -1);
  assert.equal(turkceSes(undefined), -1);
  assert.equal(turkceSes([null, { lang: 'tr' }]), 1);
});
