# Kitle Fonlama Arşivi — Uygulama Planı

> **Durum (2026-10-18):** Uygulandı; arşiv bot kayıtlarıyla canlı.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kapanış botunun her gün kalıcı bir arşiv kaydı yazması ve bu kayıtlardan `/arsiv/` adresinde grafikli, indirilebilir bir Kitle Fonlama Arşivi sayfası üretilmesi.

**Architecture:** Bot kapanışta `src/data/arsiv/YYYY-MM-DD.json` yazar; kayıt kuralları (veri alınamadı, birikmiş, başlangıç) saf bir modülde (`src/lib/arsiv/kayit.ts`) yaşar. Sayfa derlemede bu JSON'ları `import.meta.glob` ile okur, tüm hesapları saf bir modülde (`src/lib/arsiv/hesap.ts`) yapar ve her dönem (gün/hafta/ay) için SVG'leri önceden üretir; tarayıcıdaki küçük bir script yalnızca görünüm/dönem değiştirir ve PNG üretir.

**Tech Stack:** Astro 7 (statik), TypeScript, Node 22 `node:test` + `--experimental-strip-types`, elle yazılmış SVG, Canvas API. **Yeni npm bağımlılığı yok.**

**Spec:** `docs/superpowers/specs/2026-10-13-kitle-fonlama-arsivi-design.md`

## Global Constraints

- Yeni npm bağımlılığı eklenmez (Windows'ta `npm install` Linux lockfile'ından `@emnapi` düşürüyor). `package.json` yalnızca `scripts` alanında değişir; `package-lock.json`'a dokunulmaz.
- Testler: `npm test` → `node --experimental-strip-types --test "src/lib/arsiv/*.test.ts"`. Göreli importlar `.ts` uzantısıyla yazılır (bot ve testler Node ile doğrudan çalışır).
- Adres `/arsiv/`, menü etiketi "Arşiv". Veri `src/data/arsiv/YYYY-MM-DD.json` (tarih Europe/Istanbul).
- Başlıklar: "Kitle Fonlama Arşivi"; sekmeler "Akış", "Kampanyalar", "Takvim"; dönemler "Günlük", "Haftalık", "Aylık". Şakacı/pazarlama dili yok.
- Haber kuruluşu adı/bağlantısı yok; kaynak satırı: "Kaynak: platformların kampanya sayfaları".
- Renkler ve yazı tipleri `DESIGN.md` token'larından (tahta `#1d2723`, tahta-koyu `#151d1a`, tebeşir `#ecefe9`, sarı `#f2d45c`, pembe `#f19bb0`, mavi `#8fc7e0`; Sofia Sans ailesi). Platform renkleri `PLATFORM_AYARLARI`'ndan.
- SVG'lerde renk/yazı tipi CSS sınıfıyla değil **öznitelikle** (`fill`, `stroke`, `font-family`) verilir — PNG dışa aktarımında stil kaybolmasın.
- Para biçimi Türkçe: `₺1,25 M`, `₺142 B`, tabloda `₺7.602.500`; yüzde `%50,6`.
- Sahte veri asla `src/data/arsiv/`'e yazılmaz. Geliştirme örnek verisi `src/lib/arsiv/ornek/` altında durur ve yalnızca `import.meta.env.DEV && import.meta.env.PUBLIC_ARSIV_ORNEK === '1'` iken kullanılır.
- `localStorage` her erişimde try/catch içinde; sayfa onsuz da doğru çalışır.

## Review Focus

1. **Arşiv boşken derleme** (bu akşamki ilk kapanıştan önce canlı derleme): sayfa çökmeden "Seri ilk kapanışla başlayacak" boş durumunu göstermeli; CSV yalnızca başlık satırı içermeli. → Task 3 (`hesap` boş dizi testleri) + Task 4 (boş durum).
2. **Aynı gün kapanışın iki kez çalışması** (elle tekrar): aynı dosyanın üzerine yazılmalı; "önceki kayıt" bugünün dosyası olmamalı, yoksa bugün kendi kendine göre `birikmis`/`bugun=0` hesaplar. → Task 1 (`sonKaydiBul` hariç tarih testi).
3. **Listeye kampanya eklenmesi/çıkarılması**: yeni kampanyanın ilk günü `bugun=null` (girişi bilinmiyor), listeden çıkan kampanya serisi o günden sonra bitmeli, çizgi sıfıra düşmemeli. → Task 1 + Task 3 (`kampanyaSerileri`).
4. **Hafta sonu / atlanmış iş günü**: Pazartesi kaydı Cuma'ya göre `birikmis` sayılmamalı; ama bot bir iş günü hiç çalışmadıysa sonraki gün `birikmis` olmalı. → Task 1.
5. **Mobil genişlik (375px)**: yatay sayfa kaydırması yok; tablo kendi kabında kayar; sekmeler en az 44px dokunma yüksekliğinde. → Task 4/5 doğrulama adımları.

