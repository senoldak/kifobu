import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORIES, DURUMLAR, PARA_BIRIMLERI } from './lib/site';

const slugs = CATEGORIES.map((c) => c.slug) as [string, ...string[]];
const durumlar = Object.keys(DURUMLAR) as [string, ...string[]];
const paraBirimleri = Object.keys(PARA_BIRIMLERI) as [string, ...string[]];

const haberler = defineCollection({
  loader: glob({ base: './src/content/haberler', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      category: z.enum(slugs),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      author: z.string().default('kifobu'),
      featured: z.boolean().default(false),
      breaking: z.boolean().default(false),
      draft: z.boolean().default(false),
      // Arama motorlarına kapalı (noindex, follow; site haritalarına girmez). Kapsam dışı eski haberler için (bkz. src/lib/indeks.ts).
      noindex: z.boolean().default(false),
      // Kampanya künyesi: doluysa haber tahtada ve künye bandında rakamlarıyla görünür.
      girisim: z.string().optional(),
      platform: z.string().optional(),
      toplanan: z.number().nonnegative().optional(),
      hedef: z.number().positive().optional(),
      yatirimci: z.number().int().nonnegative().optional(),
      durum: z.enum(durumlar).optional(),
      paraBirimi: z.enum(paraBirimleri).default('TRY'),
      tur: z.string().optional(), // yatırım turu: Tohum, Seri A ...
      yatirimcilar: z.string().optional(), // yatırım yapan fonlar / melekler
      // Sentez ve Bilgi Kazanımı (Information Gain)
      why_matters: z.string().optional(),
      key_points: z.array(z.string()).optional(),
      // Botun yazdığı haberler: kaynak haber ve üretim şekli sayfada gösterilir.
      kaynakAd: z.string().optional(),
      kaynakUrl: z
        .string()
        .url()
        .refine((val) => /^https?:\/\//i.test(val), {
          message: 'Sadece HTTP ve HTTPS bağlantıları kabul edilir.',
        })
        .optional(),
      // Botun kullandığı kaynakların şifreli kaydı; sitede gösterilmez (bkz. scripts/bot/gizli.mjs).
      kaynakIzi: z.string().optional(),
      uretim: z.enum(['editor', 'yapay-zeka']).default('editor'),
    }),
});

export const collections = { haberler };
