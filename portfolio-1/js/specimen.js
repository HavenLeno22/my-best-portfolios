/* Specimen: drives Archivo's weight and width axes, plus size, on editable sample text. */
(function () {
  'use strict';

  const L = window.L;
  const text = document.getElementById('specimen-text');
  const readout = document.getElementById('specimen-readout');
  const italicBtn = document.getElementById('specimen-italic');
  const sweepBtn = document.getElementById('specimen-sweep');

  const axes = { wght: 700, wdth: 100, sz: 17 };

  // Plain-text editing where supported, so pasted styles never come along.
  try { text.contentEditable = 'plaintext-only'; } catch (e) { text.contentEditable = 'true'; }
  text.addEventListener('paste', (e) => {
    if (text.contentEditable === 'plaintext-only') return;
    e.preventDefault();
    const plain = (e.clipboardData || window.clipboardData).getData('text');
    document.execCommand('insertText', false, plain);
  });
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
  });
  text.addEventListener('blur', () => {
    if (!text.textContent.trim()) text.textContent = 'Handgloves';
  });

  function apply() {
    text.style.setProperty('--wght', axes.wght);
    text.style.setProperty('--wdth', axes.wdth);
    text.style.setProperty('--sz', axes.sz);
    readout.textContent = `wght ${axes.wght} wdth ${axes.wdth}`;
  }

  const knobs = {
    wght: L.knob(document.getElementById('knob-wght'), {
      min: 100, max: 900, step: 10, value: axes.wght, label: 'Font weight',
      labelEl: document.getElementById('knob-wght-label'),
      format: (v) => 'weight ' + v,
      onInput: (v) => { axes.wght = v; apply(); },
    }),
    wdth: L.knob(document.getElementById('knob-wdth'), {
      min: 62, max: 125, step: 1, value: axes.wdth, label: 'Font width',
      labelEl: document.getElementById('knob-wdth-label'),
      format: (v) => 'width ' + v,
      onInput: (v) => { axes.wdth = v; apply(); },
    }),
    sz: L.knob(document.getElementById('knob-size'), {
      min: 8, max: 26, step: 1, value: axes.sz, label: 'Text size',
      labelEl: document.getElementById('knob-size-label'),
      format: (v) => 'size ' + v,
      onInput: (v) => { axes.sz = v; apply(); },
    }),
  };

  italicBtn.addEventListener('click', () => {
    const on = italicBtn.getAttribute('aria-pressed') !== 'true';
    italicBtn.setAttribute('aria-pressed', String(on));
    text.classList.toggle('is-italic', on);
  });

  // Sweep traces a slow loop through weight and width, turning the knobs as it goes.
  let sweeping = 0;
  sweepBtn.addEventListener('click', () => {
    if (sweeping) {
      cancelAnimationFrame(sweeping);
      sweeping = 0;
      sweepBtn.textContent = 'sweep';
      return;
    }
    const start = performance.now();
    const duration = 4200;
    const from = { wght: axes.wght, wdth: axes.wdth };
    sweepBtn.textContent = 'stop sweep';
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const phase = t * Math.PI * 2;
      axes.wght = Math.round((500 + Math.sin(phase * 2) * 400) / 10) * 10;
      axes.wdth = Math.round(93.5 + Math.sin(phase) * 31.5);
      if (t === 1) {
        axes.wght = from.wght;
        axes.wdth = from.wdth;
      }
      knobs.wght.set(axes.wght, false);
      knobs.wdth.set(axes.wdth, false);
      apply();
      if (t < 1) sweeping = requestAnimationFrame(tick);
      else {
        sweeping = 0;
        sweepBtn.textContent = 'sweep';
      }
    };
    sweeping = requestAnimationFrame(tick);
  });

  apply();
})();
