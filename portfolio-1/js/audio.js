/* Web Audio engine. Every sound on the page is synthesized here, no samples.
   Signal path: voices -> input -> lowpass (the tone knob) -> compressor -> analyser -> master -> speakers.
   The analyser sits before the master gain, so the scope still draws when sound is switched off. */
(function () {
  'use strict';

  const L = window.L;
  const MASTER_LEVEL = 0.85;

  let ctx = null;
  let input, filter, comp, analyser, master, noise;
  let muted = !L.store.get('sound', true);
  let tone = 0.78;

  const cutoffFor = (v) => 160 * Math.pow(2, v * 7); // 160 Hz to about 20 kHz

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    ctx = new AudioCtx();
    input = ctx.createGain();

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 4.5;
    filter.frequency.value = cutoffFor(tone);

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0;

    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_LEVEL;

    input.connect(filter);
    filter.connect(comp);
    comp.connect(analyser);
    analyser.connect(master);
    master.connect(ctx.destination);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    return ctx;
  }

  // Exponential attack/decay envelope on a gain node.
  function envelope(node, t, peak, decay, attack) {
    const a = attack || 0.002;
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
  }

  function noiseBurst(t, duration) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration);
    return src;
  }

  const voices = {
    kick(t) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(168, t);
      osc.frequency.exponentialRampToValueAtTime(44, t + 0.13);
      envelope(amp, t, 1, 0.42, 0.001);
      osc.connect(amp).connect(input);
      osc.start(t);
      osc.stop(t + 0.5);
    },

    snare(t) {
      const hiss = noiseBurst(t, 0.22);
      const hp = ctx.createBiquadFilter();
      const hissAmp = ctx.createGain();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      envelope(hissAmp, t, 0.55, 0.17);
      hiss.connect(hp).connect(hissAmp).connect(input);

      const body = ctx.createOscillator();
      const bodyAmp = ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(212, t);
      body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      envelope(bodyAmp, t, 0.5, 0.09);
      body.connect(bodyAmp).connect(input);
      body.start(t);
      body.stop(t + 0.16);
    },

    hat(t) {
      const hiss = noiseBurst(t, 0.08);
      const hp = ctx.createBiquadFilter();
      const amp = ctx.createGain();
      hp.type = 'highpass';
      hp.frequency.value = 7600;
      envelope(amp, t, 0.26, 0.045);
      hiss.connect(hp).connect(amp).connect(input);
    },

    // A short two-oscillator pluck. `semis` is semitones above A3.
    tone(t, semis) {
      const freq = 220 * Math.pow(2, semis / 12);
      const lp = ctx.createBiquadFilter();
      const amp = ctx.createGain();
      lp.type = 'lowpass';
      lp.Q.value = 3;
      lp.frequency.setValueAtTime(freq * 9, t);
      lp.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.2);
      envelope(amp, t, 0.2, 0.24, 0.004);
      ['square', 'sawtooth'].forEach((type, i) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.detune.value = i ? 7 : -3;
        osc.connect(lp);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      lp.connect(amp).connect(input);
    },

    // A plain sine tone for Morse code. `duration` is in seconds; short ramps avoid clicks.
    beep(t, duration) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.28, t + 0.005);
      amp.gain.setValueAtTime(0.28, t + duration - 0.005);
      amp.gain.linearRampToValueAtTime(0, t + duration);
      osc.connect(amp).connect(input);
      osc.start(t);
      osc.stop(t + duration + 0.01);
    },

    // The patch cable seating into a jack: a click and a low thump.
    plug(t) {
      voices.hat(t);
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.1);
      envelope(amp, t, 0.5, 0.18, 0.001);
      osc.connect(amp).connect(input);
      osc.start(t);
      osc.stop(t + 0.25);
    },
  };

  L.audio = {
    ensure,
    get ctx() { return ctx; },
    get analyser() { return analyser; },
    get muted() { return muted; },
    get now() { return ctx ? ctx.currentTime : 0; },

    // Schedules a voice at an audio-clock time. Does nothing until ensure() has run.
    trigger(voice, time, arg) {
      if (!ctx || !voices[voice]) return;
      voices[voice](time === undefined ? ctx.currentTime : time, arg);
    },

    // One-off sound in response to a click. Starts the engine if needed.
    blip(voice, arg) {
      if (muted) return;
      if (!ensure()) return;
      voices[voice](ctx.currentTime + 0.005, arg);
    },

    setMuted(value) {
      muted = value;
      L.store.set('sound', !value);
      if (master) master.gain.setTargetAtTime(value ? 0 : MASTER_LEVEL, ctx.currentTime, 0.02);
    },

    setTone(value) {
      tone = value;
      if (filter) filter.frequency.setTargetAtTime(cutoffFor(value), ctx.currentTime, 0.03);
    },
  };
})();
