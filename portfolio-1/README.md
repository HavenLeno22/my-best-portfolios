# Instrument No. 1

Portfolio of **Haven Leno J**, full-stack developer and B.Tech CSE student at SRM IST, Chennai.

**Live:** https://havenleno22.github.io/my-best-portfolios/portfolio-1/

The site is built as a piece of electronic hardware. The hero is a playable drum machine with
live-synthesized sound, the projects are modules in a rack, and the contact panel has a patch
cable you plug in. No frameworks, no build step, no dependencies.

## What's on the page

- **Drum machine.** 4 lanes by 16 steps, synthesized with the Web Audio API (no samples).
  Tempo, tone (a resonant low-pass filter) and swing knobs, four preset patterns, shake (random
  but musical), and *copy link*, which puts the beat in the URL so anyone who opens it hears it.
- **Work.** Four projects, each with a link to its code:
  - **SurgeGuard 1.0**, a real-time crowd-safety platform. Its module has a live panel showing
    how a Crowd Stability Index score maps to the status operators see.
  - **Multi-Mode AI Translator.** Its module has a working Morse encoder that plays through
    the site's sound engine.
  - **StaffSync** and **Student Expense Tracker**, shown with screenshots.
- **About**, a spec sheet, and a **Stack** section laid out as a four-pedal signal chain.
- **Contact.** Drag the cable into the inbox jack (or press the plug). The email, GitHub,
  LinkedIn and LeetCode links are always shown as plain links too.
- Night mode, a sound switch, a live Chennai clock, keyboard shortcuts (`?` lists them), and a
  mini transport that appears when the beat keeps playing after you scroll away.

## Run it locally

Double-click `index.html`, or start the local server (caching off, so edits show on reload):

```bash
python serve.py
```

Then open http://127.0.0.1:5173.

## Change things

| What | Where |
| --- | --- |
| Email, time zone, city | `js/config.js` |
| Intro, about, spec sheet, stack, project text and links | `index.html` |
| Project screenshots | `img/` (2:1 screenshots look best) |
| Social preview image | `img/og.png`, made from `tools/og.html` at 1200×630 |
| Colours (day and night) | the token blocks at the top of `css/main.css` |
| Drum patterns a to d | `PRESETS` in `js/sequencer.js` (`1` = step on) |

To add a project, copy one `<article class="module project">` block in `index.html`. `--span`
sets its width in a 12-column rack row; two modules per row should add up to 12.

## Keyboard

| Key | Does |
| --- | --- |
| `space` | play or stop |
| `1` to `4` | patterns a to d |
| `r` | shake the pattern |
| `c` | clear the pattern |
| `n` | night mode |
| `m` | sound on or off |
| `?` | shortcut sheet |

Every knob is a slider for screen readers and turns with the arrow keys. Every drag has a click
or keyboard alternative.

## Files

```
index.html          page structure and all copy
img/                project screenshots and the social preview image
css/main.css        tokens (day + night), base, top bar, keys, knobs, LEDs
css/device.css      the drum machine
css/rack.css        section headings, rack rails, project modules
css/sections.css    about, stack, contact, footer, floating parts
js/core.js          shared helpers on window.L (storage, events, clipboard, canvas sizing)
js/config.js        personal details
js/audio.js         Web Audio engine and voices
js/knob.js          the knob control
js/sequencer.js     drum machine grid, transport, presets, share links
js/scope.js         oscilloscope on the LCD
js/projects.js      the SurgeGuard score panel and the Morse player
js/patch.js         rope-physics patch cable
js/app.js           theme, sound, clock, power-on, shortcuts, mini transport
serve.py            local no-cache server
tools/og.html       source of the social preview image
tools/build-single.mjs   bundles the HTML, CSS and JS into one file
DESIGN.md           design spec: concept, tokens, type, rules
```

## One-file version

```bash
node tools/build-single.mjs
```

Writes `dist/leno-instrument.html` with all CSS and JS inlined. Images stay as files, so keep
the `img/` folder next to it.
