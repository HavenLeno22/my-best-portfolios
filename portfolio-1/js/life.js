/* Life: Conway's Game of Life on a 16x16 wrapping LED matrix.
   Runs on its own timer, or one generation per beat while the drum machine plays. */
(function () {
  'use strict';

  const L = window.L;
  const N = 16;
  const canvas = document.getElementById('life-canvas');
  const g = canvas.getContext('2d');
  const runBtn = document.getElementById('life-run');
  const readout = document.getElementById('life-readout');

  let cells = new Uint8Array(N * N);
  let scratch = new Uint8Array(N * N);
  let born = new Uint8Array(N * N);
  let gen = 0;
  let running = false;
  let synced = false;
  let visible = false;
  let timer = 0;
  let cursor = { x: 7, y: 7 };
  let showCursor = false;
  let colors = {};

  const idx = (x, y) => ((y + N) % N) * N + ((x + N) % N);

  function readColors() {
    colors = {
      matrix: L.cssVar('--matrix'),
      on: L.cssVar('--orange'),
      focus: L.cssVar('--focus'),
    };
  }

  function place(pattern, ox, oy) {
    pattern.forEach(([x, y]) => { cells[idx(ox + x, oy + y)] = 1; });
  }

  function seedDefault() {
    cells.fill(0);
    place([[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]], 1, 1);         // glider
    place([[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]], 8, 7);         // R-pentomino
    place([[0, 0], [1, 0], [2, 0]], 11, 13);                       // blinker
  }

  function step() {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx || dy) n += cells[idx(x + dx, y + dy)];
          }
        }
        const i = y * N + x;
        const alive = cells[i] === 1;
        scratch[i] = n === 3 || (alive && n === 2) ? 1 : 0;
        born[i] = scratch[i] && !alive ? 1 : 0;
      }
    }
    [cells, scratch] = [scratch, cells];
    gen++;
    draw();
  }

  function draw() {
    const w = canvas.width;
    const size = w / N;
    const r = size * 0.34;
    g.clearRect(0, 0, w, w);
    g.fillStyle = colors.matrix;
    g.fillRect(0, 0, w, w);

    // Unlit LEDs first, then lit ones with a glow.
    g.fillStyle = 'rgba(255, 255, 255, 0.07)';
    g.beginPath();
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]) continue;
      const cx = (i % N + 0.5) * size, cy = (Math.floor(i / N) + 0.5) * size;
      g.moveTo(cx + r, cy);
      g.arc(cx, cy, r, 0, Math.PI * 2);
    }
    g.fill();

    g.save();
    g.shadowColor = colors.on;
    g.shadowBlur = size * 0.6;
    for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) continue;
      const cx = (i % N + 0.5) * size, cy = (Math.floor(i / N) + 0.5) * size;
      g.fillStyle = born[i] ? '#FFD2BD' : colors.on;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    if (showCursor) {
      g.strokeStyle = colors.focus;
      g.lineWidth = Math.max(2, size * 0.1);
      g.strokeRect(cursor.x * size + 1, cursor.y * size + 1, size - 2, size - 2);
    }

    readout.textContent = 'gen ' + L.pad(gen % 10000, 4) + (running && synced ? ' on beat' : '');  }

  /* ---------- clock ---------- */

  function restartClock() {
    clearInterval(timer);
    timer = 0;
    if (running && !synced) {
      timer = setInterval(() => { if (visible) step(); }, 150);
    }
    draw();
  }

  runBtn.addEventListener('click', () => {
    running = !running;
    runBtn.setAttribute('aria-pressed', String(running));
    restartClock();
  });
  document.getElementById('life-step').addEventListener('click', step);
  document.getElementById('life-seed').addEventListener('click', () => {
    for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < 0.3 ? 1 : 0;
    born.fill(0);
    gen = 0;
    draw();
  });
  document.getElementById('life-clear').addEventListener('click', () => {
    cells.fill(0);
    born.fill(0);
    gen = 0;
    draw();
  });

  L.on('transport', (state) => {
    synced = state.playing;
    restartClock();
  });
  L.on('step', (event) => {
    if (running && event.step % 4 === 0) step();
  });
  L.on('theme', () => { readColors(); draw(); });
  L.watchVisible(canvas, (v) => { visible = v; });

  /* ---------- drawing cells ---------- */

  let paint = null;

  function cellAt(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * N);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * N);
    if (x < 0 || y < 0 || x >= N || y >= N) return -1;
    return y * N + x;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const i = cellAt(e);
    if (i < 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    paint = cells[i] ? 0 : 1;
    cells[i] = paint;
    born[i] = 0;
    showCursor = false;
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (paint === null) return;
    if (!(e.buttons & 1)) { paint = null; return; }
    const i = cellAt(e);
    if (i < 0 || cells[i] === paint) return;
    cells[i] = paint;
    born[i] = 0;
    draw();
  });
  const endPaint = () => { paint = null; };
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);

  canvas.addEventListener('keydown', (e) => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      cursor.x = (cursor.x + moves[e.key][0] + N) % N;
      cursor.y = (cursor.y + moves[e.key][1] + N) % N;
    } else if (e.key === ' ' || e.key === 'Enter') {
      const i = cursor.y * N + cursor.x;
      cells[i] = cells[i] ? 0 : 1;
      born[i] = 0;
    } else {
      return;
    }
    e.preventDefault();
    showCursor = true;
    draw();
  });
  canvas.addEventListener('focus', () => { if (canvas.matches(':focus-visible')) { showCursor = true; draw(); } });
  canvas.addEventListener('blur', () => { showCursor = false; draw(); });

  readColors();
  seedDefault();
  L.fitCanvas(canvas, () => draw());
  draw();
})();
