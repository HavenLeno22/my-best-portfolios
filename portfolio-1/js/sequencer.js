/* The drum machine in the hero: a 4-lane, 16-step sequencer.
   Timing uses the lookahead pattern: a 25 ms timer schedules notes slightly ahead on the audio
   clock, and a queue hands each step to the display at the moment it actually sounds. */
(function () {
  'use strict';

  const L = window.L;
  const A = L.audio;
  const STEPS = 16;
  const SCALE = [0, 3, 5, 7, 10, 12, 15]; // A minor pentatonic, semitones above A3

  const LANES = [
    { id: 'kick', color: 'var(--orange)' },
    { id: 'snare', color: 'var(--blue)' },
    { id: 'hat', color: 'var(--green)' },
    { id: 'tone', color: 'var(--yellow)' },
  ];

  const PRESETS = {
    a: {
      name: 'four on the floor',
      lanes: ['1000100010001000', '0000100000001000', '0010001000100010', '1001001000100100'],
      melody: '0302034010431205',
    },
    b: {
      name: 'broken beat',
      lanes: ['1000000010100000', '0000100000001001', '1010101010101010', '0010000100000110'],
      melody: '0040305030206420',
    },
    c: {
      name: 'half time',
      lanes: ['1000000000100000', '0000000010000000', '1010111010101110', '1000000100000010'],
      melody: '0000000300000050',
    },
    d: {
      name: 'electro',
      lanes: ['1000000100100000', '0000100000001000', '0010101000101011', '1010001010100010'],
      melody: '0020402050304060',
    },
  };

  const state = {
    lanes: [],
    melody: [],
    pattern: 'a',
    bpm: 112,
    swing: 12,
    tone: 78,
  };

  const seqEl = document.getElementById('seq');
  const playBtn = document.getElementById('play');
  const playText = playBtn.querySelector('.key__text');
  const bpmEl = document.getElementById('lcd-bpm');
  const patternEl = document.getElementById('lcd-pattern');
  const stepEl = document.getElementById('lcd-step');
  const msgEl = document.getElementById('lcd-msg');
  const lcdSteps = document.getElementById('lcd-steps');
  const patternBtns = Array.from(document.querySelectorAll('[data-pattern]'));

  /* ---------- LCD ---------- */

  let msgTimer = 0;
  const idleMessage = () => (playing ? 'playing' : 'press play');
  L.lcd = (message) => {
    msgEl.textContent = message;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msgEl.textContent = idleMessage(); }, 1800);
  };

  const lcdDots = [];
  for (let s = 0; s < STEPS; s++) lcdDots.push(lcdSteps.appendChild(document.createElement('i')));

  /* ---------- grid ---------- */

  const ruler = L.el('div', 'seq__row seq__ruler', { 'aria-hidden': 'true' });
  ruler.appendChild(L.el('span'));
  const rulerCells = [];
  for (let s = 0; s < STEPS; s++) {
    const cell = L.el('span');
    cell.append(L.el('i', 'led'), document.createTextNode(String(s + 1)));
    ruler.appendChild(cell);
    rulerCells.push(cell);
  }
  seqEl.appendChild(ruler);

  const buttons = [];
  const laneLeds = [];
  LANES.forEach((lane, li) => {
    const row = L.el('div', 'seq__row lane');
    row.style.setProperty('--lane', lane.color);
    const label = L.el('span', 'lane__label');
    const led = L.el('span', 'led', { 'aria-hidden': 'true' });
    label.append(led, document.createTextNode(lane.id));
    laneLeds.push(led);
    row.appendChild(label);
    buttons[li] = [];
    for (let s = 0; s < STEPS; s++) {
      const b = L.el('button', 'step g' + Math.floor(s / 4), {
        type: 'button',
        'aria-pressed': 'false',
        'aria-label': `${lane.id}, step ${s + 1}`,
        tabindex: li === 0 && s === 0 ? '0' : '-1',
      });
      b.dataset.lane = li;
      b.dataset.step = s;
      row.appendChild(b);
      buttons[li][s] = b;
    }
    seqEl.appendChild(row);
  });

  function renderGrid() {
    LANES.forEach((_, li) => {
      for (let s = 0; s < STEPS; s++) buttons[li][s].setAttribute('aria-pressed', String(state.lanes[li][s]));
    });
    patternBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pattern === state.pattern)));
    patternEl.textContent = state.pattern ? 'pattern ' + state.pattern : 'your beat';
    bpmEl.textContent = state.bpm;
  }

  function sound(li, s, time) {
    const id = LANES[li].id;
    A.trigger(id, time, id === 'tone' ? SCALE[state.melody[s]] : undefined);
  }

  function setStep(li, s, on) {
    state.lanes[li][s] = on;
    buttons[li][s].setAttribute('aria-pressed', String(on));
    // Stopped? Let people hear what they just switched on.
    if (on && !playing && !A.muted && A.ensure()) sound(li, s, A.now + 0.005);
    if (state.pattern) {
      state.pattern = null;
      renderGrid();
    }
    save();
  }

  // Mouse and pen toggle on press and paint while dragged. Touch toggles on tap only,
  // so a vertical swipe across the grid still scrolls the page.
  let paint = null;
  let lastPointer = 'mouse';

  seqEl.addEventListener('pointerdown', (e) => {
    lastPointer = e.pointerType;
    const b = e.target.closest('.step');
    if (!b || e.pointerType === 'touch' || e.button !== 0) return;
    const li = +b.dataset.lane, s = +b.dataset.step;
    paint = { value: !state.lanes[li][s] };
    setStep(li, s, paint.value);
    rove(b);
  });

  window.addEventListener('pointermove', (e) => {
    if (!paint) return;
    if (!(e.buttons & 1)) { paint = null; return; }
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const b = hit && hit.closest ? hit.closest('.step') : null;
    if (!b || !seqEl.contains(b)) return;
    const li = +b.dataset.lane, s = +b.dataset.step;
    if (state.lanes[li][s] !== paint.value) setStep(li, s, paint.value);
  });

  window.addEventListener('pointerup', () => { paint = null; });
  window.addEventListener('pointercancel', () => { paint = null; });

  seqEl.addEventListener('click', (e) => {
    const b = e.target.closest('.step');
    if (!b) return;
    // Pointer clicks from a mouse or pen were already handled on pointerdown.
    if (e.detail > 0 && lastPointer !== 'touch') return;
    const li = +b.dataset.lane, s = +b.dataset.step;
    setStep(li, s, !state.lanes[li][s]);
  });

  // Roving tab stop: one step is tabbable, arrow keys move between them.
  function rove(target) {
    seqEl.querySelectorAll('.step[tabindex="0"]').forEach((b) => b.setAttribute('tabindex', '-1'));
    target.setAttribute('tabindex', '0');
  }
  seqEl.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('step')) rove(e.target);
  });
  seqEl.addEventListener('keydown', (e) => {
    const b = e.target.closest('.step');
    if (!b) return;
    let li = +b.dataset.lane, s = +b.dataset.step;
    switch (e.key) {
      case 'ArrowRight': s = (s + 1) % STEPS; break;
      case 'ArrowLeft': s = (s + STEPS - 1) % STEPS; break;
      case 'ArrowDown': li = (li + 1) % LANES.length; break;
      case 'ArrowUp': li = (li + LANES.length - 1) % LANES.length; break;
      case 'Home': s = 0; break;
      case 'End': s = STEPS - 1; break;
      default: return;
    }
    e.preventDefault();
    rove(buttons[li][s]);
    buttons[li][s].focus();
  });

  /* ---------- transport ---------- */

  let playing = false;
  let timer = 0;
  let raf = 0;
  let nextTime = 0;
  let current = 0;
  let queue = [];
  let shown = -1;
  // While the browser keeps audio suspended, steps run on a silent performance clock so the
  // machine still moves. It switches to the audio clock as soon as audio is allowed.
  let silent = false;

  const stepDuration = () => 60 / state.bpm / 4;
  const now = () => (silent ? performance.now() / 1000 : A.ctx.currentTime);

  function schedule() {
    const t = now();
    // After the tab was in the background, skip ahead instead of firing a burst of old steps.
    if (nextTime < t - 0.2) nextTime = t + 0.05;
    while (nextTime < t + 0.12) {
      const swingDelay = current % 2 ? (state.swing / 100) * stepDuration() * 0.66 : 0;
      const time = nextTime + swingDelay;
      const hits = [];
      LANES.forEach((lane, li) => {
        if (state.lanes[li][current]) {
          if (!silent) sound(li, current, time);
          hits.push(lane.id);
        }
      });
      queue.push({ step: current, time, hits });
      nextTime += stepDuration();
      current = (current + 1) % STEPS;
    }
  }

  function showStep(s) {
    if (shown >= 0) {
      rulerCells[shown].classList.remove('is-now');
      lcdDots[shown].classList.remove('is-on');
      LANES.forEach((_, li) => buttons[li][shown].classList.remove('is-now'));
    }
    shown = s;
    if (s < 0) {
      stepEl.textContent = 'step --';
      return;
    }
    rulerCells[s].classList.add('is-now');
    lcdDots[s].classList.add('is-on');
    LANES.forEach((_, li) => buttons[li][s].classList.add('is-now'));
    stepEl.textContent = 'step ' + L.pad(s + 1, 2);
  }

  function flashLane(li) {
    const led = laneLeds[li];
    led.classList.add('is-hit');
    setTimeout(() => led.classList.remove('is-hit'), 90);
  }

  function draw() {
    const t = now();
    while (queue.length && queue[0].time <= t + 0.008) {
      const event = queue.shift();
      if (t - event.time > 0.25) continue;
      showStep(event.step);
      event.hits.forEach((id) => flashLane(LANES.findIndex((l) => l.id === id)));
      L.emit('step', event);
    }
    if (playing) raf = requestAnimationFrame(draw);
  }

  function start() {
    const ctx = A.ensure();
    silent = !ctx || ctx.state !== 'running';
    playing = true;
    current = 0;
    queue = [];
    nextTime = now() + 0.06;
    schedule();
    timer = setInterval(schedule, 25);
    raf = requestAnimationFrame(draw);
    playBtn.classList.add('is-playing');
    playText.textContent = 'stop';
    msgEl.textContent = A.muted || silent ? 'playing, no sound' : 'playing';
    L.emit('transport', { playing: true });

    if (!ctx) {
      L.toast('This browser cannot play Web Audio, so the drum machine runs silently.');
    } else if (silent) {
      ctx.resume().then(() => {
        if (!playing || !silent || ctx.state !== 'running') return;
        silent = false;
        queue = [];
        current = 0;
        nextTime = ctx.currentTime + 0.05;
        if (!A.muted) msgEl.textContent = 'playing';
      }, () => {});
    }
  }

  function stop() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    cancelAnimationFrame(raf);
    queue = [];
    showStep(-1);
    playBtn.classList.remove('is-playing');
    playText.textContent = 'play';
    msgEl.textContent = 'stopped';
    L.emit('transport', { playing: false });
  }

  const toggle = () => (playing ? stop() : start());
  playBtn.addEventListener('click', toggle);

  /* ---------- patterns ---------- */

  function loadPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    state.lanes = preset.lanes.map((row) => Array.from(row, (c) => c === '1'));
    state.melody = Array.from(preset.melody, Number);
    state.pattern = key;
    renderGrid();
    save();
    L.lcd(preset.name);
  }

  function shake() {
    const chance = {
      kick: (s) => (s === 0 ? 1 : s % 4 === 0 ? 0.55 : s % 2 === 0 ? 0.18 : 0.07),
      snare: (s) => (s === 4 || s === 12 ? 0.92 : s % 2 ? 0.09 : 0.05),
      hat: (s) => (s % 2 === 0 ? 0.72 : 0.3),
      tone: (s) => (s % 4 === 0 ? 0.5 : 0.26),
    };
    state.lanes = LANES.map((lane) => Array.from({ length: STEPS }, (_, s) => Math.random() < chance[lane.id](s)));
    state.melody = Array.from({ length: STEPS }, () => Math.floor(Math.random() * SCALE.length));
    state.pattern = null;
    renderGrid();
    save();
    L.lcd('shaken');
  }

  function clear() {
    state.lanes = LANES.map(() => new Array(STEPS).fill(false));
    state.pattern = null;
    renderGrid();
    save();
    L.lcd('cleared');
  }

  patternBtns.forEach((b) => b.addEventListener('click', () => loadPreset(b.dataset.pattern)));
  document.getElementById('shake').addEventListener('click', shake);
  document.getElementById('clear').addEventListener('click', clear);

  /* ---------- saving and sharing ---------- */

  function save() {
    L.store.set('beat', {
      lanes: state.lanes.map((lane) => lane.map(Number).join('')),
      melody: state.melody.join(''),
      pattern: state.pattern,
      bpm: state.bpm,
      swing: state.swing,
      tone: state.tone,
    });
  }

  // A beat fits in a plain anchor: #beat-<4 lanes as hex>-<melody digits>-<bpm>
  function encode() {
    const hex = state.lanes.map((lane) => parseInt(lane.map(Number).join(''), 2).toString(16).padStart(4, '0')).join('');
    return `beat-${hex}-${state.melody.join('')}-${state.bpm}`;
  }

  function decode(token) {
    const m = /^beat-([0-9a-f]{16})-([0-6]{16})-(\d{2,3})$/.exec(token);
    if (!m) return false;
    state.lanes = [0, 1, 2, 3].map((i) =>
      Array.from(parseInt(m[1].slice(i * 4, i * 4 + 4), 16).toString(2).padStart(16, '0'), (c) => c === '1'));
    state.melody = Array.from(m[2], Number);
    state.bpm = L.clamp(Number(m[3]), 60, 180);
    state.pattern = null;
    return true;
  }

  document.getElementById('share').addEventListener('click', () => {
    const token = encode();
    const url = location.href.split('#')[0] + '#' + token;
    L.copy(url).then((ok) => {
      if (ok) {
        L.toast('Link to this beat copied. Anyone who opens it hears what you made.');
      } else {
        history.replaceState(null, '', '#' + token);
        L.toast('Copying was blocked, so the beat link is now in the address bar.');
      }
    });
  });

  /* ---------- start-up ---------- */

  const saved = L.store.get('beat', null);
  const shared = location.hash.length > 1 && decode(location.hash.slice(1));

  if (!shared && saved && Array.isArray(saved.lanes) && saved.lanes.length === 4) {
    state.lanes = saved.lanes.map((row) => Array.from(String(row).padEnd(STEPS, '0').slice(0, STEPS), (c) => c === '1'));
    state.melody = Array.from(String(saved.melody || PRESETS.a.melody).padEnd(STEPS, '0').slice(0, STEPS), (c) => L.clamp(Number(c) || 0, 0, SCALE.length - 1));
    state.pattern = saved.pattern in PRESETS ? saved.pattern : null;
    state.bpm = L.clamp(Number(saved.bpm) || 112, 60, 180);
    state.swing = L.clamp(Number(saved.swing) || 0, 0, 60);
    const savedTone = Number(saved.tone);
    state.tone = L.clamp(Number.isFinite(savedTone) ? savedTone : 78, 0, 100);
  } else if (!shared) {
    state.lanes = PRESETS.a.lanes.map((row) => Array.from(row, (c) => c === '1'));
    state.melody = Array.from(PRESETS.a.melody, Number);
  }
  A.setTone(state.tone / 100);
  renderGrid();

  L.knob(document.getElementById('knob-tempo'), {
    min: 60, max: 180, step: 1, value: state.bpm, label: 'Tempo',
    labelEl: document.getElementById('knob-tempo-label'),
    format: (v) => v + ' bpm',
    onInput: (v) => { state.bpm = v; bpmEl.textContent = v; save(); },
  });
  L.knob(document.getElementById('knob-tone'), {
    min: 0, max: 100, step: 1, value: state.tone, label: 'Tone, filter cutoff',
    labelEl: document.getElementById('knob-tone-label'),
    format: (v) => v + '%',
    onInput: (v) => { state.tone = v; A.setTone(v / 100); L.lcd('tone ' + v); save(); },
  });
  L.knob(document.getElementById('knob-swing'), {
    min: 0, max: 60, step: 1, value: state.swing, label: 'Swing',
    labelEl: document.getElementById('knob-swing-label'),
    format: (v) => v + '%',
    onInput: (v) => { state.swing = v; L.lcd('swing ' + v); save(); },
  });

  L.seq = {
    toggle,
    stop,
    shake,
    clear,
    loadPreset,
    showStep,
    get playing() { return playing; },
    get sharedOnLoad() { return shared; },
  };
})();