---

## Dosya Yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/lib/arsiv/tipler.ts` | Ortak tipler (`ArsivKaydi`, `Donem`…) |
| `src/lib/arsiv/kayit.ts` | Bot tarafı: tarama sonuçlarından arşiv kaydı üretme kuralları (saf) |
| `src/lib/arsiv/dosya.ts` | Bot tarafı: arşiv dizinini okuma/yazma (`node:fs`) |
| `src/lib/arsiv/hesap.ts` | Sayfa tarafı: dilimleme, özet, tablo, seriler, takvim, CSV (saf) |
| `src/lib/arsiv/bicim.ts` | Para/yüzde/tarih biçimleme |
| `src/lib/arsiv/yukle.ts` | Astro: `import.meta.glob` ile kayıtları yükleme (+ DEV örnek verisi) |
| `src/lib/arsiv/ornek/*.json` | Test ve geliştirme örnek kayıtları |
| `src/lib/arsiv/*.test.ts` | `node:test` testleri |
| `scripts/bulten-bot.ts` | Kapanışta arşiv kaydını yazar |
| `src/pages/arsiv/index.astro` | Sayfa |
| `src/pages/arsiv/kifobu-kitle-fonlama-arsivi.csv.ts` | CSV uç noktası |
| `src/components/arsiv/{Ozet,Akis,Kampanyalar,Takvim,Tablo}.astro` | Görünümler |
| `src/scripts/arsiv-etkilesim.ts` | Görünüm/dönem geçişi, hatırlama, takvim günü açma |
| `src/scripts/arsiv-png.ts` | PNG üretimi |
| `src/layouts/Base.astro`, `src/components/BugunTahta.astro` | Menü ve ana sayfa bağlantısı |

---

### Task 1: Arşiv kaydı kuralları (bot tarafı, saf)

