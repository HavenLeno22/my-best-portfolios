/* Plotter: seeded flow-field drawings. Lines are computed once as point lists, drawn onto canvas
   segment by segment with a visible pen head, and exported from the same data as SVG. */
(function () {
  'use strict';

  const L = window.L;
  const W = 600;
  const H = 400;
  const MARGIN = 26;

  const canvas = document.getElementById('plotter-canvas');
  const pen = document.getElementById('plotter-pen');
  const seedEl = document.getElementById('plotter-seed');
  const g = canvas.getContext('2d');

  let seed = 1000 + Math.floor(Math.random() * 9000);
  let density = 150;
  let flow = 45;
  let lines = [];
  let job = 0;

  // Perlin-style gradient noise with a permutation table shuffled by the seed.
  function makeNoise(rand) {
    const perm = new Uint8Array(512);
    const base = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const grad = (h, x, y) => {
      const a = (h & 7) * (Math.PI / 4);
      return Math.cos(a) * x + Math.sin(a) * y;
    };
    return (x, y) => {
      const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x), yf = y - Math.floor(y);
      const u = fade(xf), v = fade(yf);
      const aa = perm[perm[xi] + yi], ab = perm[perm[xi] + yi + 1];
      const ba = perm[perm[xi + 1] + yi], bb = perm[perm[xi + 1] + yi + 1];
      const top = L.lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
      const bottom = L.lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
      return L.lerp(top, bottom, v);
    };
  }

  function generate() {
    const rand = L.rng(seed);
    const noise = makeNoise(rand);
    const freq = 0.002 + (flow / 100) * 0.012;
    const out = [];
    for (let i = 0; i < density; i++) {
      let x = MARGIN + rand() * (W - MARGIN * 2);
      let y = MARGIN + rand() * (H - MARGIN * 2);
      const pts = [x, y];
      const length = 30 + Math.floor(rand() * 110);
      for (let s = 0; s < length; s++) {
        const angle = noise(x * freq, y * freq) * Math.PI * 3;
        x += Math.cos(angle) * 3;
        y += Math.sin(angle) * 3;
        if (x < MARGIN || x > W - MARGIN || y < MARGIN || y > H - MARGIN) break;
        pts.push(x, y);
      }
      // About one line in nine goes to the second pen.
      if (pts.length > 8) out.push({ pts, pen: rand() < 0.11 ? 1 : 0 });
    }
    return out;
  }

  const colors = () => ({
    paper: L.cssVar('--paper'),
    ink: L.cssVar('--paper-ink'),
    accent: L.cssVar('--orange'),
  });

  function setupContext() {
    const scale = canvas.width / W;
    g.setTransform(scale, 0, 0, scale, 0, 0);
    g.lineWidth = 1.1;
    g.lineCap = 'round';
    g.lineJoin = 'round';
  }

  function drawAll() {
    const c = colors();
    setupContext();
    g.clearRect(0, 0, W, H);
    lines.forEach((line) => {
      g.strokeStyle = line.pen ? c.accent : c.ink;
      g.beginPath();
      g.moveTo(line.pts[0], line.pts[1]);
      for (let i = 2; i < line.pts.length; i += 2) g.lineTo(line.pts[i], line.pts[i + 1]);
      g.stroke();
    });
  }

  // Draws the lines progressively, moving the pen head along with the newest segment.
  function plot() {
    const myJob = ++job;
    if (L.reducedMotion()) {
      drawAll();
      return;
    }
    const c = colors();
    setupContext();
    g.clearRect(0, 0, W, H);
    const totalSegments = lines.reduce((n, line) => n + line.pts.length / 2 - 1, 0);
    const perFrame = Math.max(20, Math.ceil(totalSegments / (2.6 * 60)));
    let li = 0;
    let pi = 2;
    pen.classList.add('is-drawing');

    function frame() {
      if (myJob !== job) return;
      let budget = perFrame;
      while (budget > 0 && li < lines.length) {
        const line = lines[li];
        g.strokeStyle = line.pen ? c.accent : c.ink;
        g.beginPath();
        g.moveTo(line.pts[pi - 2], line.pts[pi - 1]);
        g.lineTo(line.pts[pi], line.pts[pi + 1]);
        g.stroke();
        pi += 2;
        budget--;
        if (pi >= line.pts.length) { li++; pi = 2; }
      }
      if (li < lines.length) {
        const line = lines[li];
        const k = canvas.clientWidth / W;
        pen.style.transform = `translate(${(line.pts[pi - 2] * k).toFixed(1)}px, ${(line.pts[pi - 1] * k).toFixed(1)}px)`;
        requestAnimationFrame(frame);
      } else {
        pen.classList.remove('is-drawing');
      }
    }
    requestAnimationFrame(frame);
  }

  // Stops any plot in progress and shows the whole drawing. A resize or theme change mid-plot
  // lands here, so the animation never keeps drawing with a stale scale or ink colour.
  function finish() {
    job++;
    pen.classList.remove('is-drawing');
    drawAll();
  }

  function refresh(animate) {
    lines = generate();
    seedEl.textContent = 'seed ' + seed;
    if (animate) plot();
    else finish();
  }

  function toSvg() {
    const c = colors();
    const paths = lines.map((line) => {
      let d = `M${line.pts[0].toFixed(1)} ${line.pts[1].toFixed(1)}`;
      for (let i = 2; i < line.pts.length; i += 2) d += `L${line.pts[i].toFixed(1)} ${line.pts[i + 1].toFixed(1)}`;
      return `<path d="${d}" stroke="${line.pen ? c.accent : c.ink}"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
      `<rect width="${W}" height="${H}" fill="${c.paper}"/>` +
      `<g fill="none" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  }

  let knobTimer = 0;
  const redrawSoon = () => {
    clearTimeout(knobTimer);
    knobTimer = setTimeout(() => refresh(false), 40);
  };

  L.knob(document.getElementById('knob-density'), {
    min: 30, max: 300, step: 5, value: density, label: 'Number of lines',
    labelEl: document.getElementById('knob-density-label'),
    format: (v) => v + ' lines',
    onInput: (v) => { density = v; redrawSoon(); },
  });
  L.knob(document.getElementById('knob-flow'), {
    min: 0, max: 100, step: 1, value: flow, label: 'Flow, how tightly lines curl',
    labelEl: document.getElementById('knob-flow-label'),
    format: (v) => 'flow ' + v,
    onInput: (v) => { flow = v; redrawSoon(); },
  });

  document.getElementById('plotter-new').addEventListener('click', () => {
    seed = 1000 + Math.floor(Math.random() * 9000);
    refresh(true);
  });

  document.getElementById('plotter-copy').addEventListener('click', () => {
    L.copy(toSvg()).then((ok) => {
      L.toast(ok ? `Drawing ${seed} copied as SVG. Paste it into Figma or any vector editor.` : 'Copying was blocked by the browser.');
    });
  });

  L.fitCanvas(canvas, finish);
  L.on('theme', finish);

  // Plot the first drawing when the module first scrolls into view.
  lines = generate();
  seedEl.textContent = 'seed ' + seed;
  drawAll();
  let plottedOnce = false;
  L.watchVisible(canvas, (visible) => {
    if (visible && !plottedOnce) {
      plottedOnce = true;
      plot();
    }
  }, '-15% 0px');
})();
