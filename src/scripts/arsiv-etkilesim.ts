const ANAHTAR = 'kifobu-arsiv';
const GORUNUMLER = ['akis', 'kampanyalar', 'takvim'];
const DONEMLER = ['gun', 'hafta', 'ay'];

const kok = document.getElementById('arsiv');

function oku(): { gorunum?: string; donem?: string } {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    return ham ? (JSON.parse(ham) ?? {}) : {};
  } catch {
    return {};
  }
}

function yaz(gorunum: string, donem: string) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify({ gorunum, donem }));
  } catch {
    /* depolama yok: sayfa yine çalışır */
  }
}

if (kok) {
  const uygula = (gorunum: string, donem: string, kaydet: boolean) => {
    kok.dataset.gorunum = gorunum;
    kok.dataset.donem = donem;
    kok.querySelectorAll<HTMLElement>('[data-donem-sec]').forEach((d) => {
      d.setAttribute('aria-pressed', String(d.dataset.donemSec === donem));
    });
    kok.querySelectorAll<HTMLElement>('[data-donem-blok]').forEach((b) => {
      b.hidden = b.dataset.donemBlok !== donem;
    });
    kok.querySelectorAll<HTMLElement>('[role=tab][data-gorunum-sec]').forEach((s) => {
      const secili = s.dataset.gorunumSec === gorunum;
      s.setAttribute('aria-selected', String(secili));
      s.tabIndex = secili ? 0 : -1;
    });
    kok.querySelectorAll<HTMLElement>('[role=tabpanel][data-gorunum-panel]').forEach((p) => {
      p.hidden = p.dataset.gorunumPanel !== gorunum;
    });
    const png = kok.querySelector<HTMLElement>('[data-png-indir]');
    if (png) {
      const yok = !grafikBul();
      png.setAttribute('aria-disabled', String(yok));
      if (yok) png.title = 'Takvim görünümü için PNG yok';
      else png.removeAttribute('title');
    }
    if (kaydet) yaz(gorunum, donem);
    if (donem !== sonDonem) {
      sonDonem = donem;
      takvimAyiGoster(null);
    }
  };

  // Takvim: görünen ay, dönemin varsayılanına sıfırlanır; ‹ › arşivin ayları arasında gezer.
  let sonDonem = '';
  const takvim = kok.querySelector<HTMLElement>('[data-takvim]');
  const takvimVeri = <T,>(ad: string, yedek: T): T => {
    try {
      return JSON.parse(takvim?.getAttribute(ad) ?? '') as T;
    } catch {
      return yedek;
    }
  };
  const aylar = takvimVeri<string[]>('data-aylar', []);
  const varsayilan = takvimVeri<Record<string, string>>('data-varsayilan', {});

  function gunKapat() {
    takvim?.querySelectorAll<HTMLElement>('[data-gun-detay]').forEach((d) => (d.hidden = true));
    takvim?.querySelectorAll<HTMLElement>('[data-takvim-gun]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  function takvimAyiGoster(ay: string | null) {
    if (!takvim || aylar.length === 0) return;
    const hedef = ay && aylar.includes(ay) ? ay : (varsayilan[kok!.dataset.donem ?? 'gun'] ?? aylar[aylar.length - 1]);
    const i = Math.max(0, aylar.indexOf(hedef));
    takvim.dataset.ay = aylar[i];
    gunKapat();
    takvim.querySelectorAll<HTMLElement>('[data-takvim-ay]').forEach((b) => {
      const goster = b.dataset.takvimAy === aylar[i];
      b.hidden = !goster;
      if (goster) takvim.querySelector('[data-takvim-baslik]')!.textContent = b.dataset.ayAdi ?? '';
    });
    takvim.querySelector<HTMLButtonElement>('[data-takvim-onceki]')!.disabled = i === 0;
    takvim.querySelector<HTMLButtonElement>('[data-takvim-sonraki]')!.disabled = i === aylar.length - 1;
  }

  function takvimTikla(hedef: Element) {
    const adim = hedef.closest('[data-takvim-onceki]') ? -1 : hedef.closest('[data-takvim-sonraki]') ? 1 : 0;
    if (adim) {
      const i = aylar.indexOf(takvim!.dataset.ay ?? '');
      if (aylar[i + adim]) takvimAyiGoster(aylar[i + adim]);
      return true;
    }
    const gun = hedef.closest<HTMLElement>('[data-takvim-gun]');
    if (!gun) return false;
    const detay = takvim!.querySelector<HTMLElement>(`[data-gun-detay="${gun.dataset.takvimGun}"]`);
    const acik = detay ? detay.hidden : false;
    gunKapat();
    if (detay && acik) {
      detay.hidden = false;
      gun.setAttribute('aria-expanded', 'true');
    }
    return true;
  }

  // Görünen panel ve dönemin masaüstü grafiği (mobil varyant PNG için işaretli değil).
  function grafikBul(): SVGSVGElement | null {
    const panel = kok!.querySelector('[role=tabpanel]:not([hidden])');
    const adaylar = panel ? [...panel.querySelectorAll<SVGSVGElement>('svg[data-png-grafik]')] : [];
    return adaylar.find((s) => !s.parentElement?.closest('[hidden]')) ?? null;
  }

  async function pngIndir(hedef: Element) {
    const { grafikPng, kampanyaKartiPng, indir } = await import('./arsiv-png.ts');
    const { dosyaParcasi, tarihTr } = await import('../lib/arsiv/bicim.ts');
    const tarih = kok!.dataset.sonTarih ?? '';
    const kart = hedef.closest('[data-png-kart]')?.closest('tr[data-kart]');
    if (kart) {
      const v = JSON.parse(kart.getAttribute('data-kart') ?? '{}');
      return indir(await kampanyaKartiPng(v), `kifobu-${dosyaParcasi(v.ad)}-${v.tarih}.png`);
    }
    const svg = grafikBul();
    if (!svg) return;
    const { gorunum, donem } = simdi();
    const blob = await grafikPng(svg, svg.dataset.pngBaslik ?? 'Kitle Fonlama Arşivi', tarihTr(tarih));
    indir(blob, `kifobu-arsiv-${gorunum}-${donem}-${tarih}.png`);
  }

  const simdi = () => ({
    gorunum: kok.dataset.gorunum ?? 'akis',
    donem: kok.dataset.donem ?? 'gun',
  });

  const kayitli = oku();
  uygula(
    GORUNUMLER.includes(kayitli.gorunum ?? '') ? kayitli.gorunum! : 'akis',
    DONEMLER.includes(kayitli.donem ?? '') ? kayitli.donem! : 'gun',
    false,
  );

  kok.addEventListener('click', (e) => {
    const hedef = e.target instanceof Element ? e.target : null;
    if (hedef && takvim?.contains(hedef) && takvimTikla(hedef)) return;
    if (hedef?.closest('[data-metodoloji-ac]')) {
      const m = kok.querySelector<HTMLDetailsElement>('#metodoloji');
      if (m) m.open = true;
      return;
    }
    const png = hedef?.closest('[data-png-kart], [data-png-indir]');
    if (png) {
      if (png.getAttribute('aria-disabled') === 'true') return;
      pngIndir(png).catch((hata) => console.error('PNG indirilemedi', hata));
      return;
    }
    const donemDugme = hedef?.closest<HTMLElement>('[data-donem-sec]');
    if (donemDugme) return uygula(simdi().gorunum, donemDugme.dataset.donemSec!, true);
    const sekme = hedef?.closest<HTMLElement>('[role=tab][data-gorunum-sec]');
    if (sekme) uygula(sekme.dataset.gorunumSec!, simdi().donem, true);
  });

  kok.addEventListener('keydown', (e) => {
    const sekme = e.target instanceof Element ? e.target.closest<HTMLElement>('[role=tab]') : null;
    if (!sekme || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const i = GORUNUMLER.indexOf(sekme.dataset.gorunumSec ?? '');
    if (i < 0) return;
    const yon = e.key === 'ArrowRight' ? 1 : -1;
    const yeni = GORUNUMLER[(i + yon + GORUNUMLER.length) % GORUNUMLER.length];
    e.preventDefault();
    uygula(yeni, simdi().donem, true);
    kok.querySelector<HTMLElement>(`[role=tab][data-gorunum-sec="${yeni}"]`)?.focus();
  });
}
