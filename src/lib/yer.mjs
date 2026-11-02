// Yer haritası: yalnız yerin haberin özü olduğu haberlerde (tidsrøst kuralı). kifobu'da bu, Türkiye'deki bir girişimin
// haberi ve metinde "<İl> merkezli" ifadesi demek; harita o ili Türkiye sınırı üzerinde gösterir. Bot haberlerinin çoğu
// yurt dışındaki girişimler olduğu için harita az haberde çıkar.
// Sınır: Natural Earth 1:10m Admin 0 (kamu malı), 1 km toleransla sadeleştirilmiş (src/data/turkiye-sinir.json;
// vesaire/tertremo scripts/sinir.mjs üretti). İl merkezleri: il merkezinin yaklaşık boylam ve enlemi.

export const ILLER = {
  İstanbul: [28.98, 41.01], Ankara: [32.85, 39.93], İzmir: [27.14, 38.42], Bursa: [29.06, 40.18], Antalya: [30.71, 36.9],
  Kocaeli: [29.92, 40.77], Konya: [32.49, 37.87], Gaziantep: [37.38, 37.07], Kayseri: [35.49, 38.73], Eskişehir: [30.52, 39.78],
  Adana: [35.32, 37.0], Mersin: [34.64, 36.81], Trabzon: [39.72, 41.0], Samsun: [36.33, 41.29], Denizli: [29.09, 37.78],
  Sakarya: [30.4, 40.78], Tekirdağ: [27.51, 40.98], Diyarbakır: [40.23, 37.91], Erzurum: [41.27, 39.9], Malatya: [38.31, 38.35],
};

const MERKEZLI = new RegExp(`(?<![\\p{L}])(${Object.keys(ILLER).join('|')}) merkezli`, 'u');

/** Haritası çizilecek il ya da null. Yalnız künyesinde girişim olan bot haberi ve gövdede "<İl> merkezli". */
export function haberinIli({ girisim, uretim, govde }) {
  if (!girisim || uretim !== 'yapay-zeka') return null;
  return String(govde ?? '').match(MERKEZLI)?.[1] ?? null;
}

// Çizim kutusu (boylam/enlem) ve enlem ölçeği: Türkiye ve kıyıları.
const B0 = 25.6, B1 = 44.9, E0 = 35.7, E1 = 42.2, GEN = 640;
const KX = Math.cos((39 * Math.PI) / 180);
export const HARITA_BOY = Math.round((GEN * (E1 - E0)) / ((B1 - B0) * KX));
const x = (b) => ((b - B0) / (B1 - B0)) * GEN;
const y = (e) => ((E1 - e) / (E1 - E0)) * HARITA_BOY;
const r1 = (v) => Math.round(v * 10) / 10;

/** Türkiye sınırı ve il işareti: { yol, cx, cy, genislik, yukseklik }. halkalar: [[boylam, enlem], ...][] */
export function haritaCiz(halkalar, il) {
  const yol = halkalar.map((h) => `M${h.map(([b, e]) => `${r1(x(b))} ${r1(y(e))}`).join('L')}Z`).join('');
  const [b, e] = ILLER[il];
  return { yol, cx: r1(x(b)), cy: r1(y(e)), genislik: GEN, yukseklik: HARITA_BOY };
}
