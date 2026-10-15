---
version: 1
slug: "src-layouts-base-astro"
primary_target: "src/layouts/Base.astro"
related_targets: ["src/pages/index.astro","src/pages/haber/[id].astro"]
---

# Surface brief: kifobu site theme (all reader pages)

Scope: whole reader-facing site (front page, category, article, Hakkımızda, 404). Visitor mode: Read.
Audience: the whole Turkish crowdfunding ecosystem (investors, founders, platforms, sector watchers). Job: learn daily which startup raised how much, on which platform, and read the sector news.
Constraints: Astro static, self-hosted fonts (CSP 'self'), complete without images, risk wording visible on funding stories, sample funding stories are drafts (dev only).

## Direction contract

THESIS: Every day's bulletin is a seans tahtası: the hand-chalked boards of the old İMKB trading floor. The numbers are written on the board; the story is read below it. Refuses the category default of white cards with blue progress bars and stock photos.

OWN-WORLD: Flat slate board #1d2723 (user ratified 2026-10-10: "Düz arduvaz yeterli"; no chalk texture, no CSS/SVG imitation of chalk), solid chalk white #ecefe9 and three chalk colours (yellow #f2d45c amounts/active, pink #f19bb0 failed, blue #8fc7e0 platforms), locked: tints only by chalk density. Column rules are clean 2px chalk-density lines. Below the board a cool slate-tinted light ground #eef1ed, ink #141a17. Sofia Sans superfamily: Extra Condensed for board figures (tabular), Condensed for headlines and labels, Sofia Sans for reading. Campaign state as authored chalk marks (tick, ring, strike), never colour alone. Every story ends in the same ruled künye band: category · platform · date · amount. No kickers above headlines.

STORY: The reader sees the day's money first (one monumental total, then row by row), understands who raised what where, then reads the lead story and the sector news below; disclaimer stays visible.

FIRST VIEWPORT: Full-width slate board: wordmark + condensed nav + date and bulletin counter ("Bülten 1.523" on 10 Ekim 2026) on top, a 2px chalk-density rule, then the monumental total (about 9rem) left with its caption, mark legend right, then the board table (state mark, girişim, platform, toplanan, hedef, %) with rows in solid chalk colours. Son dakika pinned as the board's last line. Below, on the light ground: manşet story (big condensed headline, lede, künye band) left, son haberler list right.

FORM: Seans Tahtası (İMKB chalk board), position 5 on the ordered grounded list; seed key 92a99101. Signature interaction: board rows are chalked in left to right in sequence on load (clip-path reveal, reduced-motion off), the monumental figure last.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Raises (named donors)
- PC-98: locked palette, intermediate tones only by chalk density.
- Museum identity: same ruled künye band at the foot of every story.
- Alphabet storm: the day's total is the board's single monumental figure.
- Darkroom record: all amounts tabular, aligned on the right edge.
- Cutting bench: state is a mark, not a hue.

## Unresolved
- Real kifobu brand mark file (favicon.svg is Astro's default).
- Social account URLs (SITE.social empty).
