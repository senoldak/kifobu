import test from 'node:test';
import assert from 'node:assert/strict';
import { EN_COK_BAYT, istanbulGunu, yanitDogrula } from './dogrula.mjs';

const J = 'application/json';

test('yanitDogrula: geçerli yanıt', () => {
  assert.deepEqual(yanitDogrula('{"slug":"egaranti-yatirim","yanit":"evet"}', J), { tamam: true, slug: 'egaranti-yatirim', yanit: 'evet' });
  assert.deepEqual(yanitDogrula('{"slug":"a","yanit":"hayir"}', 'application/json; charset=utf-8'), { tamam: true, slug: 'a', yanit: 'hayir' });
});

test('yanitDogrula: yanlış tür, bozuk JSON, yabancı alan değeri reddedilir', () => {
  for (const [m, t] of [
    ['{"slug":"a","yanit":"evet"}', 'text/plain'],
    ['{"slug":"a","yanit":"evet"', J],
    ['[]', J],
    ['null', J],
    ['{"slug":"A B","yanit":"evet"}', J],
    ['{"slug":"../x","yanit":"evet"}', J],
    ['{"slug":"a","yanit":"belki"}', J],
    ['{"slug":"a"}', J],
    [`{"slug":"${'a'.repeat(161)}","yanit":"evet"}`, J],
    [`{"slug":"a","yanit":"evet","x":"${'y'.repeat(EN_COK_BAYT)}"}`, J],
  ]) assert.equal(yanitDogrula(m, t).tamam, false, m.slice(0, 40));
});

test('istanbulGunu: İstanbul saatiyle gün', () => {
  assert.equal(istanbulGunu(new Date('2026-11-02T21:30:00Z')), '2026-11-03');
  assert.equal(istanbulGunu(new Date('2026-11-02T20:59:00Z')), '2026-11-02');
});
