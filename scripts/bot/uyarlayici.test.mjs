import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { adayYuku, adayiKur, gorulmeyen, uyarlayiciKur, yerelTur } from './uyarlayici.mjs';
import { anahtarlar, tamMetin } from './kaynaklar.mjs';
import { ozelAdlar } from './esleme.mjs';
import { havuzOlayi } from './havuz.mjs';
import { motorKimlik } from './motor.mjs';
import { gizliId } from './gizli.mjs';

mock.method(console, 'log', () => {});
mock.method(console, 'warn', () => {});

// Gerçek kaynak adları şifreli listede durur; testler uydurma adlarla çalışır.
const K1 = { ad: 'Birinci Kaynak', kisa: 'bir', akis: 'https://haber.example.com/bir.xml', kod: 'kodbir', yerli: true };
const K2 = { ad: 'Ikinci Kaynak', kisa: 'iki', akis: 'https://haber.example.com/iki.xml', kod: 'kodiki' };
const KAYNAKLAR = [K1, K2];
const SIMDI = new Date('2026-10-22T09:00:00Z');
const GUN = 86_400_000;
const tarihte = (gunOnce) => new Date(SIMDI.getTime() - gunOnce * GUN).toUTCString();

// Yalnız harflerden oluşan uydurma sözcükler: rakam, zaman ya da kaynak kopyası denetimine takılmaz.
const HECE = ['pek', 'lum', 'zan', 'rok', 'tis', 'yem', 'cuz', 'oluf', 'nab', 'esk'];
const uydur = (n, tohum = 5) => Array.from({ length: n }, (_, i) => `${HECE[(i * 7 + tohum) % 10]}${HECE[(i * 3 + tohum * 2) % 10]}${HECE[(i + tohum) % 10]}`).join(' ');

const BASLIK = 'Orionlab yeni kuantum cipini tanitti';
// Yazarın taslağı (kifobu biçimi): denetim sahte olduğundan gövde uzunluğu yalnız havuz testinde önemli.
const taslak = (ek = {}) => ({
  ayniOlay: true,
  uygun: true,
  neden: '',
  title: BASLIK,
  description: `${uydur(12, 1)}.`,
  body: `${uydur(300, 2)}.`,
  category: 'yatirimlar',
  why_matters: `${uydur(9, 3)}.`,
  key_points: [],
  ...ek,
});

const oge = (k, id, title, gunOnce = 0.2) => ({
  id: gizliId(`${k.kisa}:${id}`),
  guid: id,
  link: `https://haber.example.com/${id}`,
  title,
  description: 'ozet',
  pubDate: tarihte(gunOnce),
  kaynak: k,
});
const aday = (o, ek = {}) => ({ kimlik: motorKimlik(o.id), yuk: adayYuku(o), baslik: o.title, ...ek });
const bosDurum = () => ({ gorulen: {}, hatalar: {}, ayrik: {}, taranan: {}, ayni: {}, puan: {}, havuz: [] });
const sonucu = (sonuclar, o) => sonuclar.find((s) => s.kimlik === motorKimlik(o.id));

// Her çağrıyı kaydeden sahte bağımlılıklar; Gemini, ağ ve disk yok.
function kur({ durum = bosDurum(), bag = {}, ayar = {} } = {}) {
  const yazilan = [];
  const cagri = { taslak: 0, denetle: 0 };
  const u = uyarlayiciKur({
    rot: '.',
    durum,
    simdi: SIMDI,
    ayar: { baslangic: Date.now(), sureMs: 60_000, ...ayar },
    bag: {
      KAYNAKLAR,
      geminiVar: () => true,
      sonHaberler: async () => [],
      tamMetin: async (o) => uydur(200, o.id.length + 5),
      onbellekliEsle: async () => null,
      onbellekliPuanla: async (basliklar) => basliklar.map(() => 90),
      taslakYaz: async () => {
        cagri.taslak++;
        return taslak();
      },
      denetle: async (h) => {
        cagri.denetle++;
        return { haber: h, sorunlar: [], belirsiz: false };
      },
      derlemeYaz: async () => null,
      derlemeUzat: async (t) => t,
      haberYaz: async (_rot, paket) => {
        yazilan.push(paket);
        return `haber-${yazilan.length}`;
      },
      geminiPayiBitti: () => false,
      // Gerçek kapı standart.mjs/standart-akis testlerinde sınanır; burada sahte metinler kaynak benzerliğine takılmasın.
      standartKapisi: async () => ({ yayimla: true, std: { karar: 'temiz' }, yazildi: async () => {} }),
      ...bag,
    },
  });
  return { u, durum, yazilan, cagri };
}

