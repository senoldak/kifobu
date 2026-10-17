# kifobu

Astro ile yapılmış, Cloudflare'de ücretsiz yayınlanan haber sitesi. Haberler Markdown dosyası olarak GitHub'da saklanır.

## Yapı

| Klasör / dosya | Ne işe yarar |
|---|---|
| `src/content/haberler/<haber>/index.md` | Her haber kendi klasöründe, kapak resmiyle birlikte |
| `src/lib/site.ts` | Site adı, açıklama, sosyal medya linkleri, kategoriler |
| `src/styles/global.css` | Tasarım (renkler en üstte) |

## Kurulum (bir kerelik)

1. **GitHub:** github.com'da `kifobu` adında bir repo aç ve bu klasörü yükle.
2. **Cloudflare:** Workers & Pages → Create → Pages → GitHub reposunu bağla.
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Alan adı:** Pages projesinde Custom domains → `kifobu.com` ekle.

## Günlük kullanım

Haber eklemek için `src/content/haberler/` altına Markdown dosyası ekleyip GitHub'a gönder. Site 1-2 dakika içinde güncellenir. Ön bilgi (frontmatter) alanları:

- **Manşet:** Anasayfanın en üstünde büyük gösterilir.
- **Son dakika:** Kırmızı şeritte gösterilir.
- **Taslak:** Sitede görünmez.

## Bilgisayarda çalıştırma

```bash
npm install
npm run dev
```
