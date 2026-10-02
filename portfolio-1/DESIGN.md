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
  case. Body at normal width.
- **Doto** (dot-matrix) only inside LCD readouts, because that is the display technology.
- Scale: 14 / 17 / 22 / 30 / clamp(40–68) / clamp(84–210). Labels are lowercase, no tracking.

## Page

1. Header: wordmark, section links, night switch, sound switch.
2. Hero device: wordmark + intro, LCD with oscilloscope and readouts, three knobs
   (tempo, tone, swing), transport, patterns a–d, 4×16 sequencer, speaker grille.
3. Work rack: four project modules with stack labels and code links.
   - SurgeGuard 1.0: an LCD panel with the real Crowd Stability Index bands and indicator
     weights, and a knob that maps a score to its operational status.
   - Multi-Mode AI Translator: a Morse encoder that plays through the page's audio engine.
   - StaffSync and Student Expense Tracker: screenshots behind a monitor bezel.
4. About: bio and a spec sheet with live local time. Facts only, from the owner.
5. Stack: the four layers of a full-stack app as a pedal chain (a real sequence, so numbered).
6. Contact: patch bay with a rope-physics cable. Email always visible as text.
7. Colophon footer and a keyboard shortcut sheet.

## Rules

- One orchestrated motion moment: the device powering on at load. Everything else moves
  only in response to the visitor or to the music.
- Every drag has a click or keyboard alternative (WCAG 2.2 — 2.5.7). Targets ≥ 24px.
- `prefers-reduced-motion`: no boot sweep, no idle scope drift.
- No frameworks, no build step. Opens by double-clicking `index.html`.
- Page is complete at rest; nothing waits at `opacity: 0` for a scroll observer.
