// Dizin ve veri sayfalarının JSON-LD'si: bölüm sayfalarıyla (src/pages/[slug]/[...page].astro) aynı kalıp —
// CollectionPage (+ ItemList) ve görünür içerik yoluyla (Yol.astro) aynı adımlı BreadcrumbList.
import { SITE } from './site';

export interface YolAdimi {
  ad: string;
  url?: string;
}

export function sayfaLd(o: {
  site: URL;
  yol: string;
  ad: string;
  aciklama: string;
  tur?: string;
  ogeler?: string[];
  adimlar: YolAdimi[];
  ek?: Record<string, unknown>;
}) {
  const siteUrl = new URL('/', o.site).href;
  const pageUrl = new URL(o.yol, o.site).href;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': o.tur ?? 'CollectionPage',
        '@id': `${pageUrl}#page`,
        name: `${o.ad} | ${SITE.name}`,
        description: o.aciklama,
        url: pageUrl,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': `${siteUrl}#website` },
        publisher: { '@id': `${siteUrl}#organization` },
        ...(o.ogeler && o.ogeler.length > 0
          ? {
              mainEntity: {
                '@type': 'ItemList',
                itemListElement: o.ogeler.map((u, i) => ({ '@type': 'ListItem', position: i + 1, url: new URL(u, o.site).href })),
              },
            }
          : {}),
        ...o.ek,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: o.adimlar.map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: a.ad,
          item: new URL(a.url ?? o.yol, o.site).href,
        })),
      },
    ],
  };
}
