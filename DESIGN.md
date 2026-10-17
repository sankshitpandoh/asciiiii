---
version: beta
name: asciiiii — GLYPHWAVE 95
description: A browser tool that turns photos, GIFs and videos into embeddable ASCII art, with a catalogue of animated pieces. The site is a fictional 1997 operating system that only runs ASCII, on a CRT at dusk: maximalist vaporwave in the frame, plain and readable inside the windows.
colors:
  void: "#1a0b2e"        # page ground, night sky
  dusk: "#2d1052"        # lower wallpaper, grid fill
  ink-hi: "#fff4fb"      # text on void, ~17:1
  mist: "#c9b8e8"        # secondary text on void, ~9.7:1
  neon-pink: "#ff71ce"   # primary button face, step badges, grid rows; void text on it ~7:1
  neon-cyan: "#01cdfe"   # grid columns, links and focus ring on void, active chip
  sun-yellow: "#fffb96"  # sun top, stickers, ticker; void text on it ~15:1
  sun-orange: "#ff8b3d"  # sun middle band, decoration only
  face: "#c0c0c0"        # windows and controls; #000 text ~11.5:1
  title-a: "#c2187a"     # active title bar, gradient start (white text ≥ 6:1)
  title-b: "#4b1fa8"     # title bar gradient end; also link/readout colour on face
  screen: "#0b0618"      # the CRT: the only surface art renders on
  screen-ink: "#f2e9ff"  # default glyph colour on the CRT
typography:
  ui:
    fontFamily: VT323
    use: title bars, buttons, chips, tabs, readouts, taskbar; never below 18px
  body:
    fontFamily: Atkinson Hyperlegible
    fontSize: 16px
    use: paragraphs, hints, docs
  kana:
    fontFamily: Zen Kaku Gothic New 700
    use: one katakana subtitle per window title and under the wordmark; subset with &text= so only the used glyphs load
  code:
    fontFamily: system monospace stack
    use: code, snippets, the wordmark, swatches (no extra font load)
bevels:
  raised: "inset -1 -1 #000, inset 1 1 #fff, inset -2 -2 #808080, inset 2 2 #dfdfdf"
  pressed: raised, inverted
  sunken: "inset -1 -1 #fff, inset 1 1 #808080, inset -2 -2 #dfdfdf, inset 2 2 #000"
shadows:
  drop: "8px 8px 0 {colors.screen}"   # hard, offset, never blurred
---

## Concept

The site is **GLYPHWAVE 95**, an operating system that only renders ASCII, seen on a CRT at
dusk. Vaporwave lives in the *frame*: the sunset wallpaper with a striped sun, the perspective
grid floor, palm silhouettes, the chrome wordmark, katakana, three stickers and one ticker.
Every tool is an application window: `NOW_PLAYING.EXE` (hero), `ASCII.EXE` (converter),
`EXPORT.DLL` (developer exports), `C:\PIECES\` (gallery), `README.TXT` (docs), plus a taskbar.
Inside a window everything is grey Win95 chrome and plain type, and the art on its CRT is the
brightest, most saturated thing on screen.

## Layout

- **Menu bar** (sticky): brand, section links, the *Pause motion* switch, a clock.
- **Desktop** (hero, at most one screen tall, capped at 960px): wordmark, kana, a pitch box on an
  opaque scrim with *Make yours* and *Browse 129 pieces*, a copyable script tag, and the
  `NOW_PLAYING.EXE` window cycling featured pieces. A trust strip states licence, size and
  behaviour. The ticker of piece names sits under it.
- **ASCII.EXE**: the result first (a CRT that scales art to fit, a status bar, then *Download PNG*,
  *Download video* for clips, *Copy as text*, *Embed on a site*), controls in a rail of numbered
  steps: pick a picture, pick a look (named presets), fine-tune (collapsed).
- **EXPORT.DLL**: the five developer formats as Win95 notebook tabs.
- **C:\PIECES\**: address bar, search, scrolling category chips, 24 cards at a time, each
  mounted only when it nears the viewport; a card opens the viewer dialog.
- **README.TXT**: a Notepad window with a white page: three numbered steps, attributes,
  performance and accessibility.
- Mobile: windows go full width and stack, the result comes before the controls, the gallery is
  two columns (one under 420px), the taskbar stops being sticky.

## Rules

- Decoration never goes inside a window. No gradients, neon or motion behind body text; text on
  the wallpaper sits on an opaque scrim.
- One marquee, at most three stickers, one sun. No busts, dolphins, checkerboards or logos.
- Shadows are hard and offset. No blur, glow, `backdrop-filter`, or animated shadows.
- `neon-pink` is the primary action. `neon-cyan` is the active state and the focus ring on the
  wallpaper; on grey surfaces the focus ring is `screen` (dark), so it always clears 3:1.
- Motion: the grid floor and ticker are CSS animations; pieces animate through the component.
  The *Pause motion* switch sets `motion="off"` on every `<ascii-art>` and pauses CSS animations,
  and is remembered. `prefers-reduced-motion` starts the page paused and removes CSS motion.
- Every control is at least 36px tall (44px on touch). Tabs follow the ARIA tabs pattern;
  toggle chips use `aria-pressed`; copy feedback goes to a live region.
