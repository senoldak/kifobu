# Kitle Fonlama Arşivi — tasarım

Tarih: 2026-10-13 · Durum: onay bekliyor

## Amaç ve neden

kifobu her gün bir kitle fonlama bülteni yayımlıyor: kampanyaların toplanan tutarı, günlük girişi ve platform dökümü. Bu veri şu an her gün siliniyor, çünkü bot `src/data/bulten.ts` dosyasını her çalışmada baştan yazıyor ve `bulten-referans.json` sadece bir önceki kapanışı tutuyor.

İstenen şey bu verinin birikmesi ve okura açık bir **Kitle Fonlama Arşivi** sayfasında sunulması. Okur günlük, haftalık ve aylık para akışını grafiklerle gezebilmeli. Sayfa aynı zamanda kifobu'nun veri odaklı bir yayın olduğunun kanıtı olacak. Hedeflenen ton "Bloomberg seviyesi": ciddi, yoğun, kaynağı belli, oyuncaklı ya da şakacı değil.

## Hedefler

- Kapanış botunun her gün o günün tablosunu kalıcı bir arşiv dosyasına yazması.
- `/arsiv/` adresinde, üç görünüm arasında geçiş yapılabilen tek bir sayfa:
  - **Akış:** Günlük/Haftalık/Aylık seçimli, platform renklerine göre yığılmış çubuk grafik ve altında o dönemin kampanya tablosu.
  - **Kampanyalar:** Her kampanyanın kampanya süresince toplanan tutarının çizgisi ve hedef çizgisi.
  - **Takvim:** Her gün bir kutu, renk yoğunluğu o günün toplam girişini gösteriyor. Kutuya tıklayınca o günün bülten tablosu aynı sayfada açılıyor.
- Sayfanın üstünde her görünümde sabit duran özet rakamlar. Her biri önceki döneme göre değişimiyle gösteriliyor.
- Okurun son seçtiği görünüm ve dönem tarayıcıda hatırlanıyor.
- İndirmeler:
  - **Kampanya kartı (PNG):** Tablodaki her satırda bir düğme.
  - **Genel grafik (PNG):** Okurun o an baktığı görünüm.
  - **CSV:** Arşivin tamamı.
- Sayfanın altında kaynak satırı ve kısa bir metodoloji notu.
- Sayfaya üst menüden ve ana sayfadaki bülten tablosunun yanındaki bir bağlantıdan ulaşılması.
- Ek altyapı maliyeti olmaması. Veritabanı, sunucu ya da ücretli servis kullanılmıyor.

## Hedef dışı

- Kampanyaya özel ayrı bir sayfa. Kullanıcı bunu daha sonra ayrıca tasarlatacak. Şimdilik her şey `/arsiv/` içinde kalıyor.
- İlk gerçek kapanış öncesi veri. Eski sayılar elde yok, git'teki anlık görüntüler de kapanış sayılmaz (bkz. çağrılar).
- Canlı (saatlik) güncellemelerin arşivlenmesi. Arşivin birimi günlük kapanış.

## Yapılmaması gerekenler (anti-hedefler)

- **Grafiğin yalan söylemesi.** Bot bir kampanyayı tarayamadığında bugün sessizce dünkü rakamı yazıyor (`scripts/bulten-bot.ts`, catch bloğu). Arşivde böyle bir gün "veri alınamadı" diye işaretlenmeli, sıfır ya da gerçek bir değer gibi gösterilmemeli.
- **Şakacı veya pazarlama dili.** Başlıklar sade olmalı: "Kitle Fonlama Arşivi", "Akış", "Kampanyalar", "Takvim". "Para nereye aktı?" gibi cümleler kullanılmamalı.
- **Haber kuruluşlarının adı ya da bağlantısı.** Sitenin genel kuralı bu. Kaynak olarak yalnızca platformların kendi kampanya sayfaları gösteriliyor.
- **Seyrek veriyi saklamak.** Seri yeni başladı. Bu açıkça yazılmalı ("Seri başlangıcı <ilk kapanış tarihi>"). Boş alanlar sahte dolgu ile doldurulmamalı.

## Kısıtlar ve mevcut durum

