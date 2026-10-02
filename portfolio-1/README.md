# Leno — Instrument No. 1

A portfolio built as a piece of electronic hardware. The hero is a playable drum machine with
live-synthesized sound, the work section is a rack of four working tools, and the contact panel
has a patch cable you plug in.

No frameworks, no build step, no dependencies. Open `index.html` and it runs.

## Open it

Double-click `index.html`. Everything works straight from the file system.

For a local server (closer to how it behaves online, with caching turned off so edits show on reload):

```bash
python serve.py
```

Then open http://127.0.0.1:5173.

## Make it yours

| What | Where |
| --- | --- |
| Email, time zone, place, working hours | `js/config.js`. Every place that shows them updates. |
| Intro, about text, spec sheet, process steps | `index.html` |
| Colours (day and night) | the token blocks at the top of `css/main.css` |
| Drum patterns a to d | `PRESETS` in `js/sequencer.js` (`1` = step on) |

To change the email, edit `js/config.js` and the two `mailto:` links in `index.html` (they're the
fallback for visitors without JavaScript).

The four modules in the Work section are real, working tools. To show your own client projects,
copy one `<article class="module">` block and swap its contents. `--span` sets its width in a
12-column rack row; two modules per row should add up to 12.

## What's on the page

- **Drum machine.** 4 lanes by 16 steps, synthesized with the Web Audio API (no samples).
  Tempo, tone (a resonant low-pass filter) and swing knobs, four preset patterns, shake (random
  but musical), and *copy link*, which puts the beat in the URL so anyone who opens it hears it.
  Your last beat is remembered in the browser.
- **Plotter.** Seeded flow-field drawings drawn line by line. *Copy as SVG* gives clean vector
  paths you can paste into Figma.
- **Specimen.** A variable-font tester on Archivo's weight and width axes. Click the sample to type.
- **Contrast.** A WCAG contrast meter. *Fix* finds the smallest lightness change that passes 4.5:1.
- **Life.** Conway's Game of Life on an LED matrix. While the drum machine plays, it steps once per beat.
- **Patch bay.** Drag the cable into the inbox jack (or just press the plug) to connect.
  The email address is always shown as plain text too.
- Night mode, a sound switch, a live local clock, and a mini transport that appears when the
  beat keeps playing after you scroll away.

### Keyboard

| Key | Does |
| --- | --- |
| `space` | play or stop |
| `1` to `4` | patterns a to d |
| `r` | shake the pattern |
| `c` | clear the pattern |
| `n` | night mode |
| `m` | sound on or off |
| `?` | shortcut sheet |

Every knob is a slider for screen readers and turns with the arrow keys. The sequencer grid uses
arrow keys between steps. Every drag has a click or keyboard alternative.

## Measured

Lighthouse (mobile): Accessibility 100, Best Practices 100, SEO 100.
Load trace on a local server: LCP 410 ms, CLS 0.00.

## Files

```
index.html          page structure and all copy
css/main.css        tokens (day + night), base, top bar, keys, knobs, LEDs
css/device.css      the drum machine
css/rack.css        section headings, rack rails, the four modules
css/sections.css    about, process, contact, footer, floating parts
js/core.js          shared helpers on window.L (storage, events, clipboard, canvas sizing)
js/config.js        your details
js/audio.js         Web Audio engine and drum voices
js/knob.js          the knob control
js/sequencer.js     drum machine grid, transport, presets, share links
js/scope.js         oscilloscope on the LCD
js/plotter.js       flow-field plotter
js/specimen.js      type tester
js/contrast.js      contrast meter
js/life.js          Game of Life
js/patch.js         rope-physics patch cable
js/app.js           theme, sound, clock, power-on, shortcuts, mini transport
serve.py            local no-cache server
tools/build-single.mjs   bundles everything into one HTML file
DESIGN.md           design spec: concept, tokens, type, rules
```

## One-file version

```bash
node tools/build-single.mjs
```

This writes `dist/leno-instrument.html` with all CSS and JS inlined. Handy for sending or for
hosts that take a single file. Fonts still load from Google Fonts.

## Putting it online

It's a static site, so any static host works. With Vercel, from this folder:

```bash
npx vercel
```

The first run asks you to log in and links the folder to a project. It gives you a preview URL;
`npx vercel --prod` publishes to production. Netlify Drop (drag the folder onto
app.netlify.com/drop) and GitHub Pages work too.
