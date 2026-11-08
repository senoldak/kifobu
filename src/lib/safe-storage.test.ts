import test from 'node:test';
import assert from 'node:assert/strict';
import { safeStorage } from './safe-storage.ts';

test('safeStorage: Node/penceresiz ortamda bellek içi (Map) yedeği çalışır', () => {
  safeStorage.clear();
  assert.equal(safeStorage.getItem('deneme'), null);

  safeStorage.setItem('deneme', 'deger');
  assert.equal(safeStorage.getItem('deneme'), 'deger');

  safeStorage.removeItem('deneme');
  assert.equal(safeStorage.getItem('deneme'), null);
});

test('safeStorage: window.localStorage SecurityError fırlattığında belleğe düşer', () => {
  safeStorage.clear();
  const sahtePencere = {
    get localStorage(): Storage {
      throw new Error('SecurityError: The operation is insecure.');
    },
  };
  (globalThis as unknown as { window: unknown }).window = sahtePencere;

  try {
    assert.doesNotThrow(() => safeStorage.setItem('anahtar', '123'));
    assert.equal(safeStorage.getItem('anahtar'), '123');
    assert.doesNotThrow(() => safeStorage.removeItem('anahtar'));
    assert.equal(safeStorage.getItem('anahtar'), null);
  } finally {
    delete (globalThis as unknown as { window?: unknown }).window;
  }
});

test('safeStorage: Safari Özel Dolaşma modunda (setItem kota hatası verir, getItem null döner) belleğe düşer ve okur', () => {
  safeStorage.clear();
  const sahtePencere = {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError: The quota has been exceeded.');
      },
      removeItem: () => {},
      clear: () => {},
    },
  };
  (globalThis as unknown as { window: unknown }).window = sahtePencere;

  try {
    assert.doesNotThrow(() => safeStorage.setItem('okuma-boyu', '1'));
    assert.equal(safeStorage.getItem('okuma-boyu'), '1');
    safeStorage.removeItem('okuma-boyu');
    assert.equal(safeStorage.getItem('okuma-boyu'), null);
  } finally {
    delete (globalThis as unknown as { window?: unknown }).window;
  }
});