test('adayYuku/adayiKur gidiş dönüş aynı öğeyi verir; yükte kaynak adı ve adresi yok', () => {
  const o = { ...oge(K1, 'a1', BASLIK), icerik: 'kisa akis icerigi' };
  const yuk = adayYuku(o);
  assert.equal(yuk.kaynak, 'kodbir');
  const geri = adayiKur(yuk, KAYNAKLAR);
  for (const alan of ['id', 'guid', 'link', 'title', 'description', 'icerik', 'pubDate']) assert.deepEqual(geri[alan], o[alan], alan);
  assert.equal(geri.baslik, o.title);
  assert.deepEqual(geri.anahtar, anahtarlar(o.title));
  assert.deepEqual(geri.adlar, ozelAdlar(o.title));
  assert.equal(geri.kaynak, K1);
  assert.equal(geri.tarih.valueOf(), new Date(o.pubDate).valueOf());
  const metin = JSON.stringify(yuk);
  assert.ok(!metin.includes('Birinci Kaynak'));
  assert.ok(!metin.includes('bir.xml'));
  const alanAdlari = metin.match(/https?:\/\/([^/"]+)/g).map((a) => a.replace(/^https?:\/\//, ''));
  assert.ok(alanAdlari.every((a) => a.endsWith('example.com')));
});

test('adayiKur: listede olmayan kod null', () => {
  const yuk = adayYuku(oge(K1, 'a1', BASLIK));
  assert.equal(adayiKur({ ...yuk, kaynak: 'yok-boyle-bir-kod' }, KAYNAKLAR), null);
});

test('adayYuku: çok uzun description/icerik/başlık olsa da yük JSON baytı 11000 baytın altında', () => {
  const uzun = 'Ğüşiöçİ '.repeat(5000);
  const o = { ...oge(K1, 'a1', uzun), description: uzun, icerik: uzun };
  const yuk = adayYuku(o);
  assert.ok(Buffer.byteLength(JSON.stringify(yuk)) < 11000, String(Buffer.byteLength(JSON.stringify(yuk))));
  assert.ok(yuk.icerik.length > 1000 && yuk.icerik.length <= 6000);
  assert.equal(adayiKur(yuk, KAYNAKLAR).icerik, yuk.icerik);
});

test('isle: yazılan olayın her üyesi yazildi, hiçbirinde yazi yok; gorulen işaretlenir', async () => {
  const { u, durum, yazilan } = kur();
  const a = oge(K1, 'a1', BASLIK);
  const b = oge(K2, 'b1', BASLIK);
  const sonuclar = await u.isle([aday(a), aday(b)]);
  assert.equal(yazilan.length, 1);
  assert.equal(sonuclar.length, 2);
  assert.ok(sonuclar.every((s) => s.yazi === undefined));
  assert.ok(sonuclar.every((s) => s.durum === 'yazildi' && s.slug === 'haber-1'));
  assert.ok(durum.gorulen[a.id] && durum.gorulen[b.id]);
  assert.equal(yazilan[0].draft, false);
  assert.equal(u.ozet.yazilan.length, 1);
});

test('isle: havuza alınan olay bekliyor/havuzda ve her üyesi uyeIdler içinde; sonraki turda eski ya da taze gelse işlenmez, havuz büyümez', async () => {
  const kisa = async (h) => ({ haber: h, sorunlar: ['Metin çok kısa: 120 kelime (en az 200)'], belirsiz: false });
  const { u, durum, cagri } = kur({ bag: { denetle: kisa } });
  const a = oge(K1, 'a1', BASLIK);
  const b = oge(K2, 'b1', BASLIK);
  const sonuclar = await u.isle([aday(a), aday(b)]);
  for (const o of [a, b]) {
    const s = sonucu(sonuclar, o);
    assert.deepEqual({ durum: s.durum, gerekce: s.gerekce, havuzda: s.havuzda }, { durum: 'bekliyor', gerekce: 'havuzda', havuzda: true });
    assert.ok(durum.gorulen[o.id]);
  }
  assert.equal(durum.havuz.length, 1);
  assert.deepEqual([...durum.havuz[0].uyeIdler].sort(), [a.id, b.id].sort());
  const cagriOnce = cagri.taslak;
  for (const eski of [true, false]) {
    const ikinci = await u.isle([aday(a, { eski }), aday(b, { eski })]);
    assert.deepEqual(ikinci, []);
    assert.equal(durum.havuz.length, 1);
    assert.equal(cagri.taslak, cagriOnce);
  }
});

test('isle: habere özgü hata Sonuc.hata içinde adres taşımaz', async () => {
  const { u } = kur({ bag: { taslakYaz: async () => { throw new Error('baglanti https://haber.example.com/x?k=1 koptu'); } } });
  const a = oge(K1, 'a1', BASLIK);
  const s = sonucu(await u.isle([aday(a)]), a);
  assert.equal(s.durum, 'bekliyor');
  assert.ok(s.hata instanceof Error);
  assert.ok(!s.hata.message.includes('haber.example.com'), s.hata.message);
});

test("isle: 3. hatada elendi, öncekilerde bekliyor + hata; hata ilk üyenin kimliğine sayılır", async () => {
  const hata = new Error('gecici sorun');
  const a = oge(K1, 'a1', BASLIK);
  for (const [onceki, beklenen] of [[0, 'bekliyor'], [1, 'bekliyor'], [2, 'elendi']]) {
    const durum = bosDurum();
    if (onceki) durum.hatalar[a.id] = { sayi: onceki };
    const { u } = kur({ durum, bag: { taslakYaz: async () => { throw hata; } } });
    const sonuclar = await u.isle([aday(a)]);
    const s = sonucu(sonuclar, a);
    assert.equal(s.durum, beklenen, `önceki ${onceki}`);
    assert.equal(durum.hatalar[a.id].sayi, onceki + 1);
    if (beklenen === 'bekliyor') {
      assert.equal(s.hata.message, hata.message);
      assert.equal(durum.gorulen[a.id], undefined);
    } else {
      assert.equal(s.gerekce, '3 denemede yazılamadı');
      assert.ok(durum.gorulen[a.id]);
    }
  }
});

test("isle: havuzdan düşen olay elendi 'kısa, eş bulunamadı'; gorulen zamanı değişmez", async () => {
  const durum = bosDurum();
  const iso = new Date(SIMDI.getTime() - 25 * 3600e3).toISOString(); // 24 saati doldu
  const olay = havuzOlayi({ id: 'bir:eski-olay', taslak: taslak(), basliklar: ['Eski olay basligi'], kaynaklar: [{ baslik: 'b', tarih: '2026-10-21', metin: 'x' }], kullanilan: [], iso });
  durum.havuz.push(olay);
  durum.gorulen['bir:eski-olay'] = 'onceki-zaman';
  const { u } = kur({ durum });
  const sonuclar = await u.isle([]);
  assert.deepEqual(sonuclar, [{ kimlik: motorKimlik('bir:eski-olay'), durum: 'elendi', gerekce: 'kısa, eş bulunamadı' }]);
  assert.equal(durum.havuz.length, 0);
  assert.equal(durum.gorulen['bir:eski-olay'], 'onceki-zaman');
});

test('isle: havuzdan düşen çok üyeli olayın her üyesi elendi', async () => {
  const durum = bosDurum();
  const iso = new Date(SIMDI.getTime() - 25 * 3600e3).toISOString();
  durum.havuz.push({ ...havuzOlayi({ id: 'bir:e1', taslak: taslak(), basliklar: ['x'], kaynaklar: [{ baslik: 'b', tarih: '2026-10-21', metin: 'x' }], kullanilan: [], iso }), uyeIdler: ['bir:e1', 'iki:e1b'] });
  const { u } = kur({ durum });
  const sonuclar = await u.isle([]);
  assert.deepEqual(sonuclar.map((s) => [s.kimlik, s.durum]), [['bir:e1', 'elendi'], ['iki:e1b', 'elendi']]);
  assert.ok(durum.gorulen['bir:e1'] && durum.gorulen['iki:e1b']);
});

test("isle: 4 günlük eski aday elendi 'bayat'; yasGun 3", async () => {
  const { u, cagri } = kur();
  const a = oge(K1, 'a1', BASLIK, 4);
  const sonuclar = await u.isle([aday(a, { eski: true })]);
  assert.deepEqual(sonuclar, [{ kimlik: motorKimlik(a.id), durum: 'elendi', gerekce: 'bayat (3 günü geçti)' }]);
  assert.equal(cagri.taslak, 0);
});

test("isle: kaynağı listeden çıkmış eski aday elendi 'kaynak listeden çıkarıldı'", async () => {
  const { u, durum } = kur();
  const a = oge(K1, 'a1', BASLIK);
  const yuk = { ...adayYuku(a), kaynak: 'silinmis-kod' };
  const sonuclar = await u.isle([{ kimlik: motorKimlik(a.id), yuk, eski: true }]);
  assert.deepEqual(sonuclar, [{ kimlik: motorKimlik(a.id), durum: 'elendi', gerekce: 'kaynak listeden çıkarıldı' }]);
  assert.ok(durum.gorulen[a.id]);
});

test("isle: mükerrer kalkanı yalnız takılan üyeyi eler (gorulen işaretli), gerisi yazılır", async () => {
  const durum = bosDurum();
  const { u, yazilan } = kur({
    durum,
    bag: { sonHaberler: async () => [{ slug: 'eski-haber', tarih: SIMDI.valueOf() - 3_600_000, category: 'yatirimlar', title: 'Zefirnet 450 milyon dolar yatirim aldi', description: 'ozet' }] },
  });
  const dup = oge(K1, 'd1', 'Zefirnet 450 milyon dolar yatirim aldi');
  const yeni = oge(K1, 'y1', BASLIK);
  const sonuclar = await u.isle([aday(dup), aday(yeni)]);
  const s = sonucu(sonuclar, dup);
  assert.equal(s.durum, 'elendi');
  assert.match(s.gerekce, /mükerrer kalkanı/);
  assert.ok(durum.gorulen[dup.id]);
  assert.equal(sonucu(sonuclar, yeni).durum, 'yazildi');
  assert.equal(yazilan.length, 1);
});

test("isle: yazılan başlık hafızadaki haberle aynı olayı anlatıyorsa elendi (tekrarMi)", async () => {
  const { u, yazilan, durum } = kur({
    bag: {
      sonHaberler: async () => [{ slug: 'eski-haber', tarih: SIMDI.valueOf() - 3_600_000, category: 'yatirimlar', title: 'Zefirnet 450 milyon dolar yatirim aldi', description: 'ozet' }],
      taslakYaz: async () => taslak({ title: 'Zefirnet 450 milyon dolar yatirim aldi' }),
    },
  });
  const a = oge(K1, 'a1', 'Birkac kelimeyle tamamen farkli bir kaynak basligi');
  const s = sonucu(await u.isle([aday(a)]), a);
  assert.equal(s.durum, 'elendi');
  assert.match(s.gerekce, /yazılan başlık/);
  assert.equal(yazilan.length, 0);
  assert.ok(durum.gorulen[a.id]);
});

test("isle: bilinen girişim (aynı yatırım zaten yazıldı) elendi", async () => {
  const { u, yazilan } = kur({
    bag: {
      sonHaberler: async () => [{ slug: 'eski', tarih: SIMDI.valueOf() - 5 * GUN, category: 'yatirimlar', title: 'Baska bir baslik', description: 'ozet', girisim: 'Orionlab' }],
      taslakYaz: async () => taslak({ girisim: 'Orionlab', toplanan: 1000 }),
    },
  });
  const a = oge(K1, 'a1', BASLIK);
  const s = sonucu(await u.isle([aday(a)]), a);
  assert.equal(s.durum, 'elendi');
  assert.match(s.gerekce, /aynı yatırım zaten yazıldı/);
  assert.equal(yazilan.length, 0);
});

test('isle: kapsam dışı (0) ve düşük değer (< 60) elendi; puanlanamayan yazılmaz ve işaretlenmez', async () => {
  const durum = bosDurum();
  const { u, yazilan } = kur({ durum, bag: { onbellekliPuanla: async (basliklar) => basliklar.map((b) => (b.includes('Kapsamdisi') ? 0 : b.includes('Dusukdeger') ? 40 : b.includes('Puansiz') ? undefined : 90)) } });
  const kd = oge(K1, 'k1', 'Kapsamdisi alakasiz bir sey yaşandi');
  const dd = oge(K1, 'd1', 'Dusukdeger kucuk bir gelisme oldu');
  const ps = oge(K1, 'p1', 'Puansiz kalan baska bir olay anlatildi');
  const ok = oge(K1, 'o1', BASLIK);
  const sonuclar = await u.isle([aday(kd), aday(dd), aday(ps), aday(ok)]);
  assert.equal(sonucu(sonuclar, kd).gerekce, 'kapsam dışı');
  assert.match(sonucu(sonuclar, dd).gerekce, /^düşük haber değeri \(40/);
  assert.equal(sonucu(sonuclar, ps), undefined);
  assert.equal(durum.gorulen[ps.id], undefined);
  assert.equal(sonucu(sonuclar, ok).durum, 'yazildi');
  assert.equal(yazilan.length, 1);
});

test('isle: puanlama hatası: hiçbir şey yazılmaz, hiçbir olay işaretlenmez, Sonuc yok', async () => {
  const { u, yazilan, cagri, durum } = kur({ bag: { onbellekliPuanla: async () => { throw new Error('kota'); } } });
  const a = oge(K1, 'a1', BASLIK);
  const sonuclar = await u.isle([aday(a)]);
  assert.deepEqual(sonuclar, []);
  assert.equal(yazilan.length, 0);
  assert.equal(cagri.taslak, 0);
  assert.equal(durum.gorulen[a.id], undefined);
});

test("isle: kaynak metni 180 kelimenin altında elendi", async () => {
  const { u, cagri } = kur({ bag: { tamMetin: async () => uydur(150, 3) } });
  const a = oge(K1, 'a1', BASLIK);
  const s = sonucu(await u.isle([aday(a)]), a);
  assert.equal(s.durum, 'elendi');
  assert.match(s.gerekce, /kaynak metni kısa/);
  assert.equal(cagri.taslak, 0);
});

test("isle: uygun değil elendi", async () => {
  const { u, yazilan } = kur({ bag: { taslakYaz: async () => taslak({ uygun: false, neden: 'kapsam disi' }) } });
  const a = oge(K1, 'a1', BASLIK);
  const s = sonucu(await u.isle([aday(a)]), a);
  assert.equal(s.durum, 'elendi');
  assert.match(s.gerekce, /^uygun değil/);
  assert.equal(yazilan.length, 0);
});

test('isle: denetimden geçemeyen (uzunluk dışı) olay elendi; havuza girmez', async () => {
  const { u, durum, yazilan } = kur({ bag: { denetle: async (h) => ({ haber: h, sorunlar: ['Rakam kaynakta yok: 42'], belirsiz: false }) } });
  const a = oge(K1, 'a1', BASLIK);
  const s = sonucu(await u.isle([aday(a)]), a);
  assert.equal(s.durum, 'elendi');
  assert.match(s.gerekce, /denetimden geçemedi/);
  assert.equal(durum.havuz.length, 0);
  assert.equal(yazilan.length, 0);
  assert.ok(durum.gorulen[a.id]);
});

test('isle: denetim belirsiz (tamamlanamadı): Sonuc yok, gorulen işaretli değil, yazılmaz', async () => {
  const { u, durum, yazilan } = kur({ bag: { denetle: async (h) => ({ haber: h, sorunlar: ['Denetim tamamlanamadı'], belirsiz: true }) } });
  const a = oge(K1, 'a1', BASLIK);
  const sonuclar = await u.isle([aday(a)]);
  assert.deepEqual(sonuclar, []);
  assert.equal(durum.gorulen[a.id], undefined);
  assert.equal(yazilan.length, 0);
  assert.equal(u.ozet.hata.length, 1);
});

test('isle: kırmızı standart elendi, gerekçe standart gerekçesi', async () => {
  const { u, yazilan, durum } = kur({ bag: { standartKapisi: async () => ({ yayimla: false, std: { gerekce: 'standart:kirmizi:test' }, yazildi: async () => {} }) } });
  const a = oge(K1, 'a1', BASLIK);
  const s = sonucu(await u.isle([aday(a)]), a);
  assert.deepEqual({ durum: s.durum, gerekce: s.gerekce }, { durum: 'elendi', gerekce: 'standart:kirmizi:test' });
  assert.equal(yazilan.length, 0);
  assert.ok(durum.gorulen[a.id]);
});

test('isle: "aynı olay değil" olay üyelere bölünür, her biri ayrı yazılır, çift ayrik kaydedilir', async () => {
  let n = 0;
  const { u, yazilan, durum } = kur({
    bag: {
      taslakYaz: async () => (++n === 1 ? taslak({ ayniOlay: false, neden: 'farkli olaylar' }) : taslak({ title: `Baslik ${n} orionlab` })),
    },
  });
  const a = oge(K1, 'a1', BASLIK);
  const b = oge(K2, 'b1', BASLIK);
  const sonuclar = await u.isle([aday(a), aday(b)]);
  assert.equal(yazilan.length, 2);
  assert.ok(sonuclar.every((s) => s.durum === 'yazildi'));
  assert.equal(Object.keys(durum.ayrik).length, 1);
});

test('isle: Gemini anahtarı yoksa mükerrer/hafıza ön elemesi çalışır ama hiçbir şey yazılmaz', async () => {
  const { u, yazilan, cagri } = kur({ bag: { geminiVar: () => false } });
  const a = oge(K1, 'a1', BASLIK);
  const sonuclar = await u.isle([aday(a)]);
  assert.deepEqual(sonuclar, []);
  assert.equal(yazilan.length, 0);
  assert.equal(cagri.taslak, 0);
});

test("isle: ayar hatası fırlatılır, e.sonuclar o ana kadarki yazildi'yi içerir; havuz yine de çalışır", async () => {
  let n = 0;
  const { u } = kur({
    bag: {
      taslakYaz: async () => {
        if (++n === 2) throw Object.assign(new Error('anahtar gecersiz'), { ayar: true });
        return taslak();
      },
    },
  });
  const a = oge(K1, 'a1', BASLIK, 0.1); // daha yeni: önce işlenir
  const b = oge(K1, 'b1', 'Zefirnet baska bir modelini acikladi', 0.3);
  await assert.rejects(
    () => u.isle([aday(a), aday(b)]),
    (e) => {
      assert.equal(e.ayar, true);
      assert.equal(e.sonuclar.length, 1);
      assert.equal(e.sonuclar[0].durum, 'yazildi');
      assert.equal(e.sonuclar[0].kimlik, motorKimlik(a.id));
      return true;
    },
  );
  assert.equal(u.ozet.hata.length, 1); // ayar hatası habere sayılmaz
});

test('isle: havuzdan derleme yazılınca her olayın üyeleri yazildi, hiçbirinde yazi yok; üyelerin gorulen zamanı değişmez', async () => {
  const durum = bosDurum();
  const olay = (id, iso, uyeIdler) => ({
    ...havuzOlayi({ id, taslak: taslak(), basliklar: [`Baslik ${id}`], kaynaklar: [{ baslik: 'b', tarih: '2026-10-22', metin: uydur(60, 3) }], kullanilan: [], iso }),
    uyeIdler,
  });
  durum.havuz.push(olay('bir:e1', '2026-10-22T06:40:00.000Z', ['bir:e1', 'iki:e1b']), olay('bir:e2', '2026-10-22T06:30:00.000Z', ['bir:e2'])); // açılış dilimi (06-12 İstanbul) bitti
  for (const id of ['bir:e1', 'iki:e1b', 'bir:e2']) durum.gorulen[id] = 'onceki';
  const { u, yazilan } = kur({ durum, bag: { derlemeYaz: async () => taslak({ title: 'Orionlab ve Zefirnet haftalik gelisme ozeti' }) } });
  const sonuclar = await u.isle([]);
  assert.equal(yazilan.length, 1);
  assert.match(yazilan[0].title, /Orionlab ve Zefirnet haftalik gelisme ozeti · /);
  assert.equal(durum.havuz.length, 0);
  assert.equal(sonuclar.length, 3);
  assert.ok(sonuclar.every((s) => s.durum === 'yazildi' && s.slug === 'haber-1' && s.yazi === undefined));
  assert.ok(['bir:e1', 'iki:e1b', 'bir:e2'].every((id) => durum.gorulen[id] === 'onceki'));
});

test("yerelTur: yalnız karar verilen üyeler gorulen'e işaretlenir; puanlanamayan işaretlenmez; taranan nesne kaydı", async () => {
  const beslemeler = {
    [K1.akis]: [oge(K1, 'a1', BASLIK, 0.1), oge(K1, 'b1', 'Zefirnet baska bir modelini acikladi', 0.3)],
    [K2.akis]: [],
  };
  const durum = bosDurum();
  const eskiGorulen = oge(K1, 'g0', 'Daha once karar verilmis haber basligi');
  durum.gorulen[eskiGorulen.id] = 'x';
  beslemeler[K1.akis].push(eskiGorulen);
  const { u } = kur({
    durum,
    bag: {
      hentTekst: async (akis) => akis,
      rssOku: (akis) => beslemeler[akis].map(({ kaynak, id, ...o }) => o),
      onbellekliPuanla: async (basliklar) => basliklar.map((_, i) => (i === 0 ? 90 : undefined)), // ilki puanlanır, ikincisi puanlanamaz
    },
  });
  const { sonuclar, ayarHatasi } = await yerelTur(u, durum);
  assert.equal(ayarHatasi, null);
  assert.equal(sonuclar.length, 1);
  assert.equal(sonuclar[0].durum, 'yazildi');
  const kimlikA = gizliId(`${K1.kisa}:a1`);
  const kimlikB = gizliId(`${K1.kisa}:b1`);
  assert.ok(durum.gorulen[kimlikA]);
  assert.equal(durum.gorulen[kimlikB], undefined);
  assert.equal(durum.gorulen[eskiGorulen.id], 'x');
  assert.deepEqual(Object.keys(durum.taranan[kimlikA]).sort(), ['kod', 'yerli', 'zaman']);
  assert.equal(durum.taranan[kimlikA].kod, 'kodbir');
  assert.ok(durum.taranan[kimlikB]);
});

test('yerelTur: ayar hatası ayarHatasi olarak döner, o ana kadarki karar işaretlenir', async () => {
  let n = 0;
  const durum = bosDurum();
  const a = oge(K1, 'a1', BASLIK, 0.1);
  const b = oge(K1, 'b1', 'Zefirnet baska bir modelini acikladi', 0.3);
  const { u } = kur({
    durum,
    bag: {
      hentTekst: async (akis) => akis,
      rssOku: (akis) => (akis === K1.akis ? [a, b] : []).map(({ kaynak, id, ...o }) => o),
      taslakYaz: async () => {
        if (++n === 2) throw Object.assign(new Error('anahtar'), { ayar: true });
        return taslak();
      },
    },
  });
  const { sonuclar, ayarHatasi } = await yerelTur(u, durum);
  assert.equal(ayarHatasi?.ayar, true);
  assert.equal(sonuclar.length, 1);
  assert.ok(durum.gorulen[a.id]);
  assert.equal(durum.gorulen[b.id], undefined);
});

test('gorulmeyen: gorulen kayıtlı adayları eler', () => {
  const a = oge(K1, 'a1', 'x y z w');
  const b = oge(K1, 'b1', 'x y z w');
  const durum = { gorulen: { [a.id]: '2026-10-22T00:00:00Z' } };
  assert.deepEqual(gorulmeyen([aday(a), aday(b)], durum).map((x) => x.yuk.id), [b.id]);
});

test("isle: eski aday akış içeriğini taşır; sayfa okunamasa da 'kaynak metni kısa' ile elenmez, yazılır", async () => {
  const kaynakMetin = uydur(220, 9);
  const o = { ...oge(K1, 'a1', BASLIK), icerik: kaynakMetin };
  const eski = aday(o, { eski: true });
  eski.yuk = JSON.parse(JSON.stringify(eski.yuk)); // yük depodan gelir: yalnız JSON
  const { u, yazilan } = kur({ bag: { tamMetin, hentTekst: async () => { throw new Error('ag yok'); } } });
  const sonuclar = await u.isle([eski]);
  assert.equal(yazilan.length, 1);
  assert.equal(sonucu(sonuclar, o).durum, 'yazildi');
});

// Yerel eşitlik: bugünkü calistir.mjs akışının bilinen sonucu. Aynı sahte bağımlılıklarla tek tur, beklenen yazılar ve durum farkı.
test('yerel eşitlik: karışık tur bugünkü akışın yazı ve durum sonucunu verir', async () => {
  const mukerrer = oge(K1, 'm1', 'Zefirnet 450 milyon dolar yatirim aldi');
  const yazilacak = oge(K1, 'y1', BASLIK, 0.1);
  const dusuk = oge(K1, 'd1', 'Dusukdeger kucuk bir gelisme oldu', 0.15);
  const puansiz = oge(K1, 'p1', 'Puansiz kalan baska bir olay anlatildi', 0.16);
  const hatali = oge(K2, 'h1', 'Hatali olay yazilirken sorun cikti', 0.17);
  const eskiKarar = oge(K2, 'e1', 'Daha once karar verilmis haber basligi', 0.18);
  const beslemeler = { [K1.akis]: [mukerrer, yazilacak, dusuk, puansiz], [K2.akis]: [hatali, eskiKarar] };
  const durum = bosDurum();
  durum.gorulen[eskiKarar.id] = 'x';
  durum.hatalar[hatali.id] = { sayi: 1 };
  const { u, yazilan } = kur({
    durum,
    bag: {
      hentTekst: async (akis) => akis,
      rssOku: (akis) => beslemeler[akis].map(({ kaynak, id, ...o }) => o),
      sonHaberler: async () => [{ slug: 'eski-haber', tarih: SIMDI.valueOf() - 3_600_000, category: 'yatirimlar', title: 'Zefirnet 450 milyon dolar yatirim aldi', description: 'ozet' }],
      onbellekliPuanla: async (basliklar) => basliklar.map((b) => (b.includes('Dusukdeger') ? 40 : b.includes('Puansiz') ? undefined : 90)),
      taslakYaz: async (kaynaklar) => {
        if (kaynaklar[0].baslik.startsWith('Hatali')) throw new Error('gecici');
        return taslak();
      },
    },
  });
  const { sonuclar } = await yerelTur(u, durum);
  assert.equal(yazilan.length, 1);
  assert.equal(yazilan[0].title, BASLIK);
  assert.equal(yazilan[0].category, 'yatirimlar');
  assert.equal(yazilan[0].draft, false);
  assert.deepEqual(Object.keys(durum.gorulen).sort(), [mukerrer.id, yazilacak.id, dusuk.id, eskiKarar.id].sort());
  assert.equal(durum.gorulen[eskiKarar.id], 'x');
  assert.equal(durum.hatalar[hatali.id].sayi, 2);
  assert.equal(durum.hatalar[yazilacak.id], undefined);
  assert.equal(Object.keys(durum.taranan).length, 6);
  assert.equal(sonuclar.length, 4); // mükerrer, düşük değer, yazılan, hatalı (bekliyor); puansız ve önceden karar verilen yok
  assert.deepEqual(u.ozet.yazilan, [BASLIK]);
  assert.equal(u.ozet.hata.length, 1);
});
