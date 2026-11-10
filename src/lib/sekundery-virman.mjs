// Virman süreleri: ilan dönemi kapandıktan sonra girişimin "Pay Virman Tamamlanma Duyurusu"na kadar geçen gün.
// Veri src/data/sekundery/virman.json (dönem ve virman duyurularından derlendi; süre = duyuru − (kapanış + 1), sahibin Excel yöntemi).
import { medyan } from './sekundery.mjs';

const AY = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const ayKisa = (t) => AY[Number(t.slice(5, 7)) - 1];
export const uzunTarih = (t) => new Date(`${t.slice(0, 10)}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
export const sayiYaz = (n) => (n == null ? '' : n.toLocaleString('tr-TR'));
export const kisaUnvan = (u) =>
  u.replace(/\s*\(.*\)$/, '').replace(/\s+(ANONİM ŞİRKETİ|LİMİTED ŞİRKETİ)( ŞUBESİ)?$/u, '').replace(/\s+(SANAYİ VE TİCARET|SANAYİ TİCARET|TİCARET)$/u, '');

/** Kapanmış dönemler (açık dönem gösterilmez) ve her dönemin medyanı. @param {any} V virman.json @param {string} bugun YYYY-MM-DD */
export function virmanOzeti(V, bugun) {
  const donemler = V.donemler.filter((d) => d.kapanis < bugun);
  const sirketler = Object.entries(V.sirketler).filter(([, s]) => Object.keys(s.virman).length);
  const donemMedyan = donemler.map((d) => medyan(sirketler.map(([, s]) => s.virman[d.acilis]?.gun).filter((x) => x != null)));
  const donemSayi = donemler.map((d) => sirketler.filter(([, s]) => s.virman[d.acilis]).length);
  const tumMedyan = medyan(sirketler.flatMap(([, s]) => donemler.map((d) => s.virman[d.acilis]?.gun).filter((x) => x != null)));
  return { donemler, sirketler, donemMedyan, donemSayi, tumMedyan };
}

/** Hücre rengi: kısa süre krem, orta ayçiçeği sarısı, uzun hardal; yazı hep mürekkep (sahibi: koyu renk istemedi). */
/** virmanRengi'nin 10 kovalı hâli (0–9); sayfa satır içi stil kullanamadığı için sınıf adı olarak verilir. */
export const virmanKova = (g) => Math.min(9, Math.max(0, Math.round(Math.min(g / 45, 1) * 9)));

export function virmanRengi(g) {
  const t = Math.min(g / 45, 1);
  const d = [[252, 249, 238], [246, 222, 140], [214, 160, 40]];
  const [a, b, u] = t < 0.5 ? [d[0], d[1], t * 2] : [d[1], d[2], (t - 0.5) * 2];
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * u)).join(',')})`;
}

/** Tablolarda kodun altında gösterilen şirket adı: tam unvan, yalnız şirket türü kısaltılır. */
export const tamUnvan = (u) =>
  u ? u.replace(/\s*\(.*\)$/, '').replace(/\s+ANONİM ŞİRKETİ$/u, ' A.Ş.').replace(/\s+LİMİTED ŞİRKETİ$/u, ' LTD. ŞTİ.') : null;
