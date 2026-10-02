/* Rotary knob, exposed to assistive tech as a slider.
   Three ways to turn it: drag (vertical or horizontal, hold Shift for fine control),
   click a point on the dial to jump there (single-pointer alternative to dragging),
   or the keyboard (arrows, Page Up/Down, Home/End). Double-click resets. */
(function () {
  'use strict';

  const L = window.L;
  const SWEEP = 270; // degrees of travel, from -135 to +135

  function ticksSvg() {
    let marks = '';
    for (let i = 0; i <= 10; i++) {
      const a = ((-135 + i * 27) * Math.PI) / 180;
      const long = i === 0 || i === 5 || i === 10;
      const r1 = long ? 40 : 42;
      const r2 = 47;
      const x1 = 50 + Math.sin(a) * r1, y1 = 50 - Math.cos(a) * r1;
      const x2 = 50 + Math.sin(a) * r2, y2 = 50 - Math.cos(a) * r2;
      marks += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="currentColor" stroke-width="${long ? 2.4 : 1.6}" stroke-linecap="round"/>`;
    }
    return `<svg class="knob__ticks" viewBox="0 0 100 100" aria-hidden="true">${marks}<path class="knob__arc" d=""/></svg>`;
  }

  // Arc from the start of travel to the current angle, drawn just inside the ticks.
  function arcPath(fraction) {
    if (fraction <= 0.001) return '';
    const r = 36;
    const start = (-135 * Math.PI) / 180;
    const end = ((-135 + fraction * SWEEP) * Math.PI) / 180;
    const x1 = 50 + Math.sin(start) * r, y1 = 50 - Math.cos(start) * r;
    const x2 = 50 + Math.sin(end) * r, y2 = 50 - Math.cos(end) * r;
    const large = fraction * SWEEP > 180 ? 1 : 0;
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  L.knob = function (node, options) {
    const opts = Object.assign({ min: 0, max: 100, step: 1, value: 50, label: 'knob', format: String, onInput() {} }, options);
    const range = opts.max - opts.min;
    const defaultValue = opts.value;
    const labelEl = opts.labelEl || null;
    const labelText = labelEl ? labelEl.textContent : '';
    let value = opts.value;
    let labelTimer = 0;

    node.classList.add('knob');
    node.setAttribute('role', 'slider');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', opts.label);
    node.setAttribute('aria-valuemin', opts.min);
    node.setAttribute('aria-valuemax', opts.max);
    node.innerHTML = ticksSvg() + '<span class="knob__cap"><span class="knob__pointer"></span></span>';

    const cap = node.querySelector('.knob__cap');
    const arc = node.querySelector('.knob__arc');

    function render() {
      const fraction = (value - opts.min) / range;
      cap.style.transform = `rotate(${-135 + fraction * SWEEP}deg)`;
      arc.setAttribute('d', arcPath(fraction));
      node.setAttribute('aria-valuenow', value);
      node.setAttribute('aria-valuetext', opts.format(value));
    }

    // While turning, the label under the knob shows the value, then returns to its name.
    function flashLabel() {
      if (!labelEl) return;
      labelEl.textContent = opts.format(value);
      labelEl.classList.add('is-value');
      clearTimeout(labelTimer);
      labelTimer = setTimeout(() => {
        labelEl.textContent = labelText;
        labelEl.classList.remove('is-value');
      }, 1100);
    }

    function set(next, emit) {
      const snapped = Math.round((next - opts.min) / opts.step) * opts.step + opts.min;
      const clamped = L.clamp(Number(snapped.toFixed(4)), opts.min, opts.max);
      if (clamped === value) return;
      value = clamped;
      render();
      if (emit !== false) {
        flashLabel();
        opts.onInput(value);
      }
    }

    let drag = null;

    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      node.focus({ preventScroll: true });
      node.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, start: value, moved: false };
      node.classList.add('is-turning');
    });

    node.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = drag.y - e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      const pixelsForFullTurn = e.shiftKey ? 800 : 200;
      set(drag.start + ((dx + dy) / pixelsForFullTurn) * range);
    });

    const endDrag = (e) => {
      if (!drag) return;
      if (!drag.moved && e.type === 'pointerup') {
        // A click without movement: jump to the angle that was clicked.
        const r = node.getBoundingClientRect();
        const angle = (Math.atan2(e.clientX - (r.left + r.width / 2), (r.top + r.height / 2) - e.clientY) * 180) / Math.PI;
        const clamped = L.clamp(angle, -135, 135);
        set(opts.min + ((clamped + 135) / SWEEP) * range);
      }
      drag = null;
      node.classList.remove('is-turning');
    };
    node.addEventListener('pointerup', endDrag);
    node.addEventListener('pointercancel', endDrag);

    node.addEventListener('dblclick', () => set(defaultValue));

    node.addEventListener('keydown', (e) => {
      const big = Math.max(opts.step, range / 10);
      const moves = {
        ArrowUp: opts.step, ArrowRight: opts.step,
        ArrowDown: -opts.step, ArrowLeft: -opts.step,
        PageUp: big, PageDown: -big,
      };
      if (e.key in moves) set(value + moves[e.key]);
      else if (e.key === 'Home') set(opts.min);
      else if (e.key === 'End') set(opts.max);
      else return;
      e.preventDefault();
    });

    render();

    return {
      node,
      get value() { return value; },
      set(next, emit) { set(next, emit); },
    };
  };
})();
