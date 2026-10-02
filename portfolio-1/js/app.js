/* Page-level wiring: theme and sound switches, clock, the power-on sequence, keyboard
   shortcuts, section tracking, the floating mini transport, and beat-driven details. */
(function () {
  'use strict';

  const L = window.L;
  const cfg = L.config;
  const root = document.documentElement;

  /* ---------- personal details from config ---------- */

  document.querySelectorAll('[data-email]').forEach((a) => {
    a.textContent = cfg.email;
    a.href = 'mailto:' + cfg.email;
  });
  document.querySelectorAll('[data-email-compose]').forEach((a) => {
    a.href = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Hello from your portfolio');
  });
  document.querySelectorAll('[data-place]').forEach((n) => { n.textContent = cfg.place; });
  document.querySelectorAll('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });
  document.querySelectorAll('[data-copy-email]').forEach((b) => {
    b.addEventListener('click', () => {
      L.copy(cfg.email).then((ok) => L.toast(ok ? `${cfg.email} copied.` : `Copying was blocked. The address is ${cfg.email}.`));
    });
  });

  /* ---------- theme ---------- */

  const themeSwitch = document.getElementById('theme-switch');

  function syncThemeSwitch() {
    themeSwitch.setAttribute('aria-checked', String(L.isDark()));
  }

  function setTheme(dark) {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    L.store.set('theme', dark ? 'dark' : 'light');
    // The MutationObserver below syncs the switch and tells the canvases to repaint.
  }

  themeSwitch.addEventListener('click', () => setTheme(!L.isDark()));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!root.hasAttribute('data-theme')) {
      syncThemeSwitch();
      L.emit('theme');
    }
  });
  // The page may be hosted inside a viewer that sets data-theme itself.
  new MutationObserver(() => { syncThemeSwitch(); L.emit('theme'); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  syncThemeSwitch();

  /* ---------- sound ---------- */

  const soundSwitch = document.getElementById('sound-switch');
  soundSwitch.setAttribute('aria-checked', String(!L.audio.muted));
  function toggleSound() {
    const on = soundSwitch.getAttribute('aria-checked') !== 'true';
    soundSwitch.setAttribute('aria-checked', String(on));
    L.audio.setMuted(!on);
    L.toast(on ? 'Sound on.' : 'Sound off. The drum machine keeps playing silently.');
  }
  soundSwitch.addEventListener('click', toggleSound);

  /* ---------- clock ---------- */

  const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: cfg.timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: cfg.timeZone, hour: 'numeric', hour12: false });
  const nowStatus = document.getElementById('now-status');

  function tick() {
    const now = new Date();
    const time = clockFmt.format(now);
    const hour = Number(hourFmt.format(now)) % 24;
    document.querySelectorAll('[data-clock]').forEach((n) => { n.textContent = time; });
    let line;
    if (hour >= cfg.workStart && hour < cfg.workEnd) line = `It's ${time} here, so I'm at the desk.`;
    else if (hour >= cfg.workEnd && hour < 24) line = `It's ${time} here. I'm probably still around.`;
    else if (hour < 7) line = `It's ${time} here and I'm asleep. I'll reply in the morning.`;
    else line = `It's ${time} here. Starting the day soon.`;
    nowStatus.textContent = line;
  }
  tick();
  setInterval(tick, 20000);

  /* ---------- power-on: the page's one choreographed moment ---------- */

  const device = document.getElementById('device');
  const lcdMsg = document.getElementById('lcd-msg');

  function boot() {
    // If someone pressed play before power-on finished, leave the running machine alone.
    if (L.seq.playing || L.reducedMotion()) {
      device.dataset.state = 'on';
      if (L.seq.sharedOnLoad && !L.seq.playing) L.lcd('shared beat loaded');
      return;
    }
    device.dataset.state = 'booting';
    lcdMsg.textContent = 'hello';
    // The playhead sweeps once across the steps, like a machine checking its LEDs.
    for (let s = 0; s < 16; s++) {
      setTimeout(() => { if (!L.seq.playing) L.seq.showStep(s); }, 260 + s * 32);
    }
    setTimeout(() => {
      device.dataset.state = 'on';
      if (L.seq.playing) return;
      L.seq.showStep(-1);
      lcdMsg.textContent = 'press play';
      if (L.seq.sharedOnLoad) L.lcd('shared beat loaded');
    }, 260 + 16 * 32 + 120);
  }

  // Power on once the fonts are in (or after 900 ms on a slow connection). Timers, not animation
  // frames, so the device still comes on where frames are paused.
  const fontsIn = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsIn, new Promise((resolve) => setTimeout(resolve, 900))]).then(() => {
    device.classList.add('is-ready');
    setTimeout(boot, 120);
  });

  /* ---------- keyboard shortcuts ---------- */

  const sheet = document.getElementById('shortcuts');
  const openSheet = () => { if (!sheet.open) sheet.showModal(); };
  document.getElementById('open-shortcuts').addEventListener('click', openSheet);

  const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  // Space activates focused buttons and turns knobs, so only take it when focus is elsewhere.
  const ownsSpace = (el) => el && el.closest && el.closest('button, a, [role="slider"], [role="application"], summary, [tabindex]');

  const shortcuts = {
    1: () => L.seq.loadPreset('a'),
    2: () => L.seq.loadPreset('b'),
    3: () => L.seq.loadPreset('c'),
    4: () => L.seq.loadPreset('d'),
    r: () => L.seq.shake(),
    c: () => L.seq.clear(),
    n: () => setTheme(!L.isDark()),
    m: () => toggleSound(),
    '?': openSheet,
  };

  // Held keys auto-repeat; every shortcut acts once per press.
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    if (isTyping(target) || sheet.open) return;

    if (e.key === ' ') {
      if (ownsSpace(target) && target !== document.body) return;
      e.preventDefault(); // on repeats too, so a held space bar never scrolls the page
      if (!e.repeat) L.seq.toggle();
      return;
    }
    if (ownsSpace(target) && target.getAttribute('role') === 'application') return;

    const action = shortcuts[e.key.toLowerCase()];
    if (!action) return;
    e.preventDefault();
    if (!e.repeat) action();
  });

  /* ---------- section tracking in the nav ---------- */

  const navLinks = Array.from(document.querySelectorAll('.topbar__nav a'));
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href')));
  if ('IntersectionObserver' in window) {
    const seen = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting));
      const active = sections.find((s) => seen.get(s));
      navLinks.forEach((a, i) => {
        if (sections[i] === active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  const topbar = document.getElementById('topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mini transport while the beat plays off-screen ---------- */

  const mini = document.getElementById('minideck');
  const miniSteps = document.getElementById('mini-steps');
  const miniDots = [];
  for (let s = 0; s < 16; s++) miniDots.push(miniSteps.appendChild(document.createElement('i')));
  const miniFocusables = mini.querySelectorAll('button, a');
  let deviceVisible = true;
  let lastMini = -1;

  function updateMini() {
    const show = L.seq.playing && !deviceVisible;
    mini.classList.toggle('is-visible', show);
    mini.setAttribute('aria-hidden', String(!show));
    miniFocusables.forEach((n) => n.setAttribute('tabindex', show ? '0' : '-1'));
    document.body.classList.toggle('has-minideck', show);
  }

  L.watchVisible(device, (v) => { deviceVisible = v; updateMini(); });
  document.getElementById('mini-stop').addEventListener('click', () => {
    // The mini deck hides once stopped, so move focus to the main play key before it goes.
    document.getElementById('play').focus({ preventScroll: true });
    L.seq.stop();
  });

  /* ---------- details that follow the beat ---------- */

  const grille = document.getElementById('grille');
  const pedalLeds = Array.from(document.querySelectorAll('.pedal .led'));
  let pedalOn = -1;

  L.on('step', (event) => {
    if (lastMini >= 0) miniDots[lastMini].classList.remove('is-on');
    miniDots[event.step].classList.add('is-on');
    lastMini = event.step;

    if (event.hits.includes('kick')) {
      grille.classList.add('is-thump');
      setTimeout(() => grille.classList.remove('is-thump'), 70);
    }

    // The signal travels down the process chain, one pedal per beat.
    if (event.step % 4 === 0) {
      if (pedalOn >= 0) pedalLeds[pedalOn].classList.remove('is-on');
      pedalOn = event.step / 4;
      pedalLeds[pedalOn].classList.add('is-on');
    }
  });

  L.on('transport', (state) => {
    updateMini();
    if (!state.playing) {
      if (lastMini >= 0) miniDots[lastMini].classList.remove('is-on');
      lastMini = -1;
      if (pedalOn >= 0) pedalLeds[pedalOn].classList.remove('is-on');
      pedalOn = -1;
    }
  });

  /* ---------- the LCD oscilloscope ---------- */

  L.scope(document.getElementById('scope'));
})();
