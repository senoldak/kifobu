// Haber sayfasının okuma araçları: yazı boyu, yüksek karşıtlık, okuma modu, yazdır, Dinle, Paylaş menüsü (bağlantıyı
// kopyala), ilerleme çizgisi, sözcük açıklamaları ve "Bu haber işine yaradı mı?". Tek paket (CSP: satır içi betik yok).
// Tarayıcı depolaması try/catch içinde: gizli pencerede ya da engelliyken araçlar çalışır, yalnız hatırlamaz.
// tidsrøst src/scripts/leseverktoy.ts uyarlaması.
import { ilerleme, olcekDegeri, turkceSes } from '../lib/okuma.mjs';

const kok = document.documentElement;
const oku = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const yaz = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* depolama engelli */
  }
};
const duyuru = document.querySelector('.yh-duyuru');

// ——— Yazı boyu ———
function olcekKoy(s: string, hatirla: boolean) {
  kok.dataset.olcek = s;
  document.querySelectorAll<HTMLButtonElement>('.olcek button[data-olcek]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.olcek === s)));
  if (hatirla) yaz('yazi-boyu', s);
}
olcekKoy(olcekDegeri(oku('yazi-boyu')), false);
document.querySelectorAll<HTMLButtonElement>('.olcek button[data-olcek]').forEach((b) => b.addEventListener('click', () => olcekKoy(olcekDegeri(b.dataset.olcek), true)));

// ——— Yüksek karşıtlık ———
const karsitlik = document.querySelector<HTMLButtonElement>('[data-karsitlik]');
function karsitlikKoy(acik: boolean, hatirla: boolean) {
  kok.classList.toggle('yh-karsitlik', acik);
  karsitlik?.setAttribute('aria-pressed', String(acik));
  if (hatirla) yaz('karsitlik', acik ? '1' : '0');
}
karsitlikKoy(oku('karsitlik') === '1', false);
karsitlik?.addEventListener('click', () => karsitlikKoy(!kok.classList.contains('yh-karsitlik'), true));

// ——— Yazdır ———
document.querySelector('[data-yazdir]')?.addEventListener('click', () => print());

// ——— Okuma modu (Esc ile çıkılır) ———
function okumaModu(acik: boolean) {
  if (kok.classList.contains('yh-okuma') === acik) return;
  kok.classList.toggle('yh-okuma', acik);
  if (acik) {
    document.querySelector<HTMLDetailsElement>('.yh-arac details.boy')?.removeAttribute('open');
    scrollTo({ top: 0 });
  }
}
document.querySelector('[data-okuma]')?.addEventListener('click', () => okumaModu(true));
document.querySelector('.yh-okuma-cik')?.addEventListener('click', () => okumaModu(false));

// ——— Menüler: aynı anda biri açık; dışarı tıklayınca ve Esc ile kapanır ———
const acikMenuler = () => document.querySelectorAll<HTMLDetailsElement>('.yh-arac details[open]');
document.querySelectorAll<HTMLDetailsElement>('.yh-arac details').forEach((d) =>
  d.addEventListener('toggle', () => {
    if (d.open) acikMenuler().forEach((o) => o !== d && (o.open = false));
  }),
);
document.addEventListener('click', (e) => acikMenuler().forEach((d) => !d.contains(e.target as Node) && (d.open = false)));
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  acikMenuler().forEach((d) => (d.open = false));
  okumaModu(false);
});

// ——— Bağlantıyı kopyala ———
document.querySelectorAll<HTMLButtonElement>('.yh-arac .kopyala').forEach((d) => {
  if (!navigator.clipboard?.writeText) return;
  d.hidden = false;
  const ilk = d.textContent ?? 'Bağlantıyı kopyala';
  d.addEventListener('click', async () => {
    let tamam = true;
    try {
      await navigator.clipboard.writeText(d.dataset.url ?? location.href);
    } catch {
      tamam = false;
    }
    if (duyuru) duyuru.textContent = tamam ? 'Bağlantı kopyalandı.' : 'Bağlantı kopyalanamadı.';
    d.textContent = tamam ? 'Kopyalandı' : 'Kopyalanamadı';
    setTimeout(() => (d.textContent = ilk), 2000);
  });
});

// ——— Dinle (tarayıcının konuşma sentezi; desteklemeyen tarayıcıda düğme gizli kalır) ———
const dinle = document.querySelector<HTMLButtonElement>('.yh-arac .dinle');
if (dinle && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
  dinle.hidden = false;
  const etiket = dinle.querySelector('span');
  let sesler: SpeechSynthesisVoice[] = speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => (sesler = speechSynthesis.getVoices()));
  const parcalar = () =>
    [document.querySelector('.yh-bas h1'), document.querySelector('.yh-spot'), ...document.querySelectorAll('.yh-metin > p')]
      .map((el) => el?.textContent?.trim() ?? '')
      .filter(Boolean);
  let tur = 0;
  const durum = (caliyor: boolean) => {
    dinle.setAttribute('aria-pressed', String(caliyor));
    dinle.setAttribute('aria-label', caliyor ? 'Okumayı durdur' : 'Haberi dinle');
    if (etiket) etiket.textContent = caliyor ? 'Durdur' : 'Dinle';
  };
  dinle.addEventListener('click', () => {
    if (dinle.getAttribute('aria-pressed') === 'true') {
      tur++;
      speechSynthesis.cancel();
      return durum(false);
    }
    const i = turkceSes(sesler.length ? sesler : speechSynthesis.getVoices());
    const bu = ++tur;
    const p = parcalar();
    if (!p.length) return;
    speechSynthesis.cancel();
    // Paragraf paragraf: uzun okumalar bazı tarayıcılarda yarıda kesiliyor.
    p.forEach((metin, n) => {
      const s = new SpeechSynthesisUtterance(metin);
      s.lang = 'tr-TR';
      if (i >= 0) s.voice = sesler[i];
      s.rate = 0.95;
      const bitti = () => bu === tur && n === p.length - 1 && durum(false);
      s.onend = bitti;
      s.onerror = bitti;
      speechSynthesis.speak(s);
    });
    durum(true);
  });
  addEventListener('pagehide', () => speechSynthesis.cancel());
}

