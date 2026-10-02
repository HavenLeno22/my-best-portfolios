/* Oscilloscope drawn on the LCD. Reads the analyser while the beat plays; otherwise draws a
   slow idle trace (flat under reduced motion). Only animates while the LCD is on screen. */
(function () {
  'use strict';

  const L = window.L;

  L.scope = function (canvas) {
    const g = canvas.getContext('2d');
    let ink = L.cssVar('--lcd-ink');
    let visible = true;
    let running = false;
    let playing = false;
    let buffer = null;
    let ghost = null;
    let idlePhase = 0;
    let dpr = 1;

    L.fitCanvas(canvas, (w, h, ratio) => { dpr = ratio; if (!running) frame(); });
    L.on('theme', () => { ink = L.cssVar('--lcd-ink'); if (!running) frame(); });
    L.on('transport', (state) => { playing = state.playing; wake(); });
    L.watchVisible(canvas, (isVisible) => { visible = isVisible; wake(); });

    function wake() {
      if (running || !visible) return;
      running = true;
      requestAnimationFrame(loop);
    }

    function loop() {
      frame();
      const idleAnimates = !L.reducedMotion();
      if (visible && (playing || idleAnimates)) requestAnimationFrame(loop);
      else running = false;
    }

    // Returns the samples to draw, starting at a rising zero crossing so the trace holds still.
    function samples() {
      const analyser = L.audio.analyser;
      if (playing && analyser) {
        if (!buffer || buffer.length !== analyser.fftSize) buffer = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(buffer);
        let start = 0;
        for (let i = 1; i < buffer.length / 2; i++) {
          if (buffer[i - 1] < 0 && buffer[i] >= 0) { start = i; break; }
        }
        return buffer.subarray(start, start + 1024);
      }
      const idle = new Float32Array(256);
      if (!L.reducedMotion()) {
        idlePhase += 0.018;
        for (let i = 0; i < idle.length; i++) {
          const x = i / idle.length;
          idle[i] = Math.sin(x * Math.PI * 4 + idlePhase) * 0.045 + Math.sin(x * Math.PI * 11 - idlePhase * 1.7) * 0.012;
        }
      }
      return idle;
    }

    function trace(data, alpha, width) {
      const w = canvas.width;
      const h = canvas.height;
      const mid = h * 0.56;
      const amp = h * 0.36;
      g.globalAlpha = alpha;
      g.lineWidth = width * dpr;
      g.lineJoin = 'round';
      g.strokeStyle = ink;
      g.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * w;
        const y = mid - L.clamp(data[i], -1.2, 1.2) * amp;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }

    function frame() {
      g.clearRect(0, 0, canvas.width, canvas.height);
      const data = samples();
      // A faint copy of the previous frame, like the slow pixels of a real LCD.
      if (ghost) trace(ghost, 0.18, 2);
      trace(data, 0.9, 2);
      ghost = Float32Array.from(data);
      g.globalAlpha = 1;
    }

    frame();
    wake();
  };
})();