- Site Astro 7, statik derleniyor ve Cloudflare'de yayında. Bağımlılıklar şu an yalnızca `astro`, `@astrojs/rss` ve `@astrojs/sitemap`. Görsel scriptleri `sharp` kullanıyor.
- **Windows'ta `npm install` çalıştırmak Linux lockfile'ını bozuyor** (`@emnapi` paketleri düşüyor). Bu yüzden yeni npm bağımlılığından kaçınılmalı. Eklenirse Cloudflare derlemesi mutlaka kontrol edilmeli.
- Bot zamanlaması Cloudflare'deki "saat" Worker'ında. Hafta içi Oslo 09:00–16:00 arası canlı güncelleme, 17:00'de kapanış (= TR 18:00). Hafta sonu kapanış yok. Kapanış `.github/workflows/bulten-otomasyon.yml` içinde `npm run bulten:kapanis` ile çalışıyor. Commit adımı `git add -A src/data/ public/ scripts/bot/` olduğu için `src/data/` altına yazılan arşiv dosyaları otomatik commit'leniyor.
- `bugun` (günlük giriş) değeri `toplanan − referans.girisimler[ad]` olarak hesaplanıyor. Pazartesi değeri bu yüzden hafta sonu girişlerini de içeriyor. Metodoloji notunda bu belirtilmeli.
- Platform adları ve renkleri `src/data/bulten-kaynaklari.ts` → `PLATFORM_AYARLARI` içinde.
- Tasarım dili `DESIGN.md` dosyasında: tahta rengi, tebeşir tonları, sarı/pembe/mavi vurgular ve Sofia Sans ailesi. Logo `public/logo-saydam.png`, işaret `brand/kifobu-isaret.png`.
- `src/pages/[slug].astro` kategori sayfalarını yakalıyor. `/arsiv/` için ayrı bir statik sayfa dosyası gerekiyor. Statik rota dinamik rotadan önce gelir.

## Kullanıcının verdiği kararlar

- Üç görünümün üçü de olacak ve okur aralarında seçim yapacak.
- Grafiklerde platform kırılımı görünecek.
- Ton ciddi ve yoğun olacak (onaylanan taslak "v2").
- CSV indirme ve metodoloji notu olacak.
- PNG indirmede kifobu logosu olacak. Hem kampanya kartı hem genel grafik indirilebilecek.
- Kampanya sayfası sonraya kalıyor.
- Arşiv bugünden başlıyor ("hiç yoktan iyidir").

## Tasarımcının (Claude) çağrıları — kullanıcı onayı bekleyen varsayımlar

- **Adres:** `/arsiv/`. Menü etiketi: "Arşiv".
- **Varsayılan görünüm:** Akış / Günlük. Az veriyle en dolu görünen görünüm bu.
- **Veri biçimi:** Her kapanış günü için bir dosya, `src/data/arsiv/YYYY-MM-DD.json`. İçeriği:
  - `tarih` (ISO) ve `sayi`
  - `girisimler[]`: `ad`, `platform`, `bugun`, `alinan`, `kalan`, `hedef`, `degerleme`, `yuzde`, `durum` ve `veriAlinamadi: boolean`
  - `platformlar[]`: `anahtar`, `ad`, `renk`, `bugun`, `toplam`
  - Not: `hedef` alanı bugün `bulten.ts` dosyasında yok, `bulten-kaynaklari.ts` → `hedefFon` içinde. Kampanyalar görünümündeki hedef çizgisi için arşive yazılmalı.
- **Geriye dönük doldurma yok, seri ilk gerçek kapanışla başlıyor.** Git geçmişi incelendiğinde gerçek bir kapanış yok:
  - 11.10 bir Pazar ve o günkü kapanış büyük olasılıkla elle yapılmış bir deneme çalışması.
  - 12.10'da kapanış hiç çalışmamış.
  - Elde kalan anlık görüntülerin hepsinde `bugun = 0`.

  Bunları arşive yazmak sahte veri olurdu. Seri ilk gerçek kapanışla başlıyor (beklenen tarih 13.10.2026). Künyedeki "Seri başlangıcı" bu tarihi gösterecek.

  O ilk kapanışın `bugun` değeri 11.10 referansına göre hesaplanacağı için birkaç günün girişini birlikte içerecek. Bu yüzden ilk gün **başlangıç günü** olarak işaretlenecek: toplamlar arşive girecek ama o günün çubuğu ve günlük girişi gösterilmeyecek.
