/* Contrast: WCAG 2 contrast ratio between a text colour and its ground, both set as HSL. */
(function () {
  'use strict';

  const L = window.L;
  const preview = document.getElementById('contrast-preview');
  const ratioEl = document.getElementById('contrast-ratio');
  const checks = Array.from(document.querySelectorAll('#contrast-checks li'));
  const fgHex = document.getElementById('contrast-fg-hex');
  const bgHex = document.getElementById('contrast-bg-hex');

  // Starts on a warm orange that fails body-text contrast, so Fix has something to do.
  const color = {
    fg: { h: 16, s: 88, l: 52 },
    bg: { h: 90, s: 14, l: 94 },
  };

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  }

  const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

  function luminance(rgb) {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function ratioOf(fg, bg) {
    const a = luminance(hslToRgb(fg.h, fg.s, fg.l));
    const b = luminance(hslToRgb(bg.h, bg.s, bg.l));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function render() {
    const fg = hslToRgb(color.fg.h, color.fg.s, color.fg.l);
    const bg = hslToRgb(color.bg.h, color.bg.s, color.bg.l);
    const ratio = ratioOf(color.fg, color.bg);
    preview.style.color = toHex(fg);
    preview.style.background = toHex(bg);
    ratioEl.textContent = ratio.toFixed(2) + ' : 1';
    checks.forEach((li) => {
      const pass = ratio >= Number(li.dataset.min);
      li.classList.toggle('is-pass', pass);
      li.querySelector('.led').classList.toggle('is-on', pass);
      li.querySelector('strong').textContent = pass ? 'pass' : 'fail';
    });
    fgHex.textContent = toHex(fg);
    bgHex.textContent = toHex(bg);
    // Accessible names start with the visible text, then say what pressing does.
    fgHex.setAttribute('aria-label', `${toHex(fg)}, copy text colour`);
    bgHex.setAttribute('aria-label', `${toHex(bg)}, copy background colour`);
    fgHex.style.setProperty('--chip', toHex(fg));
    bgHex.style.setProperty('--chip', toHex(bg));
  }

  const knobs = {};
  const make = (id, key, prop, max, label, fmt) => {
    knobs[key + prop] = L.knob(document.getElementById(id), {
      min: 0, max, step: 1, value: color[key][prop], label,
      labelEl: document.getElementById(id + '-label'),
      format: fmt,
      onInput: (v) => { color[key][prop] = v; render(); },
    });
  };
  make('knob-fg-h', 'fg', 'h', 360, 'Text hue', (v) => 'hue ' + v + '°');
  make('knob-fg-l', 'fg', 'l', 100, 'Text lightness', (v) => 'light ' + v + '%');
  make('knob-bg-h', 'bg', 'h', 360, 'Background hue', (v) => 'hue ' + v + '°');
  make('knob-bg-l', 'bg', 'l', 100, 'Background lightness', (v) => 'light ' + v + '%');

  // Binary search for the text lightness closest to the current one that reaches 4.5:1,
  // looking both darker and lighter and keeping whichever needs the smaller change.
  function fix() {
    const target = 4.5;
    if (ratioOf(color.fg, color.bg) >= target) {
      L.toast('Already passes body-text contrast. Nothing to fix.');
      return;
    }
    const search = (towards) => {
      const end = { ...color.fg, l: towards };
      if (ratioOf(end, color.bg) < target) return null;
      let lo = color.fg.l, hi = towards;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (ratioOf({ ...color.fg, l: mid }, color.bg) >= target) hi = mid;
        else lo = mid;
      }
      return towards < color.fg.l ? Math.floor(hi) : Math.ceil(hi);
    };
    const options = [search(0), search(100)].filter((v) => v !== null);
    if (!options.length) {
      L.toast('No text lightness reaches 4.5:1 on this ground. Change the ground lightness first.');
      return;
    }
    const best = options.reduce((a, b) => (Math.abs(a - color.fg.l) <= Math.abs(b - color.fg.l) ? a : b));
    const before = color.fg.l;
    color.fg.l = best;
    knobs.fgl.set(best, false);
    render();
    L.toast(`Text lightness moved from ${before}% to ${best}%. Ratio is now ${ratioOf(color.fg, color.bg).toFixed(2)} : 1.`);
  }

  function swap() {
    const fg = { ...color.fg };
    color.fg = { ...color.bg, s: fg.s };
    color.bg = { ...fg, s: color.bg.s };
    knobs.fgh.set(color.fg.h, false);
    knobs.fgl.set(color.fg.l, false);
    knobs.bgh.set(color.bg.h, false);
    knobs.bgl.set(color.bg.l, false);
    render();
  }

  document.getElementById('contrast-fix').addEventListener('click', fix);
  document.getElementById('contrast-swap').addEventListener('click', swap);

  [fgHex, bgHex].forEach((chip) => {
    chip.addEventListener('click', () => {
      const hex = chip.textContent;
      L.copy(hex).then((ok) => L.toast(ok ? hex + ' copied.' : 'Copying was blocked by the browser.'));
    });
  });

  render();
})();
