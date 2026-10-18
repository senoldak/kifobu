---
name: kifobu
description: Kimlik v2 — kâğıt zemin, mürekkep yazı, tek marka rengi ayçiçeği sarısı; veri renkleri veriye aittir. Brand rules live in BRAND.md.
colors:
  kagit: "#f7f5ef"
  kagit-2: "#efece4"
  beyaz: "#ffffff"
  murekkep: "#141a17"
  murekkep-2: "#3b413d"
  gri: "#5d645f"
  cizgi: "#dcd9cf"
  marka-sari: "#e8b40c"
  yesil: "#10b981"
  asim: "#a7e9cf"
typography:
  family: "'Schibsted Grotesk', 'Helvetica Neue', Arial, sans-serif"
  display:
    fontSize: "clamp(2.4rem, 6vw, 4rem)"
    fontWeight: 700
    letterSpacing: "-0.03em"
  headline:
    fontWeight: 700
    letterSpacing: "-0.025em"
  figure:
    fontWeight: 600
    letterSpacing: "-0.03em"
    note: "no tabular-nums on big figures"
  body:
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontSize: "0.72rem"
    fontWeight: 600
    letterSpacing: "0.12em"
    textTransform: uppercase
rounded:
  none: "0px"
  bulten-karti: "8px"
components:
  ust-bant:
    borderTop: "10px solid {colors.marka-sari}"
  etiket:
    border: "1.5px solid {colors.murekkep}"
    variants: [cerceve, yesil, murekkep, gri]
  hedef-cubugu:
    note: "target tick always at the 100% point; overshoot in {colors.asim}"
---

# Design System: kifobu

> The brand (why, personality, voice, mark, colour rule, data language) is defined in `BRAND.md`.
> This file records how the site implements it. Visual reference: https://claude.ai/artifact/LHkwRvtjDVWaJZQFWJv3X7

## Overview

Light paper ground, ink text, one brand colour (sunflower yellow) used only for the mark's arm, the top band and section underlines. Numbers are the news: tables are dense and aligned, big figures are set large without tabular spacing. No photography, no textures, no shadows, no gradients. Light theme only.

## Colors

- **Marka:** kâğıt, mürekkep, gri, çizgi, ayçiçeği sarısı. Old Seans Tahtası token names (`--tahta`, `--tebesir`, `--sari`…) are aliased to these in `src/styles/global.css` so unrestyled parts stay readable.
- **Veri:** fonlandı yeşili, aşım yeşili, platform colours from `src/data/bulten.ts` (`platformlar.liste[].renk`, via `platformRengi()` in `src/lib/kimlik.ts`). The `/gunluk-bulten/` cards and the 18:00 image keep their own percent-badge colours (≥100 green, ≥50 `#0284c7`, else `#6366f1`).

## Typography

Schibsted Grotesk only (`public/fonts/schibsted-grotesk-*.woff2`, OFL). Covers and the 18:00 image draw it as glyph paths from `src/kapak/fontlar/SchibstedGrotesk[wght].ttf`. `tabular-nums` only where digits stack in columns.

## Layout

- Header: 10px yellow top border, `<Logo boyut={44} />`, bulletin counter and date on the right, menu with a 3px yellow underline on the current page. Footer: 3px yellow top rule, logo, slogan, social links, footer menu.
- Existing pages are restyled, never extended: same sections, columns, texts and order.

## Components

- **Logo** (`src/components/Logo.astro`): seed mark + "kifobu"; sizes 30/44/64 as classes (CSP forbids inline style).
- **Etiket** (`.etiket`, `.etiket--yesil|--murekkep|--gri`): outlined uppercase status tag.
- **HedefCubugu** (`src/components/HedefCubugu.astro`): SVG bar from `cubukOlcegi()`; black tick at 100%.
- **PlatformAdi** (`src/components/PlatformAdi.astro`): platform name with a 10px square in its data colour.
- **BugunTahta** (homepage board), **Bulten** (`/gunluk-bulten/`), `.veri-tablo` (day pages, directories).
- **Covers** (`src/kapak/kart.ts`): haber, künye, yatırım layouts; 1200×675, 1080×1350, 1080×1920.

## Do's and Don'ts

Do keep yellow brand-only, show figures with their date and source, truncate percentages, use SVG attributes (not `style=`) for data-driven sizes.
Don't add blocks to existing pages, use tabular-nums on headlines or big figures, invent fields a cover would need, or name non-official news sources.