// ——— İlerleme çizgisi ———
const metin = document.querySelector<HTMLElement>('.yh-metin');
const cizgi = document.querySelector<HTMLElement>('.yh-ilerleme span');
if (metin && cizgi) {
  let son = 0;
  const ciz = () => {
    const r = metin.getBoundingClientRect();
    cizgi.style.width = `${(ilerleme(r.top, r.height, innerHeight) * 100).toFixed(1)}%`;
  };
  addEventListener(
    'scroll',
    () => {
      const t = Date.now();
      if (t - son > 50) {
        son = t;
        ciz();
      }
    },
    { passive: true },
  );
  ciz();
}

// ——— Sözcük açıklamaları: metindeki <button class="yh-terim" data-terim data-tanim> tek ortak balon açar ———
// Tanım textContent ile yazılır (HTML olarak asla). Esc, dışarı tıklama, başka sözcük, kaydırma ve pencere boyu kapatır.
{
  let balon: HTMLDivElement | null = null;
  let acik: HTMLButtonElement | null = null;
  const PAY = 12;
  const kur = () => {
    if (balon) return balon;
    const b = document.createElement('div');
    b.className = 'yh-tanim';
    b.id = 'yh-tanim';
    b.setAttribute('role', 'tooltip');
    b.hidden = true;
    document.body.append(b);
    balon = b;
    return b;
  };
  const yerlestir = () => {
    if (!balon || !acik) return;
    const genislik = document.documentElement.clientWidth;
    balon.style.maxWidth = `${Math.min(300, genislik - 2 * PAY - 6)}px`;
    const satirlar = acik.getClientRects();
    const r = satirlar[satirlar.length - 1] ?? acik.getBoundingClientRect();
    const sol = Math.max(PAY, Math.min(r.left, genislik - balon.offsetWidth - PAY - 6));
    balon.style.left = `${Math.round(sol + scrollX)}px`;
    balon.style.top = `${Math.round(r.bottom + scrollY + 8)}px`;
  };
  const kapat = (odak = false) => {
    if (!acik) return;
    const d = acik;
    d.setAttribute('aria-expanded', 'false');
    d.removeAttribute('aria-describedby');
    if (balon) balon.hidden = true;
    acik = null;
    if (odak) d.focus();
  };
  const ac = (d: HTMLButtonElement) => {
    const tanim = d.dataset.tanim;
    if (!tanim) return;
    kapat();
    const b = kur();
    b.replaceChildren();
    const bas = document.createElement('b');
    bas.textContent = d.dataset.terim ?? d.textContent ?? '';
    const p = document.createElement('p');
    p.textContent = tanim;
    const alt = document.createElement('small');
    alt.append('kifobu sözlüğü · ');
    const a = document.createElement('a');
    a.href = `https://sozluk.gov.tr/?ara=${encodeURIComponent(d.dataset.terim ?? '')}`;
    a.rel = 'noopener';
    a.textContent = 'TDK’da ara';
    alt.append(a);
    b.append(bas, p, alt);
    b.hidden = false;
    acik = d;
    d.setAttribute('aria-expanded', 'true');
    d.setAttribute('aria-describedby', b.id);
    yerlestir();
  };
  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    const d = t?.closest?.('button.yh-terim') as HTMLButtonElement | null;
    if (d) {
      if (d === acik) kapat();
      else ac(d);
    } else if (acik && !t?.closest?.('.yh-tanim')) kapat();
  });
  addEventListener('keydown', (e) => e.key === 'Escape' && kapat(true));
  addEventListener('scroll', () => kapat(), { passive: true });
  addEventListener('resize', () => kapat());
}

// ——— "Bu haber işine yaradı mı?" (anonim sayım; haber ve tarayıcı başına bir yanıt) ———
const fayda = document.querySelector<HTMLElement>('.yh-fayda[data-slug]');
if (fayda) {
  const slug = fayda.dataset.slug as string;
  const anahtar = `fayda:${slug}`;
  const dugmeler = fayda.querySelectorAll<HTMLButtonElement>('button[data-yanit]');
  const tesekkur = fayda.querySelector<HTMLElement>('.tesekkur');
  const bitti = () => {
    dugmeler.forEach((b) => {
      b.disabled = true;
      b.hidden = true;
    });
    fayda.querySelector<HTMLElement>('.soru')?.setAttribute('hidden', '');
    if (tesekkur) tesekkur.hidden = false;
  };
  fayda.hidden = false;
  if (oku(anahtar)) bitti();
  else
    dugmeler.forEach((b) =>
      b.addEventListener('click', () => {
        dugmeler.forEach((d) => (d.disabled = true));
        yaz(anahtar, '1');
        fetch('/api/fayda', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, yanit: b.dataset.yanit }), keepalive: true }).catch(() => {});
        bitti();
      }),
    );
}
