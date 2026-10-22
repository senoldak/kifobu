// Yapay zekâsız yardımcılar: basit denetim sorunlarını yerelde düzeltir, uzun kaynağı taslağa göre kırpar.
// Amaç Gemini çağrısını azaltmak; ikisi de saf fonksiyon (yan etkisi yok, test edilebilir).
import { KAYNAK_ADLARI } from './kaynaklar.mjs';

// Göreli zaman ifadeleri (zamanKontrol ile aynı liste).
export const ZAMAN_KELIMELERI = ['bugün', 'dün', 'yarın', 'bu sabah', 'bu akşam', 'geçen hafta', 'bu hafta'];
export const ZAMAN = new RegExp(String.raw`(?<!\p{L})(${ZAMAN_KELIMELERI.join('|')})(?!\p{L})`, 'giu');

// Yayın kuruluşu adları (medyaKontrol ile aynı liste). Repo herkese açık olduğu için adlar koda yazılmaz:
// şifreli kaynak listesindeki adlar ve ek medya adları (kaynaklar.mjs → KAYNAK_ADLARI, bkz. gizli.mjs) kullanılır.
// MEDYA_ADLARI ortam değişkeni (JSON dizi ya da virgüllü liste) yalnızca test ve yerel deneme için ek ad verir.
function ekAdlar() {
  const ham = process.env.MEDYA_ADLARI?.trim();
  if (!ham) return [];
  try {
    const j = JSON.parse(ham);
    if (Array.isArray(j)) return j.map(String);
  } catch {
    // JSON değilse virgüllü liste
  }
  return ham.split(',').map((s) => s.trim());
}
const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const MEDYA_ADLARI = [...new Set([...KAYNAK_ADLARI, ...ekAdlar()].map((s) => s.trim()).filter(Boolean))];
// Liste boşsa desen hiçbir şeyle eşleşmez. En uzun ad önce denenir ("X Haber" "X"ten önce).
const AD_DESENI = MEDYA_ADLARI.length ? [...MEDYA_ADLARI].sort((a, b) => b.length - a.length).map(kacis).join('|') : '(?!)';
export const MEDYA = new RegExp(String.raw`(?<![\p{L}\d])(${AD_DESENI})(?![\p{L}\d])`, 'gu');

// Açık Actions loglarına yayın adı düşmesin: log satırındaki adlar "[yayın]" olur (Gemini'ye giden metin değişmez).
export const medyaGizle = (metin) => String(metin).replace(MEDYA, '[yayın]');

const TIRNAK = /[“"][^”"]*[”"]/g;

// Metni tırnak dışı parçalara ayırıp yalnız onlara fn uygular; tırnak içi aynen kalır.
function tirnakDisi(metin, fn) {
  let out = '';
  let son = 0;
  let i = 0;
  for (const m of metin.matchAll(TIRNAK)) {
    out += fn(metin.slice(son, m.index), i++) + m[0];
    son = m.index + m[0].length;
  }
  return out + fn(metin.slice(son), i);
}

const AD = `(?:${AD_DESENI})`;
// Atıf kalıpları: "X'in haberine göre," / "Y'ye göre," / "Z'nin aktardığına göre".
const ATIF = new RegExp(String.raw`(?<![\p{L}\d])${AD}['’](?:n?[ıiuü]n\s+(?:haberine|aktardığına|bildirdiğine|yazdığına)\s+göre|[ny]?[ae]\s+göre)\s*,?\s*`, 'gu');

// Tırnaktan sonra gelen parça cümle başı değildir ("… dedi"); metnin başı yalnız ilk parçadadır.
function temizle(s, i = 0) {
  return s
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,;:!?])/g, '$1')
    .replace(i === 0 ? /([.!?]\s+|^\s*|\n\s*)(\p{Ll})/gu : /([.!?]\s+|\n\s*)(\p{Ll})/gu, (_, a, b) => a + b.toLocaleUpperCase('tr-TR'));
}

function tekMetin(s) {
  if (!s) return s;
  const yeni = tirnakDisi(s, (p) => p.replace(ZAMAN, '').replace(ATIF, ''));
  if (yeni === s) return s;
  // Yalnız değişen yerde cümle başı büyütülür; temizlik tırnak dışında yapılır.
  return tirnakDisi(yeni, temizle).replace(/^\s+/, '');
}

