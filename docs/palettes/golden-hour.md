# Captures — "Golden hour" palette (saved for later)

> Status: **not active**. The site currently uses **Darkroom**.
> This file has everything needed to switch Captures to Golden hour later.
> Decided on: Nov 7, 2026.

---

## 1. The idea

**Golden hour** = plum-tinted black + sunset-orange accent.
It echoes the subject of most of the photos (sunsets, dusk, blue hour) — soft, warm, calm.

| | Darkroom (current) | Golden hour (this file) |
|---|---|---|
| Story | *How* photos are made (darkroom, safelight) | *What* I photograph (sunsets, dusk) |
| Background | warm reddish black | plum / dusk black |
| Accent | safelight red `#ff4b3a` | sunset orange `#ff8a5c` |
| Feel | striking, on-theme | soft, gentle, pretty |
| Watch out | red must stay on small things | orange can blend into sunset photos |

**Known trade-off:** the orange accent is close to the colors in many photos (Lake Hours, Cotton Candy Ceiling, Everyone Stopped), so buttons/accents stand out less next to prints. Keep the accent on small UI only (see §5).

---

## 2. Fonts (same as Darkroom — no change needed)

| Role | Font | Source |
|---|---|---|
| Titles, hero, photo titles | **Geist Serif — Triangle** (dots/periods are ▲) | `geist` package ≥ 1.9.0 → `import { GeistSerifTriangle } from "geist/font/serif/triangle"` → CSS var `--font-geist-serif-triangle` |
| Body text | Geist (Sans) | `geist/font/sans` |
| Small labels (tabs, stats, EXIF, chips, footer) | Geist Mono | `geist/font/mono` |
| Polaroid captions, stories, print backs | Caveat | Google Fonts / next/font |

Signature detail: the hero reads **"Captures."** — the period is a **▲ in the accent color** (orange in Golden hour).

---

## 3. Color tokens

### Dark mode

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#120f14` | page background |
| `--surface` | `#1a151d` | cards, dialog panels, popovers |
| `--line` | `#28212c` | borders, dividers |
| `--chip` | `#1c1720` | active tab / chip background |
| `--text` | `#e9e2ec` | body text |
| `--muted` | `#ad9fb3` | secondary text |
| `--dim` | `#7c6f82` | labels, hints |
| `--hi` | `#fbf7fd` | headings, strongest text |
| `--accent` | `#ff8a5c` | ▲ period, primary button, favorites dot, focus ring |
| `--accent-contrast` | `#1f0b03` | text/icons on top of accent |
| theme-color meta | `#120f14` | browser UI color |

### Light mode

| Token | Value |
|---|---|
| `--bg` | `#f7f2f3` |
| `--surface` | `#fffafb` |
| `--line` | `#ebdfe2` |
| `--chip` | `#ffffff` |
| `--text` | `#2a2024` |
| `--muted` | `#66545c` |
| `--dim` | `#8f7d85` |
| `--hi` | `#1a1014` |
| `--accent` | `#e2582a` (darker orange for contrast on light bg) |
| `--accent-contrast` | `#ffffff` |
| theme-color meta | `#f7f2f3` |

### Mat (Table background)

The green cutting mat works with Golden hour too (green ↔ orange is a nice contrast). If using the **palette-tinted mat** instead:

| Token | Dark | Light |
|---|---|---|
| `--mat-tint-1` (center) | `#2b2236` | `#e6d6dc` |
| `--mat-tint-2` (middle) | `#1e1826` | `#dac5cd` |
| `--mat-tint-3` (edge) | `#130f19` | `#cdb4bf` |
| `--mat-tint-grid` (major grid line) | `rgba(255,200,230,.06)` | `rgba(90,30,50,.08)` |
| `--mat-tint-grid-minor` | `rgba(255,200,230,.022)` | `rgba(90,30,50,.03)` |

Gradient shape (same as the other mats): `radial-gradient(ellipse at 45% 35%, var(--mat-tint-1) 0%, var(--mat-tint-2) 55%, var(--mat-tint-3) 100%)`.

Unchanged in every palette: polaroid paper `#f4f1ea`, caption ink `#3b3530`, print-back paper `#ebe5d8`, film-edge markings amber `#e9a04a` (these are "physical objects", not theme colors).

