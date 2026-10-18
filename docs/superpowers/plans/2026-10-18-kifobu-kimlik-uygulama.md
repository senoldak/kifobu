# kifobu Kimlik v2 Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BRAND.md` (Kimlik v2) kararlarını sitede, kapaklarda, 18:00 bülteni görselinde ve marka dosyalarında uygulamak; içerik, yapı ve veri akışı değişmeden.

**Architecture:** Önce ortak temel (Schibsted Grotesk, renk belirteçleri, tohum işareti bileşeni, rakam ve çubuk yardımcıları), sonra her yüzey ayrı görevde yeniden giydirilir. Her görev kendi başına yayına alınabilir; görevler arasında site yarım kimlikte kalabileceği için Görev 2–4 aynı gün art arda yayınlanır.

**Tech Stack:** Astro (statik), saf CSS, sharp + fontkitten (kapak ve bülten SVG→PNG, yazı glif yolu), Node test runner (`npm test`).

**Spec:** `BRAND.md` (aynı depo, sürüm 2). Görsel örnekler: https://claude.ai/artifact/LHkwRvtjDVWaJZQFWJv3X7

## Global Constraints

- Yazı: yalnız **Schibsted Grotesk** (SIL OFL), kendi sunucumuzda; CSP `font-src 'self'` değişmez.
- Marka renkleri: kâğıt `#f7f5ef`, mürekkep `#141a17`, ayçiçeği sarısı `#e8b40c` (tek marka rengi), gri `#5d645f`, çizgi `#dcd9cf`.
- Veri renkleri: fonlandı yeşili `#10b981`, aşım yeşili `#a7e9cf`, platform renkleri bülten verisinden (`src/data/bulten.ts` `platformlar.liste[].renk`).
- Sarı veri rengi, yeşil marka rengi olarak kullanılmaz. Kırmızı-yeşil karşıtlığı yok.
- `tabular-nums` yalnız alt alta hizalanan rakamlarda; başlıkta ve büyük rakamda asla.
- Para: görselde/tabloda simge önde boşluksuz (`₺4.250.000`, `₺4,25 milyon`); düz metinde birim arkada (`4,25 milyon TL`). Yüzde iki ondalık, **kesilerek** (`%99,996 → %99,99`).
- Mevcut sayfalarda **yeni blok eklenmez**; bölümler, sütunlar, metinler ve sıra aynı kalır.
- 18:00 bülteni görselinde yapı, kartlar, platform renkleri, yüzde rozetleri ve `17 Ekim 2026 / 1530` yazımı **aynen** kalır.
- Resmî olmayan haber kaynaklarının adı hiçbir dosyaya, teste, commit mesajına yazılmaz (`AGENTS.md`).
- Windows'ta `npm install` çalıştırılmaz (lockfile `@emnapi` düşer); yeni bağımlılık eklenmez.
- Fotoğraf, doku, gölge, degrade yok. Site yalnız açık tema (benim kararım; bkz. Görev 2).

## Review Focus

- **Hedefi tam tutturan ve aşan kampanya:** `%100,00` ve `%163,50` çubukları; hedef çizgisi %100 noktasında, aşım açık yeşil. → Görev 1 testleri.
- **Yüzde kesme sınırı:** `99.996` asla `%100,00` olmaz; `100` tam `%100,00` olur. → Görev 1 testi.
- **Eksik künye verisi:** `hedef` ya da `toplanan` olmayan kampanya haberi rakamsız haber kapağına düşer; olmayan hücre (değerleme, bitiş) uydurulmaz, gösterilmez. → Görev 5 testi.
- **Uzun başlık ve uzun girişim adı:** kapakta satıra sığmayan metin alttaki öğelerin üstüne binmez (satır sayısına göre aşağı kayar ya da punto küçülür). → Görev 5 testi.
- **Türkçe büyük harf:** etiket ve kategori `toLocaleUpperCase('tr-TR')` ile (`girişimler → GİRİŞİMLER`, `i → İ`). → Görev 5 testi.

---

### Görev 1: Ortak yardımcılar — rakam, yüzde, hedef çubuğu, tohum işareti

