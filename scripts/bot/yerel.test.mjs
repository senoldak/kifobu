import { test } from 'node:test';
import assert from 'node:assert/strict';

// Yayın adları koda yazılmaz; testte uydurma adlar ortam değişkeniyle verilir (modüller ondan sonra yüklenir).
process.env.MEDYA_ADLARI = JSON.stringify(['Örnek Haber', 'Ajans Örnek', 'Gazete Örnek']);
const { yerelDuzelt, ilgiliKisim } = await import('./yerel.mjs');
const { zamanKontrol, medyaKontrol } = await import('./denetci.mjs');

const h = (body, title = 'Başlık', description = 'Spot.') => ({ title, description, body });

test('göreli zaman cümle ortasından çıkar, boşluk toparlanır', () => {
  const r = yerelDuzelt(h('Şirket bugün 5 milyon dolar yatırım aldığını açıkladı.'));
  assert.equal(r.body, 'Şirket 5 milyon dolar yatırım aldığını açıkladı.');
  assert.deepEqual(zamanKontrol(r.body), []);
});

test('cümle başındaki kelime çıkınca ilk harf büyür', () => {
  const r = yerelDuzelt(h('Tur kapandı. Bugün şirket yeni ofisini açtı.'));
  assert.equal(r.body, 'Tur kapandı. Şirket yeni ofisini açtı.');
  assert.equal(yerelDuzelt(h('Bu hafta tur kapandı.')).body, 'Tur kapandı.');
});

test('tırnak içi değişmez', () => {
  const metin = "Kurucu “Bugün büyük bir gün, Ajans Örnek'e göre de öyle” dedi.";
  assert.equal(yerelDuzelt(h(metin)).body, metin);
});

test('yayın kuruluşu atfı çıkar, başka kullanım kalır', () => {
  assert.equal(yerelDuzelt(h("Örnek Haber'in haberine göre, şirket 2 milyon dolar topladı.")).body, 'Şirket 2 milyon dolar topladı.');
  assert.equal(yerelDuzelt(h("Tur, Ajans Örnek'e göre 10 milyon dolar.")).body, 'Tur, 10 milyon dolar.');
  const r = yerelDuzelt(h('Gazete Örnek ile görüşen kurucu bilgi verdi.'));
  assert.equal(r.body, 'Gazete Örnek ile görüşen kurucu bilgi verdi.');
  assert.equal(medyaKontrol(r.body).length, 1);
});

test('sorun yoksa metin aynen kalır', () => {
  const x = h('Şirket 1.250 kullanıcıya ulaştı.');
  assert.deepEqual(yerelDuzelt(x), x);
});

test('ilgiliKisim: kısa kaynak aynen döner', () => {
  assert.equal(ilgiliKisim('kısa kaynak', 'taslak', 1000), 'kısa kaynak');
});

test('ilgiliKisim: rakam eşleşmesi geç paragrafı çeker, sıra korunur', () => {
  const dolgu = (i) => `Dolgu paragrafı ${i} ` + 'lorem ipsum dolor sit amet '.repeat(30);
  const parcalar = ['Açılış: Acme Teknoloji yatırım turunu duyurdu. ' + 'giriş '.repeat(40)];
  for (let i = 0; i < 30; i++) parcalar.push(dolgu(i));
  parcalar.push('Turda toplam 1,250,000 dolar toplandı ve değerleme açıklanmadı.');
  const kaynak = parcalar.join('\n\n');
  const r = ilgiliKisim(kaynak, 'Acme 1.250.000 dolar topladı.', 3000);
  assert.ok(r.length <= 3000);
  assert.ok(r.startsWith('Açılış'));
  assert.ok(r.includes('1,250,000'));
  assert.ok(r.includes('[…]'));
  assert.ok(r.indexOf('Açılış') < r.indexOf('1,250,000'));
});

test('ilgiliKisim: tırnaklı alıntı paragrafı seçilir', () => {
  const parcalar = ['Baş. ' + 'a '.repeat(800)];
  for (let i = 0; i < 20; i++) parcalar.push(`Paragraf ${i} ` + 'b '.repeat(400));
  parcalar.push('Kurucu şöyle dedi: hedefimiz Avrupa pazarında büyümek ve ekibi genişletmek.');
  const r = ilgiliKisim(parcalar.join('\n\n'), 'Kurucu “hedefimiz Avrupa pazarında büyümek” dedi.', 4000);
  assert.ok(r.includes('hedefimiz Avrupa pazarında'));
});

test('yerelDuzelt: alıntıdan sonraki kelime büyütülmez', () => {
  const h = yerelDuzelt({ title: 't', description: 'd', body: 'Acme dün açıkladı. Kurucu “bugün mutluyuz” dedi.' });
  assert.equal(h.body, 'Acme açıkladı. Kurucu “bugün mutluyuz” dedi.');
});

test('medyaGizle loga giden satırdaki yayın adlarını gizler', async () => {
  const { medyaGizle } = await import('./yerel.mjs');
  assert.equal(medyaGizle('Yayın kuruluşu adı geçiyor (Ajans Örnek, Gazete Örnek)'), 'Yayın kuruluşu adı geçiyor ([yayın], [yayın])');
});