**Files:**
- Create: `src/lib/arsiv/tipler.ts`, `src/lib/arsiv/kayit.ts`, `src/lib/arsiv/dosya.ts`
- Test: `src/lib/arsiv/kayit.test.ts`, `src/lib/arsiv/dosya.test.ts`
- Modify: `package.json` (yalnızca `"test"` script'i)

**Interfaces:**
- Produces (`tipler.ts`):
  ```ts
  export type Donem = 'gun' | 'hafta' | 'ay';
  export interface ArsivGirisim {
    ad: string; platform: string; url?: string;
    bugun: number | null;      // null: başlangıç günü, ilk görülme veya veri alınamadı
    alinan: number; kalan: number | null; hedef: number; degerleme: number;
    yuzde: number; durum: string;
    veriAlinamadi: boolean; birikmis: boolean;
  }
  export interface ArsivPlatform { anahtar: string; ad: string; renk: string; bugun: number; toplam: number }
  export interface ArsivKaydi { tarih: string; sayi: number; baslangic: boolean; girisimler: ArsivGirisim[]; platformlar: ArsivPlatform[] }
  ```
- Produces (`kayit.ts`):
  ```ts
  export interface TaramaSonucu { ad: string; platform: string; url?: string; toplanan: number; durum: string; hata: boolean; hedef: number; degerleme: number; tamamlandi?: boolean }
  export function arsivKaydiOlustur(g: {
    tarih: string; sayi: number; taramalar: TaramaSonucu[];
    referans: Record<string, number>; oncekiKayit: ArsivKaydi | null;
    platformAyarlari: Record<string, { ad: string; renk: string }>;
  }): ArsivKaydi
  export function atlananIsGunu(oncekiTarih: string, tarih: string): number // aradaki (hariç) Pzt–Cum gün sayısı
  ```
- Produces (`dosya.ts`):
  ```ts
  export function sonKaydiBul(dizin: string, haricTarih: string): ArsivKaydi | null // haricTarih'ten küçük en büyük tarihli dosya
  export function kaydiYaz(dizin: string, kayit: ArsivKaydi): string // `${dizin}/${kayit.tarih}.json`, 2 boşluk girinti; yolu döner
  ```

Kurallar (spec'ten, aynen):
- `veriAlinamadi = hata || (ref > 0 && toplanan === 0) || (ref !== undefined && toplanan < ref)`; bu durumda `alinan = ref ?? toplanan`, `bugun = null`.
- `oncekiKayit === null` → `baslangic: true`, tüm `bugun = null`.
- `ref === undefined` (ilk görülen kampanya) → `bugun = null`.
- Aksi halde `bugun = toplanan − ref`.
- `birikmis = !veriAlinamadi && bugun !== null && (oncekiKayit'te aynı ad veriAlinamadi || atlananIsGunu(oncekiKayit.tarih, tarih) > 0)`.
- `kalan = tamamlandi || alinan >= hedef ? null : hedef − alinan`; `yuzde = round2(alinan / hedef * 100)`.
- `platformlar`: platform başına `bugun` = null olmayan `bugun` toplamı, `toplam` = `alinan` toplamı; ad/renk `platformAyarlari`'ndan, yoksa `{ ad: anahtar, renk: '#888888' }`.

- [x] **Step 1: Testleri yaz** — `kayit.test.ts`:
  - `ilk kayıt başlangıç günüdür`: `oncekiKayit: null` → `baslangic === true`, her `bugun === null`.
  - `normal gün farkı yazar`: ref `{OYLİO: 2_000_000}`, toplanan `2_532_200` → `bugun === 532_200`, `veriAlinamadi === false`, `birikmis === false`.
  - `hata dünkü toplamı korur`: `hata: true`, ref `2_000_000` → `alinan === 2_000_000`, `bugun === null`, `veriAlinamadi === true`.
  - `sessiz sıfır veri alınamadıdır`: ref `354_200`, toplanan `0`, `hata: false` → `veriAlinamadi === true`, `alinan === 354_200`.
  - `düşen toplam veri alınamadıdır`: ref `24_282`, toplanan `20_000` → `veriAlinamadi === true`.
  - `hata sonrası gün birikmiştir`: önceki kayıtta OYLİO `veriAlinamadi: true` → bugünkü OYLİO `birikmis === true`.
  - `Pazartesi birikmiş değildir`: önceki `2026-10-16` (Cuma), bugün `2026-10-19` → `birikmis === false`; `atlananIsGunu('2026-10-16','2026-10-19') === 0`.
  - `atlanmış iş günü birikmiştir`: önceki `2026-10-14`, bugün `2026-10-16` → `atlananIsGunu === 1`, `birikmis === true`.
  - `yeni kampanyanın ilk günü null`: ref'te olmayan ad → `bugun === null`, `veriAlinamadi === false`.
  - `fonlanan kampanyada kalan null`: `tamamlandi: true` → `kalan === null`.
  - `platform toplamları`: iki fonangels + bir ecofolio → `platformlar` doğru `bugun`/`toplam`, renk `#f47b3d`.

  `dosya.test.ts` (geçici dizin, `fs.mkdtempSync`):
  - `sonKaydiBul bugünü hariç tutar`: `2026-10-13.json` ve `2026-10-14.json` varken `sonKaydiBul(d, '2026-10-14')` → tarihi `2026-10-13`.
  - `boş dizinde null`: dizin yok veya boş → `null`.
  - `kaydiYaz üzerine yazar`: aynı tarihle iki kez yazınca tek dosya, son içerik.

- [x] **Step 2: `package.json`'a ekle:** `"test": "node --experimental-strip-types --test \"src/lib/arsiv/*.test.ts\""`. Çalıştır: `npm test` → Beklenen: FAIL (modüller yok).
- [x] **Step 3: `tipler.ts`, `kayit.ts`, `dosya.ts`'yi yukarıdaki imzalarla uygula.** Tarih hesapları UTC gece yarısı üzerinden (`Date.parse(\`${t}T00:00:00Z\`)`), saat dilimi kayması olmasın.
- [x] **Step 4: `npm test`** → Beklenen: tüm testler PASS.
- [x] **Step 5: Commit** — `git add src/lib/arsiv package.json && git commit -m "feat(arsiv): arşiv kaydı kuralları"`

---

### Task 2: Botun kapanışta arşiv yazması

**Files:**
- Modify: `scripts/bulten-bot.ts` (tarama döngüsü ~satır 269–325, kapanış bloğu ~satır 418–427)

**Interfaces:**
- Consumes: `arsivKaydiOlustur`, `TaramaSonucu` (`src/lib/arsiv/kayit.ts`); `sonKaydiBul`, `kaydiYaz` (`src/lib/arsiv/dosya.ts`).

- [x] **Step 1: Tarama döngüsünde her kampanya için bir `TaramaSonucu` topla.** Alanlar: `toplanan` = döngüdeki `toplanan` değişkeni, `hata` = catch bloğuna girildiyse `true` (bu durumda `toplanan` değeri kullanılmaz, kural ref'i alır), `hedef` = `k.hedefFon`, `degerleme`, `tamamlandi`, `durum`, `url`. `bulten.ts` çıktısı ve `bugunkuToplamlar` davranışı **değişmez**.
- [x] **Step 2: `isKapanis` bloğunda, referans yazılmadan önce:** `const tarihIso = trBugunIso()`; `oncekiKayit = sonKaydiBul(arsivDizin, tarihIso)`; `kaydiYaz(arsivDizin, arsivKaydiOlustur({ tarih: tarihIso, sayi, taramalar, referans: referans.girisimler, oncekiKayit, platformAyarlari: PLATFORM_AYARLARI }))`; `arsivDizin = path.join(rootDir, 'src', 'data', 'arsiv')` (yoksa `mkdirSync recursive`). Log: `[BÜLTEN BOTU] ✓ Arşiv kaydı yazıldı: <yol>`.
- [x] **Step 3: Doğrula** — `npm test` PASS; `node --experimental-strip-types -e "import('./scripts/bulten-bot.ts')"` çalıştırma (ağ gerektirir) **yapılmaz**; bunun yerine `npx astro check` yoksa `npx tsc --noEmit -p .` ile tip hatası olmadığını gör (Beklenen: `scripts/bulten-bot.ts` için yeni hata yok). Workflow'un `git add -A src/data/` adımı yeni dizini kapsadığından workflow değişmez.
- [x] **Step 4: Commit** — `git commit -am "feat(arsiv): kapanış botu günlük arşiv kaydı yazar"`

> Not: Bu task bu akşamki kapanıştan (TR 18:00) önce push edilirse seri bugün başlar; edilmezse ilk kapanış günü başlangıç olur. İkisi de spec'e uygun.

---

### Task 3: Sayfa hesapları (saf)

**Files:**
- Create: `src/lib/arsiv/hesap.ts`, `src/lib/arsiv/bicim.ts`, `src/lib/arsiv/ornek/2026-10-13.json` … `2026-11-06.json` (≈ 15–18 iş günü; en az bir `veriAlinamadi`, bir `birikmis`, bir yeni kampanya, bir hafta içi boşluk; ilk dosya `baslangic: true`)
- Test: `src/lib/arsiv/hesap.test.ts`, `src/lib/arsiv/bicim.test.ts`

**Interfaces:**
- Consumes: `ArsivKaydi`, `Donem` (Task 1).
- Produces (`hesap.ts`):
  ```ts
  export interface Dilim { anahtar: string; etiket: string; ilk: string; son: string; toplam: number | null; platformlar: Record<string, number>; eksik: boolean; birikmis: boolean }
  export function dilimle(kayitlar: ArsivKaydi[], donem: Donem): Dilim[]
  export interface PlatformPayi { anahtar: string; ad: string; renk: string; pay: number }
  export interface Ozet { donemToplami: number | null; degisimYuzde: number | null; gunlukOrtalama: number | null; aktifKampanya: number; sonaEren: number; platformPaylari: PlatformPayi[] }
  export function ozetHesapla(kayitlar: ArsivKaydi[], donem: Donem): Ozet
  export interface KampanyaSatiri { ad: string; platform: string; url?: string; donemGirisi: number | null; toplam: number; yuzde: number; durum: string; veriAlinamadi: boolean; birikmis: boolean }
  export function kampanyaTablosu(kayitlar: ArsivKaydi[], donem: Donem): KampanyaSatiri[]
  export interface KampanyaSerisi { ad: string; platform: string; renk: string; hedef: number; noktalar: { tarih: string; alinan: number; veriAlinamadi: boolean }[] }
  export function kampanyaSerileri(kayitlar: ArsivKaydi[]): KampanyaSerisi[]
  export type TakvimTuru = 'veri' | 'baslangic' | 'eksik' | 'kapanis-yok' | 'gelecek'
  export interface TakvimGunu { tarih: string; tur: TakvimTuru; toplam: number | null }
  export function takvimAyi(kayitlar: ArsivKaydi[], yil: number, ay: number, bugun: string): TakvimGunu[]
  export function csvUret(kayitlar: ArsivKaydi[]): string
  ```
- Produces (`bicim.ts`): `paraKisa(n: number): string`, `paraTam(n: number): string`, `yuzdeBicim(n: number): string`, `degisimBicim(n: number | null): string`

Kurallar:
- Hafta = ISO hafta (Pazartesi başlar), ay = takvim ayı. Etiketler: gün `13.10`, hafta `12–16 Eki`, ay `Ekim 2026`.
- `Dilim.toplam` = dilimdeki başlangıç olmayan günlerin null olmayan `bugun` toplamı; dilimde hiç sayılabilir gün yoksa `null`. `eksik` = dilimde herhangi bir `veriAlinamadi`; `birikmis` benzer.
- "Son dilim" = verisi olan en son dilim (hafta sonu bakılırsa Cuma'nın dilimi). Özet son dilimi bir önceki dilimle karşılaştırır; önceki dilim yoksa ya da `toplam` null ise `degisimYuzde = null`.
- `gunlukOrtalama` = son dilim toplamı / dilimdeki sayılabilir gün sayısı.
- `aktifKampanya` = son kayıtta `durum !== 'SONA ERDİ'` sayısı; `sonaEren` = kalan.
- `platformPaylari` = son dilimdeki platform girişlerinin toplam içindeki payı (0–1), büyükten küçüğe; toplam 0 veya null ise boş dizi.
- `kampanyaTablosu` = son kayıttaki kampanyalar; `donemGirisi` = son dilimde o kampanyanın null olmayan `bugun` toplamı (hiç yoksa null); sıralama `donemGirisi` azalan, null'lar sonda, eşitlikte `toplam` azalan.
- `kampanyaSerileri` = kampanyanın göründüğü günler; listeden çıktıktan sonra nokta eklenmez.
- `takvimAyi`: hafta sonu ve kaydı olmayan geçmiş iş günü → `kapanis-yok`; `bugun`'den sonrası → `gelecek`; `baslangic` → `baslangic`; herhangi bir `veriAlinamadi` içeren gün → `eksik` (toplam yine hesaplanır).
- CSV: UTF-8 BOM + virgül ayraç; başlık `tarih,sayi,girisim,platform,gunluk_giris,toplam,hedef,yuzde,durum,veri_alinamadi,birikmis,baslangic`; sayılar ham (nokta ondalık), null → boş; satır sonu `\n`; tarih artan, gün içinde ad sırası.

- [x] **Step 1: Testleri yaz** — `hesap.test.ts`:
  - `boş arşiv`: tüm fonksiyonlar boş dizi/`null` döner; `ozetHesapla([], 'gun').donemToplami === null`; `csvUret([])` yalnızca BOM + başlık + `\n`.
  - `başlangıç günü toplama girmez`: tek kayıt `baslangic: true` → `dilimle(...,'gun')[0].toplam === null`.
  - `ISO hafta Pazartesi başlar`: `2026-10-18` (Pazar) ve `2026-10-19` (Pzt) farklı haftada.
  - `haftalık etiket`: 12–16 Ekim dilimi `etiket === '12–16 Eki'`.
  - `değişim yüzdesi`: önceki gün toplamı 100_000, son 150_000 → `degisimYuzde === 50`.
  - `önceki dilim yoksa değişim null`.
  - `platform payı dönem girişinden`: son gün fonangels 90_000, ecofolio 10_000 → paylar `[0.9, 0.1]`.
  - `tabloda null girişler sonda`.
  - `listeden çıkan kampanya serisi biter`.
  - `takvim türleri`: örnek veride hafta sonu `kapanis-yok`, ilk gün `baslangic`, veri alınamadı günü `eksik`, yarın `gelecek`.
  - `csv null alanları boş`: `bugun: null` satırında `gunluk_giris` boş.
  `bicim.test.ts`: `paraKisa(1_250_000) === '₺1,25 M'`, `paraKisa(142_000) === '₺142 B'`, `paraKisa(950) === '₺950'`, `paraTam(7_602_500) === '₺7.602.500'`, `yuzdeBicim(50.64) === '%50,6'`, `degisimBicim(4.2) === '▲ %4,2'`, `degisimBicim(-3) === '▼ %3,0'`, `degisimBicim(null) === '—'`.
- [x] **Step 2: `npm test`** → Beklenen: yeni testler FAIL.
- [x] **Step 3: Örnek JSON'ları, `hesap.ts` ve `bicim.ts`'yi uygula.** Örnek veride gerçekçi rakamlar (mevcut 4 kampanya + 1 yeni) kullan; dosyaların başına değil, kampanya adlarına "ÖRNEK" eklemeye gerek yok — dizin adı yeterli.
- [x] **Step 4: `npm test`** → Beklenen: tümü PASS.
- [x] **Step 5: Commit** — `git commit -m "feat(arsiv): dilimleme, özet, takvim ve CSV hesapları"` (yeni dosyaları `git add` ile).

---

### Task 4: Sayfa iskeleti, özet, dönem seçici, sekmeler ve bağlantılar

**Files:**
- Create: `src/lib/arsiv/yukle.ts`, `src/pages/arsiv/index.astro`, `src/components/arsiv/Ozet.astro`, `src/scripts/arsiv-etkilesim.ts`
- Modify: `src/layouts/Base.astro:81-90` (menüye "Arşiv"), `src/components/BugunTahta.astro` (tablo altına `Arşiv →` bağlantısı)

**Interfaces:**
- Consumes: Task 3'ün tüm `hesap`/`bicim` fonksiyonları.
- Produces:
  - `yukle.ts`: `export function arsivKayitlari(): ArsivKaydi[]` — `import.meta.glob('/src/data/arsiv/*.json', { eager: true, import: 'default' })`, tarih artan; DEV + `PUBLIC_ARSIV_ORNEK=1` ise `src/lib/arsiv/ornek/*.json`.
  - DOM sözleşmesi (Task 5–8 buna uyar): kök `<section id="arsiv" data-gorunum="akis" data-donem="gun">`; dönem düğmeleri `button[data-donem-sec="gun|hafta|ay"]`; sekme düğmeleri `button[role=tab][data-gorunum-sec="akis|kampanyalar|takvim"]`; dönemle değişen her blok `[data-donem-blok="gun|hafta|ay"]` (görünmeyenler `hidden`); her görünüm paneli `[role=tabpanel][data-gorunum-panel="…"]`.
  - `localStorage` anahtarı: `kifobu-arsiv` → `{"gorunum":"akis","donem":"gun"}`.

İçerik (onaylı v2 taslağı):
- Üst künye: etiket `kifobu · Veri`, başlık `Kitle Fonlama Arşivi`, satır `Türkiye paya dayalı kitle fonlama kampanyaları · Günlük kapanış 18:00 · Son güncelleme <son kayıt tarihi> 18:00 · Seri başlangıcı <ilk kayıt tarihi>`.
- Dönem seçici (Günlük/Haftalık/Aylık) özetin **üstünde**.
- Özet: 4 kutu — `Dönem toplamı` (+ `degisimBicim`), `Günlük ort.`, `Aktif kampanya` (+ `<n> sona erdi`), `Platform` (+ payların yüzdeleri); her dönem için bir `data-donem-blok`.
- Sekmeler (`Akış`, `Kampanyalar`, `Takvim`) ve boş paneller (Task 5–7 dolduracak).
- Boş arşiv durumu: özet ve sekmeler yerine `Seri ilk günlük kapanışla (18:00) başlayacak.` metni.
- `<Base>` başlığı `Kitle Fonlama Arşivi`, açıklama tek cümle; `current="/arsiv/"`.

- [x] **Step 1: Uygula** (yukarıdaki sözleşme ve içerikle). `arsiv-etkilesim.ts`: tıklamada `data-gorunum`/`data-donem` ve `hidden` güncelle, `aria-selected`/`aria-pressed` ayarla, `localStorage`'a yaz (try/catch); yüklemede oku ve uygula; sekmeler arasında ← → ile gezinme.
- [x] **Step 2: Derle** — `npm run build` → Beklenen: başarı; `dist/arsiv/index.html` var ve `Seri ilk günlük kapanışla` metnini içeriyor (gerçek arşiv boş).
- [x] **Step 3: Örnek veriyle görsel doğrulama** — `.claude/launch.json`'a `PUBLIC_ARSIV_ORNEK=1` ile `astro dev` girdisi ekle, `preview_start`; `/arsiv/` açılır, dönem ve sekme düğmeleri çalışır, yenilemede seçim korunur, konsolda hata yok; menüde "Arşiv" aktif; ana sayfada `Arşiv →` var. `resize_window` mobile (375px): yatay kaydırma yok (`document.documentElement.scrollWidth <= 375`), sekme yüksekliği ≥ 44px.
- [x] **Step 4: Commit** — `git commit -m "feat(arsiv): /arsiv/ sayfa iskeleti, özet ve gezinme"`

---

### Task 5: Akış görünümü ve kampanya tablosu

**Files:**
- Create: `src/components/arsiv/Akis.astro`, `src/components/arsiv/Tablo.astro`
- Modify: `src/pages/arsiv/index.astro`

**Interfaces:**
- Consumes: `dilimle`, `kampanyaTablosu`, `paraKisa`, `paraTam`, `yuzdeBicim`; Task 4 DOM sözleşmesi.
- Produces: her grafik `<svg data-png-grafik data-png-baslik="Akış · Günlük">` (Task 8 bunları dışa aktarır); tablo satırları `tr[data-kampanya="<ad>"]` ve içinde `button[data-png-kart]` (Task 8 bağlar); kart verisi satırda `data-kart='<JSON KampanyaKartVerisi>'` (Task 8 tanımı).

- [x] **Step 1: `Akis.astro`** — her dönem için platform renkli yığılmış çubuk grafik (`viewBox` sabit genişlik, `width="100%"`), y ekseni 3 kılavuz çizgi ve `paraKisa` etiketleri, x ekseninde dilim etiketleri (çoksa her n'inci). `toplam === null` dilim: çubuk yerine tebeşir-ince kesikli çerçeve + `<title>Başlangıç günü</title>` ya da `Veri alınamadı`; `eksik` dilimin üstünde küçük işaret ve `<title>` açıklaması; `birikmis` dilimde `<title>` "önceki günle birlikte". Platform açıklaması (renk + ad) grafiğin üstünde.
- [x] **Step 2: `Tablo.astro`** — sütunlar `Kampanya · Platform · Dönem girişi · Toplam · Hedef % · Durum · ↓PNG`; sayılar `tabular-nums`, sağa hizalı; `donemGirisi` null → `—`; `veriAlinamadi` → `Veri alınamadı`; `birikmis` → küçük `*` ve tablo altında `* önceki günle birlikte`. Kap `overflow-x: auto`. Her dönem için bir `data-donem-blok`.
- [x] **Step 3: Doğrula** — örnek veriyle preview: üç dönemde çubuklar ve tablo değişiyor; başlangıç/eksik/birikmiş işaretleri görünüyor; 375px'de yalnızca tablo kabı kayıyor. `npm run build` başarılı.
- [x] **Step 4: Commit** — `git commit -m "feat(arsiv): akış grafiği ve kampanya tablosu"`

---

### Task 6: Kampanyalar görünümü

**Files:**
- Create: `src/components/arsiv/Kampanyalar.astro`
- Modify: `src/pages/arsiv/index.astro`

**Interfaces:**
- Consumes: `kampanyaSerileri`, `kampanyaTablosu` (dönem girişi sütunu için), `Tablo.astro` (Task 5).
- Produces: grafik `<svg data-png-grafik data-png-baslik="Kampanyalar">`.

- [x] **Step 1: Uygula** — tek grafik, x = tarih (tüm arşiv), y = hedefe göre yüzde (0–max(100, en yüksek)) ki farklı büyüklükteki kampanyalar karşılaştırılabilsin; %100'de kesikli `hedef` çizgisi; her kampanya bir çizgi (renk: platform rengi; aynı platformdan birden fazla kampanyada sarı/pembe/mavi ile ayrıştır), son noktasında ad + `yuzdeBicim`. `veriAlinamadi` noktası içi boş daire. Altında `Tablo` (dönemle değişen "Dönem girişi" sütunu).
- [x] **Step 2: Doğrula** — örnek veriyle preview: listeden çıkan kampanyanın çizgisi o gün bitiyor, yeni kampanya ilk göründüğü günden başlıyor, etiketler çakışmıyor (çakışırsa dikey kaydır). `npm run build` başarılı.
- [x] **Step 3: Commit** — `git commit -m "feat(arsiv): kampanyalar görünümü"`

---

### Task 7: Takvim görünümü

**Files:**
- Create: `src/components/arsiv/Takvim.astro`
- Modify: `src/pages/arsiv/index.astro`, `src/scripts/arsiv-etkilesim.ts`

**Interfaces:**
- Consumes: `takvimAyi`; gün detay tablosu için doğrudan o günün `ArsivKaydi.girisimler`'i; `paraKisa`, `paraTam`, `yuzdeBicim`.
- Produces: gün hücreleri `button[data-takvim-gun="YYYY-MM-DD"]`; gün detayları `[data-gun-detay="YYYY-MM-DD"] hidden`.

- [x] **Step 1: Uygula** — arşivin kapsadığı her ay için Pzt–Paz 7 sütunlu ızgara; renk yoğunluğu `toplam`'ın o aydaki en büyük değere oranı (sarı, opaklık 0.15–1); `kapanis-yok` nötr (tebeşir-ince), `gelecek` daha soluk, `eksik` kesikli çerçeve, `baslangic` çapraz tarama ya da `B` işareti; her hücrede gün numarası ve `aria-label="13 Ekim 2026: ₺412 B"`. Dönem seçimi hangi ayın görüneceğini belirler (son dilimi içeren ay); ay başlığında ‹ › ile diğer aylara geçilir. Hücreye tıklayınca altında o günün bülten tablosu (o günün `girisimler`'i: ad, platform, günlük giriş, toplam, hedef %, durum) açılır.
- [x] **Step 2: Doğrula** — örnek veriyle preview: hücre tıklayınca doğru günün tablosu, klavyeyle (Tab/Enter) erişilebilir; hafta sonları nötr. `npm run build` başarılı.
- [x] **Step 3: Commit** — `git commit -m "feat(arsiv): takvim görünümü"`

---

### Task 8: İndirmeler (CSV, grafik PNG, kampanya kartı PNG) ve metodoloji

**Files:**
- Create: `src/pages/arsiv/kifobu-kitle-fonlama-arsivi.csv.ts`, `src/scripts/arsiv-png.ts`
- Modify: `src/pages/arsiv/index.astro` (alt satır + metodoloji), `src/components/arsiv/Tablo.astro` (kart verisi)

**Interfaces:**
- Consumes: `csvUret`, `arsivKayitlari`; Task 5–6 `data-png-grafik`, `data-png-kart`, `data-kart`.
- Produces (`arsiv-png.ts`):
  ```ts
  export interface KampanyaKartVerisi { ad: string; platform: string; platformRenk: string; toplam: number; yuzde: number; durum: string; tarih: string; seri: number[] /* yüzde noktaları */ }
  export async function grafikPng(svg: SVGSVGElement, baslik: string): Promise<Blob>
  export async function kampanyaKartiPng(v: KampanyaKartVerisi): Promise<Blob> // 1080×1080
  ```

- [x] **Step 1: CSV uç noktası** — `export const GET: APIRoute = () => new Response(csvUret(arsivKayitlari()), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })`; statik derlemede dosya üretilir.
- [x] **Step 2: `arsiv-png.ts`** — `document.fonts.ready` beklenir; logo `/logo-saydam.png` aynı kökenden `Image` ile yüklenir.
  - `grafikPng`: SVG serileştir → `Image` → canvas (2x ölçek), çevresinde tahta zeminli çerçeve: üstte `baslik` ve `Kitle Fonlama Arşivi`, altta sol `Kaynak: platformların kampanya sayfaları · <tarih>`, sağ alt logo. Dosya adı `kifobu-arsiv-<gorunum>-<donem>-<tarih>.png`.
  - `kampanyaKartiPng`: 1080×1080 tahta zemin; girişim adı (Sofia Sans Extra Condensed 800, büyük), platform (renk noktası), toplam `paraKisa`, `hedefin %50,6'sı`, durum, `seri`'den küçük dolma çizgisi + %100 kesikli hedef çizgisi; altta `Kaynak: <platform> kampanya sayfası · <tarih>`, sağ alt logo. Dosya adı `kifobu-<ad-kucuk-harf>-<tarih>.png`.
  - İndirme `URL.createObjectURL` + geçici `<a download>`.
- [x] **Step 3: Alt satır ve metodoloji** — sayfa sonunda: `Kaynak: platformların kampanya sayfaları` · `Metodoloji` (aynı sayfada `<details>`) · `CSV indir ↓` (`/arsiv/kifobu-kitle-fonlama-arsivi.csv`, `download`) · görünür grafik için `PNG indir ↓`. Metodoloji maddeleri: veri hafta içi her gün 18:00 kapanışında platformların kampanya sayfalarından alınır; günlük giriş, toplamın bir önceki kapanışa göre farkıdır; Pazartesi değeri hafta sonu girişlerini de içerir; bir kampanya taranamadığında o gün "Veri alınamadı" olarak işaretlenir ve son bilinen toplam gösterilir, ertesi günün girişi önceki günle birlikte gösterilir (*); serinin ilk günü başlangıç günüdür ve günlük girişi hesaplanmaz; seri başlangıcı <ilk kayıt tarihi>.
- [x] **Step 4: Doğrula** — `npm run build` → `dist/arsiv/kifobu-kitle-fonlama-arsivi.csv` var (boş arşivde yalnızca başlık). Örnek veriyle preview: CSV iner ve Excel'de Türkçe karakterler bozulmaz (BOM); grafik PNG ve kart PNG iner, `javascript_tool` ile üretilen blob'u `<img>` olarak sayfaya basıp ekran görüntüsüyle logo, yazı tipi ve renklerin doğru çıktığını gör; konsolda "tainted canvas" hatası yok.
- [x] **Step 5: Commit** — `git commit -m "feat(arsiv): CSV, PNG indirme ve metodoloji"`

---

### Task 9: Son kontrol ve yayın öncesi doğrulama

- [x] **Step 1:** `npm test` → tümü PASS. `npm run build` → başarı, uyarısız.
- [x] **Step 2:** `git diff origin/main -- package-lock.json` → boş (lockfile değişmedi).
- [x] **Step 3:** Gerçek (boş) arşivle preview: boş durum metni, menü, ana sayfa bağlantısı, CSV başlığı. Örnek veriyle preview: üç görünüm × üç dönem, açık ve 375px.
- [x] **Step 4:** `src/data/arsiv/` altında örnek dosya olmadığını doğrula (`git ls-files src/data/arsiv` → boş ya da yalnızca bot kayıtları).
- [x] **Step 5:** Push kullanıcı onayıyla yapılır (bot da aynı dala push ettiği için önce `git pull --rebase`). Push sonrası Cloudflare derlemesinin geçtiği kontrol edilir.