---

## 4. Ready-to-paste CSS block

Add next to the Darkroom block in `src/app/globals.css` (the palette system uses `data-palette` on `<html>`):

```css
/* ───────── Palette: Golden hour ───────── */
:root[data-palette="golden-hour"] {
  --bg: #120f14;
  --surface: #1a151d;
  --line: #28212c;
  --chip: #1c1720;
  --text: #e9e2ec;
  --muted: #ad9fb3;
  --dim: #7c6f82;
  --hi: #fbf7fd;
  --accent: #ff8a5c;
  --accent-contrast: #1f0b03;
  --mat-tint-1: #2b2236;
  --mat-tint-2: #1e1826;
  --mat-tint-3: #130f19;
  --mat-tint-grid: rgba(255, 200, 230, 0.06);
  --mat-tint-grid-minor: rgba(255, 200, 230, 0.022);
}
:root[data-palette="golden-hour"][data-theme="light"] {
  --bg: #f7f2f3;
  --surface: #fffafb;
  --line: #ebdfe2;
  --chip: #ffffff;
  --text: #2a2024;
  --muted: #66545c;
  --dim: #8f7d85;
  --hi: #1a1014;
  --accent: #e2582a;
  --accent-contrast: #ffffff;
  --mat-tint-1: #e6d6dc;
  --mat-tint-2: #dac5cd;
  --mat-tint-3: #cdb4bf;
  --mat-tint-grid: rgba(90, 30, 50, 0.08);
  --mat-tint-grid-minor: rgba(90, 30, 50, 0.03);
}
```

> If the site follows system dark/light without a `data-theme` attribute, mirror the light block inside
> `@media (prefers-color-scheme: light) { :root[data-palette="golden-hour"]:not([data-theme="dark"]) { … } }`
> — match however the Darkroom block is written.

---

## 5. Where the accent is used (keep it small)

Use `--accent` only on:
- the ▲ period in "Captures."
- primary button (e.g. "shuffle pile"), favorites dot / count
- focus rings, active indicator dots, small links on hover
- the film-counter dial digits (Hero) and the photo-view "developing" status line

Do **not** use the accent for: large backgrounds, body text, borders everywhere, or the mat.
With Golden hour especially, keep it sparse — the photos already bring lots of orange.

Photo view "darkroom" effect: in Golden hour, consider tinting the safelight flash warm orange/amber (`rgba(255,138,92,.45)`) instead of red, so the effect matches the palette.

---

## 6. How to switch (later)

