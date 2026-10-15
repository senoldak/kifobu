## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Haber kaynakları gizlidir

Repo herkese açık. Haber botunun okuduğu resmi olmayan kaynakların (haber siteleri, bloglar, ajanslar) adı, kısa adı,
alan adı ve akış adresi repoya hiçbir yerde yazılmaz: kod, test, fixture, belge, durum dosyası (`scripts/bot/gorulen.json`),
commit mesajı ve Actions logu dahil. Liste ve haber metninde anılmaması gereken yayın adları
`scripts/bot/gizli-kaynaklar.sifreli` dosyasında şifreli durur; anahtar `KAYNAK_ANAHTARI` (GitHub Secret, yerelde `.env`).
Düzenlemek için `node scripts/bot/gizli.mjs ac`, sonra `node scripts/bot/gizli.mjs kapat` (açık hâli git'e girmez).
Durum dosyasındaki kimlikler anahtarlı özettir (`gizliId`), loglarda kaynak yerine kısa kod (`kaynakKodu`) yazılır,
hata mesajlarından adresler silinir (`adresiSil`), haberin kaynakları frontmatter'da yalnız şifreli `kaynakIzi` olarak
durur (`node scripts/bot/gizli.mjs iz <haber.md>` ile okunur). Testlerde `haber.example.com` gibi uydurma adlar kullanılır.
Resmi kurumlar (SPK, MKK/VAP, TCMB, bakanlıklar) ve kitle fonlama platformlarının kendi sayfaları bu kurala dahil değildir.
