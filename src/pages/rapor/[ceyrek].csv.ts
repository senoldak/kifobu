// Çeyrek raporunun tabloları tek CSV olarak (Dataset JSON-LD'sinin distribution'ı): src/lib/rapor.ts → raporCsv.
import type { APIRoute, GetStaticPaths } from 'astro';
import { yayimlananRaporlar } from '../../lib/dizin';
import { raporCsv, type CeyrekOzeti } from '../../lib/rapor';

export const getStaticPaths = (async () => {
  const { raporlar } = await yayimlananRaporlar();
  return raporlar.map((o) => ({ params: { ceyrek: o.ceyrek.slug }, props: { o } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props, site }) => {
  const { o } = props as { o: CeyrekOzeti };
  return new Response(raporCsv(o, new URL(`/rapor/${o.ceyrek.slug}/`, site).href), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
};
