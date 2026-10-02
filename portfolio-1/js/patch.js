/* Contact patch bay: a Verlet-rope cable from "your idea" to "my inbox".
   Drag the plug into the jack, or press it (click, tap, Enter or Space) and it plugs itself in.
   The email address is always visible in the text beside it, so the cable never gates contact. */
(function () {
  'use strict';

  const L = window.L;
  const bay = document.getElementById('patchbay');
  const canvas = document.getElementById('patch-canvas');
  const plug = document.getElementById('patch-plug');
  const statusEl = document.getElementById('patch-status');
  const actions = document.getElementById('patch-actions');
  const led = document.getElementById('jack-led');
  const holeOut = document.querySelector('#jack-out .jack__hole');
  const holeIn = document.querySelector('#jack-in .jack__hole');
  const statusStrip = bay.querySelector('.patchbay__status');
  const g = canvas.getContext('2d');

  const COUNT = 26;
  const GRAVITY = 0.5;
  const SNAP = 48;
  const IDLE_TEXT = statusEl.textContent;
  const LABEL_FREE = plug.getAttribute('aria-label');
  const LABEL_CONNECTED = 'Cable plug, connected to my inbox. Press to unplug.';

  let pts = [];
  let seg = 10;
  let reach = 100;
  let W = 0, H = 0, dpr = 1;
  let floor = 0;
  let outJ = { x: 0, y: 0 };
  let inJ = { x: 0, y: 0 };
  let mode = 'free'; // free | held | auto | connected
  let target = null;
  let auto = null;
  let running = false;
  let calm = 0;
  let colors = {};

  function readColors() {
    colors = {
      cable: L.cssVar('--orange'),
      body: L.cssVar('--knob'),
      metal: L.cssVar('--metal-1'),
      shadow: 'rgba(0, 0, 0, 0.2)',
    };
  }

  function measure() {
    const b = bay.getBoundingClientRect();
    const center = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
    };
    W = b.width;
    H = b.height;
    outJ = center(holeOut);
    inJ = center(holeIn);
    // The cable rests on top of the status strip.
    floor = statusStrip.getBoundingClientRect().top - b.top - 5;
  }

  function pin(i, at) {
    const p = pts[i];
    p.x = p.px = at.x;
    p.y = p.py = at.y;
  }

  const endFixed = () => mode !== 'free';

  // Moves points i and j towards distance `rest`. Pinned ends don't move.
  function relax(i, j, rest, strength, pushOnly) {
    const a = pts[i], b = pts[j];
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 0.0001;
    if (pushOnly && d >= rest) return;
    const diff = ((d - rest) / d) * strength;
    const aFixed = i === 0;
    const bFixed = j === COUNT - 1 && endFixed();
    if (aFixed && bFixed) return;
    if (aFixed) { b.x -= dx * diff; b.y -= dy * diff; }
    else if (bFixed) { a.x += dx * diff; a.y += dy * diff; }
    else {
      a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
      b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
    }
  }

  function simulate() {
    const last = COUNT - 1;

    for (let i = 1; i < COUNT; i++) {
      if (i === last && endFixed()) continue;
      const p = pts[i];
      const vx = (p.x - p.px) * 0.985;
      const vy = (p.y - p.py) * 0.985;
      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY;
    }

    pin(0, outJ);
    if (mode === 'connected') pin(last, inJ);
    else if (target && (mode === 'held' || mode === 'auto')) pin(last, target);

    for (let k = 0; k < 16; k++) {
      // Each segment keeps its length.
      for (let i = 0; i < last; i++) relax(i, i + 1, seg, 1, false);
      // Points two apart resist folding, which gives the cable some stiffness.
      for (let i = 0; i < last - 1; i++) relax(i, i + 2, seg * 1.8, 0.2, true);
      for (let i = 1; i < COUNT; i++) {
        const p = pts[i];
        if (p.y > floor) p.y = floor;
        p.x = L.clamp(p.x, 8, W - 8);
      }
    }

    // Friction where the cable lies on the panel floor.
    for (let i = 1; i < COUNT; i++) {
      const p = pts[i];
      if (p.y >= floor - 0.5) p.px = p.x - (p.x - p.px) * 0.6;
    }
  }

  function layout() {
    measure();
    const span = Math.hypot(inJ.x - outJ.x, inJ.y - outJ.y);
    const length = span * 1.22;
    const drop = Math.max(0, floor - outJ.y);
    seg = length / (COUNT - 1);
    reach = length * 0.97;
    pts = [];
    for (let i = 0; i < COUNT; i++) {
      const t = i / (COUNT - 1);
      const along = t * length;
      let x, y;
      if (mode === 'connected') {
        x = L.lerp(outJ.x, inJ.x, t);
        y = outJ.y + Math.sin(t * Math.PI) * 80;
      } else if (along <= drop) {
        // Hang straight down from the jack...
        x = outJ.x;
        y = outJ.y + along;
      } else {
        // ...then lie along the shelf towards the inbox.
        x = outJ.x + (along - drop);
        y = floor;
      }
      pts.push({ x, y, px: x, py: y });
    }
    // Settle before the first frame so the cable is already at rest when it appears.
    for (let i = 0; i < 360; i++) simulate();
    pts.forEach((p) => { p.px = p.x; p.py = p.y; });
    draw();
  }

  /* ---------- drawing ---------- */

  function strokeRope(offsetX, offsetY, width, style) {
    g.beginPath();
    g.moveTo(pts[0].x + offsetX, pts[0].y + offsetY);
    for (let i = 1; i < COUNT - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      g.quadraticCurveTo(pts[i].x + offsetX, pts[i].y + offsetY, mx + offsetX, my + offsetY);
    }
    g.lineTo(pts[COUNT - 1].x + offsetX, pts[COUNT - 1].y + offsetY);
    g.lineWidth = width;
    g.strokeStyle = style;
    g.stroke();
  }

  // A jack plug: dark body along the cable, metal tip pointing out of it.
  function drawPlug(tip, behind, seated) {
    const angle = Math.atan2(tip.y - behind.y, tip.x - behind.x);
    g.save();
    g.translate(tip.x, tip.y);
    g.rotate(angle);
    if (!seated) {
      g.fillStyle = colors.metal;
      g.fillRect(-2, -3, 12, 6);
    }
    g.fillStyle = colors.body;
    g.beginPath();
    g.roundRect(-26, -8, 26, 16, 4);
    g.fill();
    g.fillStyle = 'rgba(255, 255, 255, 0.18)';
    g.fillRect(-24, -6, 22, 3);
    g.restore();
  }

  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    strokeRope(0, 5, 9, colors.shadow);
    strokeRope(0, 0, 8, colors.cable);
    strokeRope(-0.5, -2, 2, 'rgba(255, 255, 255, 0.3)');
    drawPlug(pts[0], pts[1], true);
    drawPlug(pts[COUNT - 1], pts[COUNT - 2], mode === 'connected');
    const end = pts[COUNT - 1];
    plug.style.transform = `translate(${end.x.toFixed(1)}px, ${end.y.toFixed(1)}px)`;
  }

  /* ---------- loop ---------- */

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let loopId = 0;
  let lastFrame = 0;

  function loop(now, id) {
    if (id !== loopId) return; // superseded by a restarted loop
    lastFrame = performance.now();
    if (mode === 'auto') {
      const t = Math.min(1, (now - auto.start) / 620);
      const e = easeInOut(t);
      target = {
        x: L.lerp(auto.from.x, inJ.x, e),
        y: L.lerp(auto.from.y, inJ.y, e) - Math.sin(e * Math.PI) * 90,
      };
      if (t === 1) connect();
    }
    simulate();
    draw();

    const end = pts[COUNT - 1];
    bay.classList.toggle('is-near', mode === 'held' && Math.hypot(end.x - inJ.x, end.y - inJ.y) < SNAP);

    let energy = 0;
    for (let i = 1; i < COUNT; i++) energy += Math.abs(pts[i].x - pts[i].px) + Math.abs(pts[i].y - pts[i].py);
    calm = energy < 0.25 ? calm + 1 : 0;
    if (mode === 'held' || mode === 'auto' || calm < 20) requestAnimationFrame((t) => loop(t, id));
    else running = false;
  }

  // Starts the loop, or restarts it if its last frame was long ago (frames can stall while
  // a tab is hidden), so the cable can never get stuck mid-move.
  function wake() {
    calm = 0;
    if (running && performance.now() - lastFrame < 250) return;
    running = true;
    lastFrame = performance.now();
    const id = ++loopId;
    requestAnimationFrame((t) => loop(t, id));
  }

  /* ---------- plugging in and out ---------- */

  function connect() {
    mode = 'connected';
    target = null;
    auto = null;
    bay.classList.remove('is-near');
    led.classList.add('is-on');
    statusEl.textContent = `Connected. Write to ${L.config.email} and I'll reply within two working days.`;
    actions.hidden = false;
    measure();
    plug.setAttribute('aria-label', LABEL_CONNECTED);
    L.audio.blip('plug');
    wake();
  }

  function disconnect() {
    mode = 'free';
    target = null;
    const end = pts[COUNT - 1];
    end.py = end.y + 7; // a small upward kick as it pops out
    led.classList.remove('is-on');
    statusEl.textContent = IDLE_TEXT;
    actions.hidden = true;
    measure();
    plug.setAttribute('aria-label', LABEL_FREE);
    wake();
  }

  function autoPlug() {
    const end = pts[COUNT - 1];
    if (L.reducedMotion()) {
      connect();
      return;
    }
    auto = { from: { x: end.x, y: end.y }, start: performance.now() };
    target = { x: end.x, y: end.y };
    mode = 'auto';
    wake();
  }

  function clampReach(p) {
    const dx = p.x - outJ.x, dy = p.y - outJ.y;
    const d = Math.hypot(dx, dy);
    const limited = d > reach ? { x: outJ.x + (dx / d) * reach, y: outJ.y + (dy / d) * reach } : p;
    return { x: L.clamp(limited.x, 12, W - 12), y: L.clamp(limited.y, 12, floor) };
  }

  let drag = null;
  let suppressClick = false;

  plug.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || mode === 'auto') return;
    e.preventDefault();
    plug.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, moved: false };
  });

  plug.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      if (mode === 'connected') disconnect();
      mode = 'held';
      plug.classList.add('is-held');
    }
    const b = bay.getBoundingClientRect();
    target = clampReach({ x: e.clientX - b.left, y: e.clientY - b.top });
    wake();
  });

  const release = (e) => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    plug.classList.remove('is-held');
    if (!moved) return;
    suppressClick = e.type === 'pointerup';
    const end = pts[COUNT - 1];
    if (e.type === 'pointerup' && Math.hypot(end.x - inJ.x, end.y - inJ.y) < SNAP) {
      connect();
    } else {
      mode = 'free';
      target = null;
      bay.classList.remove('is-near');
      wake();
    }
  };
  plug.addEventListener('pointerup', release);
  plug.addEventListener('pointercancel', release);

  plug.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    if (mode === 'connected') disconnect();
    else if (mode === 'free') autoPlug();
    else wake();
  });

  document.getElementById('patch-unplug').addEventListener('click', () => {
    disconnect();
    plug.focus();
  });

  /* ---------- setup ---------- */

  function fit() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    layout();
  }

  readColors();
  L.on('theme', () => { readColors(); draw(); });
  if ('ResizeObserver' in window) {
    let lastWidth = 0;
    new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      fit();
    }).observe(bay);
  } else {
    window.addEventListener('resize', fit);
  }
  fit();
  // Fonts shift the jack labels slightly once they load; re-measure then.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
