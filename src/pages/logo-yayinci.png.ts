// Yayıncı logosu (600×60 PNG): haber JSON-LD'sinde publisher.logo olarak kullanılır (bkz. src/kapak/ciz.ts → logoSvg).
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { logoSvg } from '../kapak/ciz';

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(logoSvg())).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
