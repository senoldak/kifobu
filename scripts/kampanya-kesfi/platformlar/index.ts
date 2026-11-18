import type { Okuyucu } from '../../../src/lib/kampanya-takip.ts';
import { birikimfon } from './birikimfon.ts';
import { ecofolio } from './ecofolio.ts';
import { fonangels } from './fonangels.ts';
import { fonbulucu } from './fonbulucu.ts';
import { fongogo } from './fongogo.ts';
import { fonventure } from './fonventure.ts';
import { startupburada } from './startupburada.ts';
import { startupfon } from './startupfon.ts';
import { trinkfon } from './trinkfon.ts';

/** Platform adı -> okuyucu. Anahtar, okuyucunun `platform` değeriyle ve PLATFORM_AYARLARI anahtarlarıyla aynıdır. */
export const OKUYUCULAR: Record<string, Okuyucu> = {
  fonangels,
  trinkfon,
  ecofolio,
  fonventure,
  startupburada,
  birikimfon,
  fongogo,
  fonbulucu,
  startupfon,
};
