/* Small live demos inside the project modules: how SurgeGuard maps a Crowd Stability Index
   score to the status operators see, and a Morse encoder that plays through the page's
   audio engine (a re-creation of one feature of the Multi-Mode AI Translator). */
(function () {
  'use strict';

  const L = window.L;

  /* ---------- SurgeGuard: score bands, as documented in the project's README ---------- */

  const BANDS = [
    { min: 80, id: 'stable', label: 'stable' },
    { min: 60, id: 'observe', label: 'observe' },
    { min: 40, id: 'attention', label: 'attention required' },
    { min: 20, id: 'high', label: 'high alert' },
    { min: 0, id: 'critical', label: 'critical' },
  ];

  const csi = document.getElementById('csi');
  const csiValue = document.getElementById('csi-value');
  const csiStatus = document.getElementById('csi-status');
  const csiNeedle = document.getElementById('csi-needle');

  function showScore(score) {
    const band = BANDS.find((b) => score >= b.min);
    csiValue.textContent = score;
    csiNeedle.style.left = score + '%';
    // Only touch the live region when the band changes, so screen readers hear the status once.
    if (csi.dataset.band !== band.id) {
      csi.dataset.band = band.id;
      csiStatus.textContent = band.label;
    }
  }

  L.knob(document.getElementById('knob-csi'), {
    min: 0, max: 100, step: 1, value: 72, label: 'Crowd Stability Index score',
    labelEl: document.getElementById('knob-csi-label'),
    format: (v) => 'score ' + v,
    onInput: showScore,
  });
  showScore(72);

  /* ---------- Translator: Morse encoder ---------- */

  const MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
    J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....',
    7: '--...', 8: '---..', 9: '----.',
  };
  const UNIT = 0.08; // seconds per Morse unit, about 15 words per minute

  const input = document.getElementById('morse-input');
  const output = document.getElementById('morse-code');
  const playBtn = document.getElementById('morse-play');
  const playText = playBtn.querySelector('.key__text');

  let symbols = []; // { el, dash } in playing order, plus null entries for gaps
  let timers = [];

  const cleanText = () => input.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  function render() {
    stop();
    const text = cleanText();
    output.textContent = '';
    symbols = [];
    text.split(' ').filter(Boolean).forEach((word, wi) => {
      if (wi) {
        output.appendChild(L.el('span', 'morse__gap'));
        symbols.push({ gap: 7 });
      }
      word.split('').forEach((letter, li) => {
        if (li) symbols.push({ gap: 3 });
        const group = L.el('span', 'morse__letter');
        group.dataset.letter = letter;
        MORSE[letter].split('').forEach((mark, mi) => {
          if (mi) symbols.push({ gap: 1 });
          const el = L.el('i', mark === '-' ? 'morse__dash' : 'morse__dot');
          group.appendChild(el);
          symbols.push({ el, dash: mark === '-' });
        });
        output.appendChild(group);
      });
    });
    output.setAttribute('aria-label', text ? `${text} in Morse code` : 'Type some letters to see them in Morse code');
    playBtn.disabled = !text;
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    output.querySelectorAll('.is-on').forEach((el) => el.classList.remove('is-on'));
    output.classList.remove('is-playing');
    playBtn.classList.remove('is-playing');
    playText.textContent = 'play in morse';
  }

  function play() {
    if (playBtn.classList.contains('is-playing')) {
      stop();
      return;
    }
    const ctx = L.audio.ensure();
    const audible = ctx && !L.audio.muted;
    if (!audible) L.toast('Sound is off, so the Morse plays silently. Switch sound on in the top bar to hear it.');
    playBtn.classList.add('is-playing');
    output.classList.add('is-playing');
    playText.textContent = 'stop';

    const start = ctx ? ctx.currentTime + 0.05 : 0;
    let offset = 0;
    symbols.forEach((s) => {
      if (s.gap) {
        offset += s.gap * UNIT;
        return;
      }
      const duration = (s.dash ? 3 : 1) * UNIT;
      if (audible) L.audio.trigger('beep', start + offset, duration);
      const at = (offset + 0.05) * 1000;
      timers.push(setTimeout(() => s.el.classList.add('is-on'), at));
      timers.push(setTimeout(() => s.el.classList.remove('is-on'), at + duration * 1000));
      offset += duration;
    });
    timers.push(setTimeout(stop, (offset + 0.1) * 1000));
  }

  input.addEventListener('input', render);
  playBtn.addEventListener('click', play);
  render();
})();