- **"Veri alınamadı" kuralı:** Bir kampanya için aşağıdakilerden biri olursa `veriAlinamadi: true` yazılacak:
  - Tarama hata fırlatırsa.
  - Önceki kapanışta sıfırdan büyük olan toplam bu kez 0 gelirse (desen eşleşmediği için sessizce 0 dönmesi).
  - Toplam önceki kapanışa göre düşerse.

  Böyle bir günde arşive son bilinen toplam yazılacak, `bugun` ise `null` olacak. Grafikte o kampanyanın o günkü payı "veri alınamadı" olarak işaretlenecek.

  Ertesi günün `bugun` değeri birden fazla günün girişini içereceği için o kayda `birikmis: true` eklenecek. Tabloda ve grafik ipucunda "önceki günle birlikte" notu düşülecek.

  Botun mevcut davranışı da değişmiyor: hata günlerinde `bulten.ts` dünkü toplamı göstermeye devam ediyor. Bayrak yalnızca arşivi etkiliyor.
- **Dönem seçimi tüm sayfayı yönetiyor.** Günlük/Haftalık/Aylık seçici özet rakamların hemen üstünde duracak ve üç görünümün hepsine uygulanacak:
  - **Özet rakamlar:** Seçili dönemin son dilimi (bugün, bu hafta, bu ay) ile bir önceki dilim karşılaştırılıyor.
  - **Akış:** Dönem gruplamasıyla çiziliyor.
  - **Kampanyalar:** Çizgiler her zaman kampanyanın tüm süresini gösteriyor. Dönem seçimi yalnızca tablodaki "dönem girişi" sütununu etkiliyor.
  - **Takvim:** Seçili son dilimi içeren ay açılıyor.

  Platform payı, dönem içindeki girişin payı olarak hesaplanıyor (kümülatif toplamın değil). "Aktif kampanya", durumu "SONA ERDİ" olmayan kampanyalar.
- **Grafikler:** Harici kütüphane kullanılmayacak. Derleme sırasında Astro'da SVG olarak üretilecek, görünüm ve dönem geçişi için küçük bir vanilla JS yazılacak. Gerekçe: yeni npm bağımlılığı yok (yukarıdaki lockfile sorunu), sayfa hafif kalıyor, görünüm tamamen kifobu'nun tasarım dilinde.
- **PNG üretimi:** Tarayıcıda, SVG → canvas → PNG yoluyla. Sunucu gerekmiyor.
  - Kampanya kartı 1080×1080. İçeriği: girişim adı, platform, toplanan tutar, hedefe göre yüzde, durum/kalan gün ve küçük dolma grafiği. Köşede logo, tarih ve "Kaynak: <platform> kampanya sayfası".
  - Genel grafik: görünümün kendi oranında, aynı logolu çerçeve ile.
- **CSV:** Derleme sırasında `/arsiv/kifobu-kitle-fonlama-arsivi.csv` olarak üretilecek. Her satır bir gün × kampanya.
- **Özet rakamlar:** Dönem toplamı, günlük ortalama, aktif kampanya sayısı ve platform payları. Önceki eşit uzunluktaki döneme göre değişim gösterilecek. Önceki dönem için veri yoksa değişim "—" olacak.
- **Takvim:** Kapanış olmayan günler (hafta sonu) ayrı ve nötr bir tonda gösterilecek. "Veri alınamadı" günleri kesikli çerçeveyle işaretlenecek.
- **Mobil:** Tablo yatay kaydırılabilecek. Grafikler tam genişlikte olacak. Sekmeler dokunmaya uygun boyutta olacak.
- **Ana sayfa bağlantısı:** `BugunTahta` bileşeninin altına "Arşiv →" eklenecek.

## Tasarımcıya bırakılanlar

- Bileşenlerin bölünmesi ve dosya adları.
- Haftalık/aylık gruplamanın tam kuralı. Önerim: ISO hafta, Pazartesi başlangıç, takvim ayı.
- Metodoloji notunun son metni.
- Renk yoğunluğu ölçeği ve eksen biçimlendirmesi (B = bin, M = milyon, Türkçe ondalık virgül).

## Referans

Onaylanan görsel taslak (v2): sade başlık ve künye satırı, değişimli özet rakamlar, "Akış / Kampanyalar / Takvim" sekmeleri, platform renkli yığılmış çubuklar, kampanya tablosu, en altta "Kaynak · Metodoloji · CSV indir".