**Files:**
- Create: `src/lib/kimlik.ts`
- Create: `src/lib/kimlik.test.ts`
- Modify: `scripts/marka/tohum-isaret.mjs` (işaret hesabını `src/lib/kimlik.ts`'ten kullanacak biçimde inceltme; çıktı dosyaları bayt bayt aynı kalmalı)

**Interfaces:**
- Produces:
  - `KIMLIK` sabiti: `{ kagit, murekkep, sari, gri, cizgi, yesil, asim }` (Global Constraints'teki hex değerleri)
  - `yuzdeKesik(n: number | null): string` → `'%96,27'`; null/NaN → `'—'`
  - `cubukOlcegi(yuzde: number): { dolu: number; asim: number; hedef: number }` — üçü de 0–100 arası yüzde genişlik
  - `tohumIsaretiSvg(opts: { boyut: number; zemin?: 'acik' | 'koyu'; kucuk?: boolean }): string` — 233 (küçükte 89) tohum, `i % 21 === 0` sarı ve 1,55×
  - `durumEtiketi(durum: Durum | undefined): { metin: string; tur: 'cerceve' | 'yesil' | 'murekkep' | 'gri' } | null`

- [ ] **Step 1: Testleri yaz** (`src/lib/kimlik.test.ts`)

```ts
test('yüzde iki ondalık ve kesilerek', () => {
  assert.equal(yuzdeKesik(96.2799), '%96,27');
  assert.equal(yuzdeKesik(99.996), '%99,99');
  assert.equal(yuzdeKesik(100), '%100,00');
  assert.equal(yuzdeKesik(112.4), '%112,40');
  assert.equal(yuzdeKesik(null), '—');
});
test('çubuk: hedef çizgisi %100 noktasında, aşım ayrı', () => {
  assert.deepEqual(cubukOlcegi(71.02), { dolu: 71.02, asim: 0, hedef: 100 });
  assert.deepEqual(cubukOlcegi(100), { dolu: 100, asim: 0, hedef: 100 });
  const a = cubukOlcegi(125);           // ölçek 125 → hedef %80'de
  assert.equal(a.hedef, 80); assert.equal(a.dolu, 80); assert.equal(a.asim, 20);
  assert.deepEqual(cubukOlcegi(-5), { dolu: 0, asim: 0, hedef: 100 });
});
test('durum etiketleri', () => {
  assert.deepEqual(durumEtiketi('suruyor'), { metin: 'FON TOPLUYOR', tur: 'cerceve' });
  assert.deepEqual(durumEtiketi('yeni'), { metin: 'FON TOPLUYOR', tur: 'cerceve' });
  assert.deepEqual(durumEtiketi('basarili'), { metin: 'FONLANDI', tur: 'yesil' });
  assert.deepEqual(durumEtiketi('basarisiz'), { metin: 'FONLANAMADI', tur: 'murekkep' });
  assert.equal(durumEtiketi(undefined), null);
});
test('tohum işareti: 233 / 89 tohum, kol sarı, metin yok', () => {
  const b = tohumIsaretiSvg({ boyut: 200 });
  assert.equal((b.match(/<circle/g) ?? []).length, 233);
  assert.equal((b.match(/fill="#e8b40c"/g) ?? []).length, 11);
  assert.equal((tohumIsaretiSvg({ boyut: 32, kucuk: true }).match(/<circle/g) ?? []).length, 89);
  assert.match(tohumIsaretiSvg({ boyut: 200, zemin: 'koyu' }), /fill="#f7f5ef"/);
});
```

- [ ] **Step 2: Çalıştır, başarısız olduğunu gör** — `node --experimental-strip-types --test src/lib/kimlik.test.ts` → FAIL (modül yok)
- [ ] **Step 3: `src/lib/kimlik.ts`'i yaz.** `yuzdeKesik`: `Math.floor(n * 100) / 100`, `toFixed(2)`, nokta→virgül. `cubukOlcegi`: ölçek `max(100, y)`; `hedef = 100/ölçek*100`; `dolu = min(y,100)/ölçek*100`; `asim = 100 - hedef` (y>100 ise), negatif → 0. `durumEtiketi`: `DURUMLAR` anahtarlarından eşleme (yukarıdaki test). `tohumIsaretiSvg`: `scripts/marka/tohum-isaret.mjs`'teki formülün aynısı, `viewBox="0 0 200 200"`, `width/height = boyut`.
- [ ] **Step 4: Testler geçer** — aynı komut → PASS
- [ ] **Step 5: `scripts/marka/tohum-isaret.mjs` dosyalarını yeniden üret, `git diff --stat brand/` boş olmalı** (formül aynı kaldıysa)
- [ ] **Step 6: Commit** — `git add src/lib/kimlik.ts src/lib/kimlik.test.ts scripts/marka/tohum-isaret.mjs && git commit -m "Kimlik v2: ortak yardımcılar (yüzde, hedef çubuğu, durum etiketi, tohum işareti)"`

### Görev 2: Site temeli — yazı, renk belirteçleri, üst ve alt kısım, marka dosyaları

**Files:**
- Create: `public/fonts/schibsted-grotesk-latin.woff2`, `public/fonts/schibsted-grotesk-latin-ext.woff2` (Google Fonts değişken dosyası, 400–800), `public/fonts/OFL-SchibstedGrotesk.txt`
- Create: `src/components/Logo.astro` (props `boyut: number`, `dikey?: boolean`; satır içi `tohumIsaretiSvg` + "kifobu")
- Modify: `src/styles/fonts.css` (Sofia @font-face'ler yerine Schibsted, 2 kural)
- Modify: `src/styles/global.css:7-59` (belirteçler; `--tahta*`/`--tebesir*` adları korunur ama kâğıt/mürekkep değerlerine bağlanır ki diğer bileşenler kırılmasın; dark-mode bloğu kaldırılır)
- Modify: `src/layouts/Base.astro:98` (`theme-color` → `#f7f5ef`), `:103-112` (favicon/preload), `:143-176` üst kısım, `:182-225` alt kısım
- Create (üretilmiş): `public/favicon.svg`, `favicon.ico`, `favicon-32.png`, `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png`, `og-default.png` (1200×630: sarı bant, dikey logo, slogan) — üretici `scripts/marka/favicon-uret.mjs` (sharp, mevcut bağımlılık)
- Modify: `src/kapak/ciz.ts:114-120` `logoSvg()` → işaret + "kifobu" (600×60, beyaz zemin, Google publisher logo kuralı)
- Test: `src/lib/kimlik.test.ts`'e Logo yok; doğrulama build + ekran görüntüsü

**Interfaces:**
- Consumes: `tohumIsaretiSvg`, `KIMLIK` (Görev 1)
- Produces: `<Logo boyut={44} />`; CSS değişkenleri `--kagit --murekkep --sari --gri --cizgi --yesil --asim --yazi`; sınıflar `.etiket`, `.etiket--yesil`, `.etiket--murekkep`, `.etiket--gri` (Görev 3–4 kullanır)

- [ ] **Step 1:** Schibsted Grotesk woff2 (latin, latin-ext) ve OFL metnini `public/fonts/`'a indir; `fonts.css`'i iki kurala indir; Base.astro preload'ı bu iki dosyaya çevir.
- [ ] **Step 2:** `global.css` belirteçlerini yaz (eski adlar yeni değerlere takma ad). `body { background: var(--kagit); color: var(--murekkep); font-family: var(--yazi); }` `color-scheme: light`.
- [ ] **Step 3:** Base.astro üst kısım: 10 px sarı bant, solda `<Logo boyut={44}/>`, menü aynı bağlantılar ve sıra, etkin bölümün altı 3 px sarı; bülten sayacı ve tarih metni aynı yerde kalır. `slot="tahta"` korunur. Alt kısım: 3 px sarı üst çizgi, `<Logo boyut={30}/>`, slogan, mevcut sosyal bağlantılar ve menü.
- [ ] **Step 4:** `scripts/marka/favicon-uret.mjs` yaz ve çalıştır (küçük işaret 16/32/180/192/512, kâğıt zemin). `logoSvg()` güncelle.
- [ ] **Step 5:** `npm test` → PASS; `npx astro build` → hata yok; `grep -rn "Sofia" src public/fonts` yalnız Görev 5/6'nın dosyalarında kalmalı.
- [ ] **Step 6:** CSP-doğru önizleme (`npx wrangler@4 dev --local`, port 4340) ile ana sayfa, bir haber, `/gunluk-bulten/` ekran görüntüsü; konsolda font/CSP hatası olmamalı.
- [ ] **Step 7: Commit** — `git commit -m "Kimlik v2: Schibsted Grotesk, kâğıt/mürekkep/sarı belirteçleri, yeni üst-alt kısım ve marka dosyaları"`

### Görev 3: Ana sayfa panosu ve bölüm panoları

**Files:**
- Modify: `src/components/BugunTahta.astro` (stil 105–504; işaretleme 50–100 aynı sütunlar)
- Modify: `src/components/Tahta.astro` (bölüm sayfası panosu; yalnız stil)
- Modify: `src/components/arsiv/{Akis,Kampanyalar,Ozet,Tablo,Takvim}.astro`, `src/pages/arsiv/index.astro` (yalnız `--tahta/--tebesir/--sari` kullanan stiller)

**Interfaces:**
- Consumes: `cubukOlcegi`, `yuzdeKesik`, `.etiket*` sınıfları, CSS değişkenleri (Görev 1–2)

- [ ] **Step 1:** BugunTahta: kâğıt zemin, başlık satırı altında 2 px mürekkep çizgi, satır çizgileri `--cizgi`. Durum hücresi mevcut metniyle (SONA ERDİ / SON 18 GÜN / AKTİF) çerçeveli `.etiket`; SONA ERDİ `.etiket--gri`. KALAN'daki FONLANDI `.etiket--yesil`. "Bülten 1531" rozeti mürekkep dolgu.
- [ ] **Step 2:** `.plat-<slug>` sabit renkleri kaldır; platform rengi `bulten.ts` verisinden satır içi `--platform` değişkeniyle 10 px kareye. Pozitif BUGÜN `--yesil`.
- [ ] **Step 3:** % hücresi: `yuzdeKesik` + `cubukOlcegi` ile 110 px çubuk (dolu: hedefe ulaşmadıysa mürekkep, ulaştıysa yeşil; aşım `--asim`; 2 px mürekkep hedef çizgisi `left: hedef%`). `cubukSinifi` ve `.renk-yesil/mavi/indigo` kaldırılır.
- [ ] **Step 4:** Tahta.astro ve arşiv bileşenlerinde aynı belirteçlere geçiş; yapı değişmez.
- [ ] **Step 5:** Build + önizleme; ana sayfa panosunu artifact'taki "Ana sayfa panosu" ile karşılaştıran ekran görüntüsü; 400 px genişlikte yatay kaydırma yalnız tablo kabında.
- [ ] **Step 6: Commit** — `git commit -m "Kimlik v2: ana sayfa ve bölüm panoları"`

### Görev 4: Günlük bülten sayfaları ve tablolar

**Files:**
- Modify: `src/components/Bulten.astro` (stil 319+; `.girisim-karti` 71–74 işaretleme aynı; 437–454 sabit hex'ler)
- Modify: `src/pages/gunluk-bulten/[tarih].astro` (`kategori-bas` başlığı, `.veri-tablo` stilleri global.css'te)
- Modify: `src/styles/global.css` içindeki `.veri-tablo`, `.kategori-bas`, `.sayfalama`, `.bolum-bas`

**Interfaces:**
- Consumes: Görev 1–2 çıktıları

- [ ] **Step 1:** Bulten.astro: 18:00 görselinin dili (artifact bölüm 9) — beyaz kart, platform renginde 6 px sol kenar, yüzde rozetleri, yeşil FONLANDI; başlık "GÜNLÜK **KİTLE FONLAMA** BÜLTENİ" ve `tarih / sayı` aynı metin. Rozet renkleri bülten görselindekiyle aynı eşikler (≥100 yeşil, ≥50 `#0284c7`, altı `#6366f1`).
- [ ] **Step 2:** `[tarih].astro` ve `.veri-tablo`: kalın başlık çizgisi, sağa hizalı tabular rakamlar, platform adı yanında renk karesi, pozitif günlük giriş yeşil. Metinler ve sütunlar aynı.
- [ ] **Step 3:** Build + önizleme: `/gunluk-bulten/`, `/gunluk-bulten/2026-10-17/`, `/gunluk-bulten/gunler/` ekran görüntüleri.
- [ ] **Step 4: Commit** — `git commit -m "Kimlik v2: günlük bülten sayfaları ve veri tabloları"`

### Görev 5: Kapaklar — haber, kampanya künyesi, yatırım

**Files:**
- Create: `src/kapak/fontlar/SchibstedGrotesk[wght].ttf`, `src/kapak/fontlar/OFL-SchibstedGrotesk.txt`
- Modify: `src/kapak/ciz.ts:17-47` (`Yuz` → `'baslik' | 'yari' | 'govde'` Schibsted ağırlıklarıyla; `R` paleti → `KIMLIK`)
- Modify: `src/kapak/kart.ts` (`TAHTALAR`, `tahtaRengi` kaldırılır; `kartSvg` üç düzen)
- Modify: `src/kapak/ciz.ts:100-102` `kapakSvg(h)` düzen seçimi
- Modify: `src/kapak/kart.test.ts`

**Interfaces:**
- Consumes: `tohumIsaretiSvg`, `yuzdeKesik`, `cubukOlcegi`, `durumEtiketi`, `KIMLIK` (Görev 1)
- Produces: `kapakDuzeni(h: Haber): 'haber' | 'kunye' | 'yatirim'`; `kartSvg(veri: KapakVeri, bicim: Bicim): string`, `KapakVeri = { baslik; kategori; girisim?; platform?; toplanan?; hedef?; yatirimci?; durum?; paraBirimi?; tur? }`

- [ ] **Step 1: Testleri güncelle**

```ts
test('düzen seçimi', () => {
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'mevzuat' }), 'haber');
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'kampanyalar', girisim: 'A', toplanan: 1, hedef: 2, durum: 'suruyor' }), 'kunye');
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'kampanyalar', girisim: 'A' }), 'haber');     // rakam yoksa uydurma yok
  assert.equal(kapakDuzeni({ baslik: 'X', kategori: 'yatirimlar', tur: 'Tohum', toplanan: 10690000, paraBirimi: 'EUR' }), 'yatirim');
});
test('künye kapağında olmayan hücre çizilmez', () => {
  const s = kartSvg({ baslik: 'X', kategori: 'kampanyalar', girisim: 'Örnek', toplanan: 2840000, hedef: 4000000, durum: 'suruyor' }, 'kapak');
  assert.doesNotMatch(s, /DEĞERLEME/);    // glif yolu olduğu için data-hucre özniteliğiyle sına
});
test('her düzen: ölçü, glif yolu, sarı bant, <text> yok', () => { /* 3 düzen × 3 biçim; `fill="#e8b40c"` ve `width="1200" height="675"` */ });
test('kategori büyük harfi Türkçe', () => assert.match(kartSvg({ baslik: 'X', kategori: 'girisimler' }), /data-kategori="GİRİŞİMLER"/));
test('uzun başlık alttaki öğeye binmez', () => { /* 140 karakterlik başlıkta son satır tabanı < logo satırının üstü; kartSvg dönüşündeki data-baslik-alt ve data-alt-ust öznitelikleriyle */ });
```

- [ ] **Step 2: Çalıştır** — `node --experimental-strip-types --test src/kapak/kart.test.ts` → FAIL
- [ ] **Step 3:** `kartSvg` üç düzeni çizer (ölçüler artifact bölüm 8): ortak 18 px sarı bant (post/story'de ölçekli); **haber**: başlık 700, 80→68 px küçülerek, sol altta işaret + "kifobu", sağ altta kategori + 3 px sarı alt çizgi; **künye**: `durumEtiketi` çerçevesi, sağ üst logo, girişim, "platform · paya dayalı", tutar (`paraKisa` simge önde) + `yuzdeKesik`, `cubukOlcegi` çubuğu, alt satırda yalnız verisi olan hücreler (`YATIRIMCI` = `yatirimci`; `DEĞERLEME`/`BİTİŞ` alanları şemada yok → çizilmez); **yatırım**: tur etiketi (`tur.toLocaleUpperCase('tr-TR')` + " TURU" yoksa), girişim, tutar simgeyle. Test için grup elemanlarına `data-*` öznitelikleri.
- [ ] **Step 4: Testler geçer** → PASS
- [ ] **Step 5:** Son 14 günün (`GORSEL_GUN`) kapaklarından 6 örneği (2 haber, 2 künye, 2 yatırım) PNG olarak `dist/kapak/` altından al, sahibine göster; onaysız yayına alma.
- [ ] **Step 6: Commit** — `git commit -m "Kimlik v2: kapaklar (haber, kampanya künyesi, yatırım)"`

### Görev 6: 18:00 bülteni görseli

**Files:**
- Modify: `scripts/bulten-gorsel-ciz.ts:10-31` (Nunito → `src/kapak/fontlar/SchibstedGrotesk[wght].ttf`, aynı `getVariation({wght})` yolu), `:96` ve `:144-149` (logo `<image>` → satır içi `tohumIsaretiSvg` + "kifobu" glif yolu, sağ üst, aynı boyut), `:112-138` ve `:353-393` (MKK kutusu ile alt bant arasında en az bir satır boşluk: `mkkY + mkkKartH + 24 <= footerY`)
- Test: `scripts/bulten-gorsel-ciz.test.ts` (yeni; `npm test` deseni `scripts/bot/*.test.mjs` olduğundan package.json `test` betiğine `"scripts/*.test.ts"` eklenir)

**Interfaces:**
- Consumes: `tohumIsaretiSvg` (Görev 1), Schibsted TTF (Görev 5)

- [ ] **Step 1: Test yaz** — `bultenSvgCiz('post')`: `<image` yok, `fill="#e8b40c"` var, `17 Ekim 2026 / 1530` biçimi (`${tarih} / ${sayi}`, binlik noktası yok), MKK kutusunun altı ile alt bant arasında ≥ 24 px (`data-mkk-alt`, `data-alt-ust` öznitelikleriyle); `story` için aynı.
- [ ] **Step 2: Çalıştır** → FAIL
- [ ] **Step 3: Uygula** — yalnız yukarıdaki üç değişiklik; renkler, kartlar, rozetler, metinler, sıralama dokunulmaz.
- [ ] **Step 4: Testler geçer** → PASS
- [ ] **Step 5:** `npm run bulten:gorsel` (ya da `scripts/bulten-gorsel-uret.ts`) ile post ve story üret, mevcut `public/bulten-post.png` ile yan yana sahibine göster. **Onay gelmeden commit atma** (bülten her gün 18:00'de canlıya gider).
- [ ] **Step 6: Commit** — `git commit -m "Kimlik v2: 18:00 bülteni görselinde tohum işareti, Schibsted Grotesk ve MKK boşluğu"`

### Görev 7: Sosyal profil dosyaları ve DESIGN.md

**Files:**
- Create: `brand/sosyal/profil-1080.png` (kâğıt zemin, küçük işaret, daire kırpmaya güvenli %80 iç alan), `brand/sosyal/kapak-1500x500.png`, `brand/sosyal/kapak-linkedin-1128x191.png` — üretici `scripts/marka/sosyal-uret.mjs` (sharp + glif yolu "kifobu" ve slogan)
- Modify: `DESIGN.md` (Seans Tahtası anlatımı yerine Kimlik v2'nin uygulanmış hâli; `BRAND.md`'ye bağlantı)
- Modify: `PRODUCT.md` "Brand mark" satırı → tohum işareti

- [ ] **Step 1:** Üreticiyi yaz ve çalıştır; PNG'leri sahibine gönder (hesaplara yüklemeyi sahibi yapar; Meta/X/LinkedIn'e yükleme bu planın dışında).
- [ ] **Step 2:** DESIGN.md ve PRODUCT.md güncelle; eski ayçiçeği (`brand/kifobu-isaret.png`, `public/logo-saydam.png`) yalnız `src/scripts/arsiv-png.ts:58` kullanıyorsa onu da işarete çevir, sonra dosyaları sil.
- [ ] **Step 3:** `npm test` ve `npx astro build` → PASS
- [ ] **Step 4: Commit** — `git commit -m "Kimlik v2: sosyal profil dosyaları, DESIGN.md ve PRODUCT.md"`

---

## Yayın sırası

1. Görev 1 (görünür değişiklik yok) → push.
2. Görev 2–4 aynı oturumda; üçü bitince tek push (site yarım kimlikte kalmasın). `yayinla.yml` çalışmasını izle.
3. Görev 5 örnek onayı → push. Kapaklar yalnız `GORSEL_GUN` (14 gün) içindekiler için yeniden üretilir.
4. Görev 6 örnek onayı → 18:00'den en az bir saat önce push.
5. Görev 7.

## Bu planın dışında (ayrı iş)

- Künye için `degerleme`, `bitis` ve yatırım kapağı için `sektor`, `ulke` alanları: şemaya ve habere yazan bota eklenmesi ayrı bir plan ister (bot istemi ve doğrulayıcı değişir). O zamana kadar bu hücreler çizilmez.
- `İPTAL EDİLDİ` / `GERİ ÇEKİLDİ` durumları `DURUMLAR`'a ve bota eklenmesi.
- TÜRKPATENT benzerlik araması (sahibi).
- finfolis, tidsrøst, JEN DUME kimlikleri.
