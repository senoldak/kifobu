---
name: kifobu
description: Kitle Fonlama Bülteni. The day's crowdfunding money written on a flat slate seans tahtası, the story read below it.
colors:
  tahta: "#1d2723"
  tahta-koyu: "#151d1a"
  tebesir: "#ecefe9"
  tebesir-2: "rgb(236 239 233 / 0.74)"
  tebesir-3: "rgb(236 239 233 / 0.62)"
  tebesir-cizgi: "rgb(236 239 233 / 0.32)"
  tebesir-ince: "rgb(236 239 233 / 0.14)"
  sari: "#f2d45c"
  pembe: "#f19bb0"
  mavi: "#8fc7e0"
  zemin: "#eef1ed"
  zemin-2: "#e2e7e2"
  murekkep: "#141a17"
  murekkep-2: "#46534c"
  cizgi: "#c3cbc5"
  bag: "#24503f"
  bag-alt: "#c9a21f"
typography:
  display:
    fontFamily: "'Sofia Sans Extra Condensed', 'Sofia Sans Condensed', system-ui, sans-serif"
    fontSize: "clamp(4.2rem, 11vw, 9.5rem)"
    fontWeight: 800
    lineHeight: 0.84
    letterSpacing: "-0.015em"
    fontFeature: "tnum"
  wordmark:
    fontFamily: "'Sofia Sans Extra Condensed', 'Sofia Sans Condensed', system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  board-figure:
    fontFamily: "'Sofia Sans Extra Condensed', 'Sofia Sans Condensed', system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 2.6vw, 2.1rem)"
    fontWeight: 700
    lineHeight: 1.15
    fontFeature: "tnum"
  headline:
    fontFamily: "'Sofia Sans Condensed', 'Sofia Sans', system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 5vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Sofia Sans Condensed', 'Sofia Sans', system-ui, sans-serif"
    fontSize: "1.42rem"
    fontWeight: 800
    lineHeight: 1.12
  body:
    fontFamily: "'Sofia Sans', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  article-body:
    fontFamily: "'Sofia Sans', system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 400
    lineHeight: 1.72
  label:
    fontFamily: "'Sofia Sans Condensed', 'Sofia Sans', system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.14em"
rounded:
  none: "0px"
  isaret: "10px"
spacing:
  kenar: "clamp(16px, 4vw, 56px)"
  grid-gap: "clamp(24px, 3vw, 44px)"
  section: "56px"
  lead: "64px"
  container: "1280px"
  article: "760px"
components:
  nav-link:
    textColor: "{colors.tebesir-2}"
    typography: "{typography.label}"
    padding: "11px 0 10px"
  nav-link-active:
    textColor: "{colors.sari}"
  son-dakika-label:
    backgroundColor: "{colors.sari}"
    textColor: "{colors.tahta}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "3px 9px 2px"
  share-button:
    textColor: "{colors.murekkep}"
    rounded: "{rounded.none}"
    padding: "6px 14px"
  share-button-hover:
    backgroundColor: "{colors.tahta}"
    textColor: "{colors.tebesir}"
  board-cell:
    textColor: "{colors.tebesir}"
    typography: "{typography.board-figure}"
    padding: "8px 16px"
  kampanya-kunyesi:
    backgroundColor: "{colors.tahta}"
    textColor: "{colors.tebesir}"
    rounded: "{rounded.none}"
    padding: "22px 24px 18px"
---

# Design System: kifobu

## Overview

**Creative North Star: "Seans Tahtası"**

Every day's bulletin is a seans tahtası, the hand-chalked board of the old İMKB trading floor. The numbers are written on the board; the story is read below it. The board is the world-owning frame: a full-width flat slate band that carries the wordmark, the bulletin counter, the navigation, one monumental total and the campaign table, row by row. Below it the reading ground is calm, light and cool, built for long Turkish news text.

The slate is flat. The user ratified this on 2026-10-10 ("Düz arduvaz yeterli"): no chalk texture, no grain, no CSS or SVG imitation of chalk dust or strokes. "Chalk" in this system means a locked set of solid colours and their densities, plus hand-authored SVG state marks; it never means a rendering effect. The density is that of a trading board: condensed type, tabular figures, ruled columns, zero radius, no shadows.

