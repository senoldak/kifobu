// Çeyrek raporunun paylaşım görseli ve gömülebilir özeti (1200×675 PNG): src/kapak/rapor-kart.ts.
import type { APIRoute, GetStaticPaths } from 'astro';
import { yayimlananRaporlar } from '../../lib/dizin';
import { raporKartSvg } from '../../kapak/rapor-kart';
import { onbellekliPng } from '../../lib/kapak-onbellek.mjs';
import type { CeyrekOzeti } from '../../lib/rapor';

export const getStaticPaths = (async () => {
  const { raporlar } = await yayimlananRaporlar();
  return raporlar.map((o) => ({ params: { ceyrek: o.ceyrek.slug }, props: { o } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) => {
  const { o } = props as { o: CeyrekOzeti };
  const adres = `${new URL(`/rapor/${o.ceyrek.slug}/`, site).host}/rapor/${o.ceyrek.slug}/`;
  const png = await onbellekliPng(raporKartSvg(o, adres));
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
