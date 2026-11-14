// Günün Özeti dikey kartı (1080×1350 PNG): LinkedIn gönderisinin görseli (linkedin-gorsel). Telegram yatay kapağı kullanır.
import type { APIRoute, GetStaticPaths } from 'astro';
import { dizinVerisi } from '../../../../lib/dizin';
import { ozetKayitlari, ozetSayfasi, type OzetKaydi } from '../../../../lib/gunun-ozeti';
import { ozetKartSvg } from '../../../../kapak/kart';
import { onbellekliPng } from '../../../../lib/kapak-onbellek.mjs';

export const getStaticPaths = (async () => {
  const kayitlar = ozetKayitlari(import.meta.glob('/src/data/gunun-ozeti/*.json', { eager: true, import: 'default' }));
  const { gunler } = await dizinVerisi();
  return kayitlar.map((kayit) => ({ params: { tarih: kayit.tarih }, props: { kayit, gun: gunler.find((g) => g.tarih === kayit.tarih) } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { kayit, gun } = props as { kayit: OzetKaydi; gun?: Parameters<typeof ozetSayfasi>[1] };
  const s = ozetSayfasi(kayit, gun);
  const png = await onbellekliPng(ozetKartSvg({ tarih: s.tarihAd, basliklar: s.kapakBasliklari, toplam: s.toplam, bicim: 'post' }));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