The system refuses the crowdfunding category default (white cards, blue progress bars, stock photos) and must stay visibly distinct from the sister sites tidsrost and finfolis, which share the code skeleton but not the look.

**Key Characteristics:**
- Full-width flat slate board on top and as the footer band; light reading ground between.
- One monumental tabular figure per board (the day's total), written last.
- Locked chalk palette: white, yellow, pink, blue; intermediate tones only by chalk density (alpha).
- Campaign state is an authored mark (ring, arrow, tick, strike), never colour alone.
- Every story ends in the same ruled künye band.
- Sofia Sans superfamily in three widths; everything numeric is tabular.
- Square corners, ruled lines, no shadows.

## Colors

A locked board palette (slate plus four chalks) over a cool slate-tinted reading ground with a dark green link ink.

### Primary
- **Seans Slate** (tahta): the board itself. Header, footer and the in-article kampanya künyesi. Also the browser theme colour and the scrollbar thumb. It stays the same in dark mode.
- **Slate Ledge** (tahta-koyu): the 6px rule that closes the board at its bottom edge (and opens the footer). It reads as the board's chalk ledge.

### Secondary
- **Chalk White** (tebesir): solid chalk. Board figures, the wordmark, the monumental total.
- **Chalk Yellow** (sari): amounts that count and active state. The ₺ sign of the total, the % of a campaign that reached its target, the bulletin counter, the tagline, the active nav item and its underline, the son dakika label, text selection, and focus rings on the board.
- **Chalk Pink** (pembe): failure only. The strike through a closed-without-target row, its %, and its state mark.
- **Chalk Blue** (mavi): platform names, on the board and in the kampanya künyesi.

### Neutral
- **Chalk densities** (tebesir-2 at 74%, tebesir-3 at 62%, tebesir-cizgi at 32%, tebesir-ince at 14%): secondary board text (nav, captions, legend, target column), muted labels and struck rows, 2px column and band rules, 1px row hairlines.
- **Cool Slate Paper** (zemin): the reading ground. **Paper Shade** (zemin-2): image placeholders and blockquotes.
- **Slate Ink** (murekkep): headlines and body text, and the heavy 2px rule that opens every künye band. **Soft Ink** (murekkep-2): ledes, summaries, künye metadata.
- **Hairline** (cizgi): 1px dividers on the reading ground.
- **Ledger Green** (bag): links in running text, "Tümü" links, hover state for category names, the success mark on the reading ground, and the focus ring on the reading ground. **Ochre Underline** (bag-alt): the only underline colour for links and headline hovers.

### Dark scheme
Dark mode follows `prefers-color-scheme` only (there is no toggle). The reading ground darkens (zemin #111715, zemin-2 #18201d, murekkep #e3e8e4, murekkep-2 #a3b0a9, cizgi #2c3833, heavy rules #e3e8e4, thick section rules #3a4b44, bag #a9d6c2, focus ring becomes Chalk Yellow). The board tokens never change: the slate and chalks are the same in both schemes, so the board stays one recognisable object.

### Named Rules
**The Locked Chalk Rule.** The board has slate, white, yellow, pink and blue, and nothing else. Any intermediate tone is chalk white at a lower density (alpha). A new hue on the board is a system change, not a tweak.

**The Mark, Not Hue Rule.** State always carries an authored mark. Colour reinforces the mark (yellow tick, pink strike) but never replaces it; a failed row is struck through as well as coloured.

**The Yellow Counts Rule.** Yellow marks money that counts and the current position (active nav, son dakika). Do not use it for decoration.

## Typography

**Board Font:** Sofia Sans Extra Condensed (fallback Sofia Sans Condensed, system-ui)
**Headline / Label Font:** Sofia Sans Condensed (fallback Sofia Sans, system-ui)
**Body Font:** Sofia Sans (fallback system-ui)

**Character:** One superfamily in three widths. The narrowest width writes the board's figures like a floor clerk filling a column. The condensed width sets headlines and labels with newsroom urgency. The normal width keeps long reading calm. All faces are self-hosted woff2 (latin and latin-ext subsets, variable weight) because the CSP allows fonts only from `'self'`. The Extra Condensed latin file and the Sofia Sans latin file are preloaded.

### Hierarchy
- **Display** (Extra Condensed 800, clamp 4.2–9.5rem, line-height 0.84, tabular): the board's single monumental total. The category board title (404 included) uses the same face at clamp(3rem, 8vw, 6rem).
- **Wordmark** (Extra Condensed 800, clamp 2.6–3.4rem, 0.86): lowercase "kifobu", with the uppercase tagline under it in Chalk Yellow.
- **Board figure** (Extra Condensed 700, clamp 1.45–2.1rem, 1.15, tabular): board table cells. Kampanya künyesi values are 1.7rem; its raised amount is clamp(2.4rem, 6vw, 3.2rem).
- **Headline** (Condensed 800, clamp 2.1–3.4rem, 1.02, -0.01em): article h1. The front-page manşet uses clamp(2rem, 4.2vw, 3.3rem).
- **Title** (Condensed 800, 1.42rem, 1.12): story row headlines (1.5rem under the manşet, 1.22rem in the son haberler list).
- **Body** (Sofia Sans 400, 1.0625rem, 1.6): site default. **Article body** (1.15rem, 1.72), capped at 68ch. Ledes are 1.2–1.25rem in Soft Ink, capped at 62ch.
- **Label** (Condensed 700–800, 0.76–0.92rem, letter-spacing 0.06–0.16em, uppercase): navigation, table heads, section heads, künye category, dt labels, share prefix.

### Named Rules
**The Tabular Rule.** Every amount, percentage, date counter and table figure uses tabular lining numerals. Amounts align on the right edge of their column.

**The No Kicker Rule.** Nothing sits above a headline. Category, platform, date and amount go in the künye band below the story. Uppercase labels name sections and columns; they never act as an eyebrow over a story title.

## Layout

A single 1280px container with fluid side margins (kenar). The page is three stacked bands: the slate header (which holds the board on pages that have one), the reading ground, and the slate footer.

- **Board:** a two-column head (monumental total and caption left, state-mark legend right; stacked under 900px), then the full-width table (state mark, girişim, platform, toplanan, hedef, %). Son dakika is pinned as the board's last line. Under 640px the platform and target columns are hidden, and the platform moves under the startup name as a second line.
- **Front page reading ground:** a 1.7fr / 1fr grid (manşet left, son haberler right; one column under 900px), 64px below it, then category sections 56px apart with auto-fill grids of story rows at 300px minimum.
- **Article:** a 760px centred column. Running text is capped at 68ch.
- **Breakpoints:** 900px (grids collapse) and 640px (board columns drop, nav wraps, kampanya künyesi bleeds to the screen edge).
- Every layout must be complete without images. Cover images are optional 16:9 frames on a Paper Shade placeholder.
- **Drawn covers:** when a story has no cover image, `src/kapak/ciz.ts` draws one at build time from its frontmatter (`/kapak/<id>.png`, 1200×675, also the og:image). It uses the same slate board, chalk palette and Sofia Sans faces, set as glyph paths so no installed font is needed; the ₺ is drawn by hand because Sofia Sans lacks it. Funding stories get the campaign card (startup, platform, amount, a progress rail with the target as a fixed tick, the state mark, the investor count). Other stories get the headline card (category, headline, date, and the bulletin number for Günlük Bülten). As on tidsrost, covers appear only on the manşet and the article page, never in list rows.
- **Brand mark:** the owner's sunflower mark (`brand/kifobu-isaret.png`, a 640px raster with its own cream ground; no vector source exists). It is used only for the favicons; the header, footer and covers show the text lockup "kifobu | Ulaşılabilir ve anlaşılır veri" (owner decision, 2026-10-11).

## Elevation & Depth

Flat. There are no shadows anywhere. Depth comes from the hard tonal split between slate board and light ground and from rule weight: a 6px Slate Ledge closes the board, 6px rules open sections and the son haberler list, 2px rules open künye bands and divide board columns, and 1px hairlines separate rows.

### Named Rules
**The Flat Slate Rule.** The board is one flat colour. No texture, gradient, grain, noise, blur, or simulated chalk strokes or dust, in CSS, SVG or raster. (User-ratified 2026-10-10.)

**The Rule Weight Rule.** Hierarchy between bands is carried by line weight (6 / 2 / 1px), never by shadow or lift.

## Shapes

Square everywhere (0px radius): the board, the son dakika label, share buttons, image frames, focus rings. The only curves in the system are the hand-drawn state marks and the brand-mark tile (10px, `rounded.isaret`), which keeps the owner's app-icon shape. Lines are solid. The one dashed border is the dev-only "Örnek veri" sample tag.

## Components

### Navigation
Condensed uppercase links (0.92rem, 0.1em tracking) in chalk density 74%, sitting between two 2px chalk-density rules. Hover goes to solid chalk. The active page is Chalk Yellow with a 2px yellow underline 4px above the lower rule. The bar scrolls horizontally on wide screens and wraps under 640px. The first item is "Tahta" (the front page). The footer menu is a two-column uppercase list with yellow on hover.

### Bulletin Counter
Top right of the board: "Bülten 1.523" in Condensed 800 uppercase Chalk Yellow, tabular, with the long-form date under it at chalk density. The number is computed at build time from `SITE.kurulus` (bulletin 1 = 2022-08-10, one per day). In dev only, a missing value shows a muted placeholder.

### Seans Tahtası (signature)
The board table. Column rules are clean 2px chalk-density lines, and row hairlines are 1px at 14%. The startup name links with a yellow underline that draws left to right on hover (0.35s). Platform is Chalk Blue and target is at density 74%. For a successful row the % is yellow. A failed row is struck through with a 3px pink line, its text drops to density 62%, and its % turns pink. Failed campaigns are excluded from the total, and the caption says so. An empty board shows one ruled line of text.

**Signature motion.** On load, board cells are written in with a clip-path reveal from left to right (0.7s, ease cubic-bezier(0.16, 1, 0.3, 1)). Rows are staggered by 110ms and cells within a row by 45ms. The monumental total is written last (1.1s). All of this is gated on `prefers-reduced-motion: no-preference`; with reduced motion the board is static.

### State Marks
Authored SVG strokes on a 24 grid (2.6 stroke, round caps, currentColor) with an accessible title: ring = Yeni açıldı, arrow = Sürüyor, tick = Hedefe ulaştı, short strike = Hedefe ulaşamadan kapandı. 22px on the board, 18px in the legend, 16px in künye bands. On the board, tick is yellow and strike is pink. On the reading ground, tick is Ledger Green.

### Künye Band
The ruled line every story ends in: category (800 uppercase) · platform · date or time · state mark + short amount + %. It opens with a 2px Slate Ink rule (1px Hairline in the son haberler list) and uses Condensed 600 0.92rem tabular type. It is pinned to the bottom of each story row.

### Kampanya Künyesi
A small board inside an article: slate ground, a 6px ledge, and a definition grid of startup, platform, raised (large, yellow), target, %, and state, each cell opened by a 2px chalk-density rule. The risk notice sits at its foot above a 1px hairline. This is the only board inside the reading column.

### Son Dakika
A yellow label (slate text, 0.82rem 800 uppercase) followed by breaking headlines in Condensed 700. It is the last line of the board.

### Buttons (Share)
Square, with a 2px Slate Ink border, 6px 14px padding, and Condensed 700 type. On hover the button fills with Seans Slate and the text turns Chalk White (0.2s).

### Links
In running text: Ledger Green with a 2px Ochre underline at 3px offset. Headline hovers get a 3px Ochre underline. The focus ring is 2px with a 3px offset, Ledger Green on the reading ground and Chalk Yellow on the board.

## Do's and Don'ts

### Do:
- **Do** put the day's money on the slate board first: one monumental tabular total, then the rows.
- **Do** build any new tint as chalk white at a lower alpha (the 74 / 62 / 32 / 14% densities).
- **Do** pair every campaign state with its authored SVG mark and an accessible label.
- **Do** end every story, whether a row, the manşet or the son haberler list, with the künye band.
- **Do** keep the board identical in both colour schemes; only the reading ground darkens.
- **Do** self-host any new font as woff2 under /fonts; the CSP blocks third-party font hosts.
- **Do** gate any new motion behind `prefers-reduced-motion: no-preference`.

### Don't:
- **Don't** add chalk texture, grain, gradients or simulated chalk strokes to the board.
- **Don't** introduce a fifth chalk or any new hue on the board.
- **Don't** put a kicker or eyebrow label above a headline.
- **Don't** signal campaign state with colour alone.
- **Don't** use shadows or rounded corners.
- **Don't** use white cards with progress bars or stock photography for campaigns.
- **Don't** borrow layout signatures, palettes or type from tidsrost or finfolis.