/** Göreli zaman ifadelerini ve yayın kuruluşu atıflarını yerelde çıkarır (tırnak içine dokunmaz). */
export function yerelDuzelt(h) {
  return { ...h, title: tekMetin(h.title), description: tekMetin(h.description), body: tekMetin(h.body) };
}

// ── Kaynağı taslağa göre kırpma ───────────────────────────────────────
const sayiAnahtari = (r) => r.replace(/[.,](?=\d{3}(?!\d))/g, '').replace(',', '.');

function ipuclari(taslak) {
  const sayilar = new Set((taslak.match(/\d+(?:[.,]\d+)*/g) ?? []).filter((r) => r.length >= 2).map(sayiAnahtari));
  const adlar = new Set(taslak.match(/(?<!\p{L})\p{Lu}[\p{L}\d'’-]{2,}/gu) ?? []);
  const tirnaklar = (taslak.match(TIRNAK) ?? []).map((t) => t.slice(1, -1).trim().toLocaleLowerCase('tr-TR')).filter((t) => t.length >= 8);
  const kelimeler = new Set((taslak.toLocaleLowerCase('tr-TR').match(/\p{L}{8,}/gu) ?? []));
  return { sayilar, adlar, tirnaklar, kelimeler };
}

function puan(p, ip) {
  let s = 0;
  for (const r of p.match(/\d+(?:[.,]\d+)*/g) ?? []) if (ip.sayilar.has(sayiAnahtari(r))) s += 5;
  for (const a of new Set(p.match(/(?<!\p{L})\p{Lu}[\p{L}\d'’-]{2,}/gu) ?? [])) if (ip.adlar.has(a)) s += 2;
  const kucuk = p.toLocaleLowerCase('tr-TR');
  for (const t of ip.tirnaklar) if (kucuk.includes(t.slice(0, 40))) s += 8;
  for (const k of new Set(kucuk.match(/\p{L}{8,}/gu) ?? [])) if (ip.kelimeler.has(k)) s += 1;
  return s;
}

function parcala(kaynak) {
  const out = [];
  for (const p of kaynak.split(/\n\s*\n/)) {
    if (p.length <= 2000) { if (p.trim()) out.push(p); continue; }
    // Dev paragraf: cümlelere bölüp ~1000 karakterlik öbekler yap.
    let oba = '';
    for (const c of p.match(/[^.!?]+[.!?]*\s*/g) ?? [p]) {
      if (oba && oba.length + c.length > 1000) { out.push(oba.trim()); oba = ''; }
      oba += c;
    }
    if (oba.trim()) out.push(oba.trim());
  }
  return out;
}

/** Kaynak sinirdan uzunsa başı ve taslakla en çok örtüşen paragrafları (asıl sırasıyla) döndürür. */
export function ilgiliKisim(kaynak, taslakMetni, sinir) {
  if (kaynak.length <= sinir) return kaynak;
  const parcalar = parcala(kaynak);
  const sec = new Set();
  let boy = 0;
  // Baş (~1500 karakter) her zaman kalır.
  for (let i = 0; i < parcalar.length && boy < 1500; i++) {
    if (boy + parcalar[i].length > sinir) break;
    sec.add(i); boy += parcalar[i].length + 2;
  }
  const ip = ipuclari(taslakMetni);
  const sira = parcalar.map((p, i) => ({ i, s: puan(p, ip) })).filter((x) => !sec.has(x.i) && x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i);
  for (const { i } of sira) {
    const ek = parcalar[i].length + 9;
    if (boy + ek > sinir) continue;
    sec.add(i); boy += ek;
  }
  if (!sec.size) return kaynak.slice(0, sinir);
  const idx = [...sec].sort((a, b) => a - b);
  let out = parcalar[idx[0]];
  for (let k = 1; k < idx.length; k++) out += (idx[k] === idx[k - 1] + 1 ? '\n\n' : '\n\n[…]\n\n') + parcalar[idx[k]];
  return out;
}
