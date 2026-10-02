# Leno — Instrument No. 1

Design spec for the portfolio in this folder.

## Concept

A designer–developer portfolio built as a piece of electronic hardware.
The page does not describe interactive work, it *is* interactive work: the hero is a
playable step sequencer with real synthesized sound, the projects are modules mounted
in a rack, and the contact form is a patch cable you plug in.

Reference world: Braun (Dieter Rams, ET66 calculator), pocket synthesizers, eurorack
modules, reflective LCD calculators. Lowercase silkscreen labels, rubber keys, knobs with
tick rings, screws in the corners.

## Tokens

| Token        | Day       | Night     | Role                                  |
|--------------|-----------|-----------|---------------------------------------|
| `--page`     | `#E2E4E1` | `#141617` | page ground                           |
| `--panel`    | `#F3F4F1` | `#222527` | device and module faces               |
| `--ink`      | `#1B1E1D` | `#E7E9E5` | text, silkscreen                      |
| `--ink-soft` | `#595F5C` | `#A3A9A5` | secondary text                        |
| `--lcd`      | `#B6C0A6` | `#8FA28A` | reflective LCD glass                  |
| `--orange`   | `#FF5A1F` |           | kick lane, play, primary action       |
| `--blue`     | `#3767F0` |           | snare lane                            |
| `--green`    | `#139C63` |           | hat lane                              |
| `--bone`     | `#D9D6CC` |           | tone lane (white rubber key)          |

Lane colours are information: each sequencer lane, and anything that reacts to it, keeps
its colour everywhere on the page.

## Type

- **Archivo** (variable, `wdth 62–125`, `wght 100–900`) for everything. Headlines and the
  wordmark are set at full width (125) and heavy weight, like brand marks moulded into a
  case. Body at normal width. The specimen module drives the same axes live.
- **Doto** (dot-matrix) only inside LCD readouts, because that is the display technology.
- Scale: 14 / 17 / 22 / 30 / clamp(40–68) / clamp(84–210). Labels are lowercase, no tracking.

## Page

1. Header: wordmark, section links, night switch, sound switch.
2. Hero device: wordmark + intro, LCD with oscilloscope and readouts, three knobs
   (tempo, tone, swing), transport, patterns a–d, 4×16 sequencer, speaker grille.
3. Work rack: four live modules, each with a "how it's built" note.
   - Plotter: seeded flow-field drawings, copy as SVG.
   - Specimen: variable-font tester on Archivo's axes.
   - Contrast: WCAG contrast meter with an automatic fix.
   - Life: Conway's Game of Life on a 16×16 LED matrix, stepped by the beat.
4. About: bio and a spec sheet with live local time.
5. Process: a four-stage signal chain (it really is a sequence, so it's numbered).
6. Contact: patch bay with a rope-physics cable. Email always visible as text.
7. Colophon footer and a keyboard shortcut sheet.

## Rules

- One orchestrated motion moment: the device powering on at load. Everything else moves
  only in response to the visitor or to the music.
- Every drag has a click or keyboard alternative (WCAG 2.2 — 2.5.7). Targets ≥ 24px.
- `prefers-reduced-motion`: no boot sweep, plotter draws instantly, no idle scope drift.
- No frameworks, no build step. Opens by double-clicking `index.html`.
- Page is complete at rest; nothing waits at `opacity: 0` for a scroll observer.