1. Paste the block from §4 into `src/app/globals.css` (if it isn't there yet).
2. In `src/data/captures.ts` change `export const PALETTE = "darkroom"` → `"golden-hour"`.
3. Update `theme-color` meta values to `#120f14` (dark) / `#f7f2f3` (light) if they're per-palette.
4. Optional: `TABLE_SURFACE = "mat"` (green) or `"mat-tinted"` — both work.
5. Check every view in both modes: Table, Rolls, Contact sheet, photo view, header, footer.
6. `pnpm lint` → commit.

### Codex prompt (copy-paste when switching)

```
Switch the Captures palette from Darkroom to Golden hour.
1. Add the "Palette: Golden hour" CSS block from docs/palettes/golden-hour.md §4 to src/app/globals.css, next to the Darkroom block, written the same way as Darkroom (dark default + light override, matching how data-theme/system preference is handled).
2. Set PALETTE = "golden-hour" in src/data/captures.ts. Update theme-color meta values to #120f14 (dark) and #f7f2f3 (light) if they are palette-specific.
3. If the photo-view safelight flash uses a hard-coded red, make it read from a token and set it to warm orange rgba(255,138,92,.45) for Golden hour (keep red for Darkroom).
4. Keep the Darkroom block intact so we can switch back.
Don't change anything else. DO NOT run install, build, dev, lint, tests or git commands except git status/diff. Report in reply only, no .md report files.
```

---

## 7. Preview files (from the design session)

- `captures-palettes.html` — all 6 palettes (Neutral, Darkroom, Portra, Cyanotype, Fuji, Golden hour)
- `captures-theme-finalists.html` — Darkroom vs Golden hour with final fonts, green vs tinted mat, light/dark

(Keep these next to this file if you want to re-open them.)

---

## 8. Table surfaces (all palettes)

Set in `src/data/captures.ts` → `TABLE_SURFACE`. Active: **`"mat-tinted"`** (Darkroom tinted mat).

| Surface | What it is | Palette-aware? |
|---|---|---|
| `mat` | Green self-healing cutting mat, grid + rulers + "A2" label | No — same green in every palette |
| `mat-tinted` | Same mat, colored by the palette (`--mat-tint-*`) | Yes |
| `linen` | Woven cloth, no grid (`--linen-*`) | Yes |

### Green mat (fixed)
- Dark: `radial-gradient(ellipse at 45% 35%, #1d3d33 0%, #142c25 55%, #0e211b 100%)`, grid `rgba(255,255,255,.055)` / minor `.022`, vignette `inset 0 0 120px rgba(0,0,0,.5)`
- Light: `#c4d9cc → #aac4b5 (60%) → #98b5a5`, grid `rgba(0,0,0,.07)` / minor `.025`, print shadow `0 14px 28px -10px rgba(30,50,40,.35), 0 2px 4px rgba(30,50,40,.15)`

### Darkroom surfaces
| Token | Dark | Light |
|---|---|---|
| `--mat-tint-1/2/3` | `#3b2521` / `#2b1a17` / `#1e1210` | `#e9d4cd` / `#dec4bc` / `#d4b5ab` |
| `--mat-tint-grid` / `-minor` | `rgba(255,120,95,.08)` / `.03` | `rgba(120,30,20,.08)` / `.03` |
| `--linen-1/2/3` (oxblood) | `#3a2320` / `#2a1815` / `#1d100e` | `#ead8cf` / `#dcc4b8` / `#cfb2a5` |
| `--linen-weave` | `rgba(255,180,160,.045)` | `rgba(110,40,30,.06)` |

Alternative linen, "charcoal / cream" (nicest in light mode): dark `#2b2522 / #201b19 / #161210`, weave `rgba(255,255,255,.04)`; light `#f0e8df / #e4d9cd / #d7cabd`, weave `rgba(60,40,30,.055)`.

Tried and rejected: lighter tinted mat in dark (`#4a2e29 / #36211d / #261714`) — turned brown/leather, lost the safelight feel.

### Golden hour surfaces (add to its palette block when switching)
| Token | Dark | Light |
|---|---|---|
| `--linen-1/2/3` (plum cloth) | `#2e2433` / `#211a26` / `#16111b` | `#ece0e4` / `#dfcfd5` / `#d2bec6` |
| `--linen-weave` | `rgba(230,200,255,.04)` | `rgba(90,30,50,.06)` |

(Golden hour `--mat-tint-*` values are in §3.)

### Notes from the design session
- Final pick: tinted mat (most atmospheric, "safelight on"). Green mat kept as an option: most contrast for warm/sunset photos, green + red = classic darkroom pairing.
- Tinted mat is the most atmospheric in dark mode ("safelight on"); weaker in light mode (blush pink, warm photos blend in).
- Idea for later — **hybrid**: tinted mat in dark ("safelight on"), green mat in light ("lights on").
- Linen looks best in light mode; in dark it reads as a plainer tinted mat.
- Later: palette + surface will be switchable from the admin panel.

## 9. Darkroom palette (currently active)

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#100c0b` | `#f7f1ee` |
| `--surface` | `#16100f` | `#fffaf8` |
| `--line` | `#2a201d` | `#e8dbd5` |
| `--chip` | `#1c1513` | `#ffffff` |
| `--text` | `#ece3df` | `#2b1f1c` |
| `--muted` | `#b3a39d` | `#6b5650` |
| `--dim` | `#7d6d67` | `#94807a` |
| `--hi` | `#fff5f1` | `#1a100d` |
| `--accent` | `#ff4b3a` | `#d93a2b` |
| `--accent-contrast` | `#ffffff` | `#ffffff` |
| `--safelight` (photo view) | `rgba(255,75,58,.45)` | same |
| theme-color meta | `#100c0b` | `#f7f1ee` |

Fonts (both palettes): Geist Serif Triangle (titles, ▲ period in accent), Geist (body), Geist Mono (labels), Caveat (prints).

---
