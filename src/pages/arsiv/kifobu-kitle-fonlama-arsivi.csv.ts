import type { APIRoute } from 'astro';
import { csvUret } from '../../lib/arsiv/hesap.ts';
import { arsivKayitlari } from '../../lib/arsiv/yukle.ts';

// Statik derlemede dist/arsiv/kifobu-kitle-fonlama-arsivi.csv olarak yazılır (UTF-8 BOM'lu).
export const GET: APIRoute = () =>
  new Response(csvUret(arsivKayitlari()), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
