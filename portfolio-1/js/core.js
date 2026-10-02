/* Shared helpers. Everything hangs off window.L so the site runs straight from the
   file system (double-click index.html) without modules or a build step. */
(function () {
  'use strict';

  const L = (window.L = window.L || {});

  L.reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Storage can be blocked (private windows, sandboxed frames). Settings then just don't persist.
  L.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('leno:' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('leno:' + key, JSON.stringify(value));
      } catch (e) { /* ignore */ }
    },
  };

  // A tiny event bus so modules can react to the beat without knowing about each other.
  const listeners = {};
  L.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
  L.emit = (name, data) => { (listeners[name] || []).forEach((fn) => fn(data)); };

  L.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  L.lerp = (a, b, t) => a + (b - a) * t;
  L.pad = (n, width) => String(n).padStart(width, '0');

  // Seeded PRNG (mulberry32): same seed, same sequence.
  L.rng = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  L.cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  L.isDark = () => {
    const set = document.documentElement.getAttribute('data-theme');
    if (set) return set === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  L.el = (tag, className, attrs) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  let toastTimer = 0;
  L.toast = (message) => {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-on'), 2800);
  };

  // Must be called straight from a click handler so the clipboard permission applies.
  L.copy = (text) => {
    const fallback = () => {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      return ok;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, fallback);
    }
    return Promise.resolve(fallback());
  };

  // Calls back with true/false as an element enters or leaves the viewport.
  L.watchVisible = (node, callback, rootMargin) => {
    if (!('IntersectionObserver' in window)) { callback(true); return; }
    new IntersectionObserver(
      (entries) => entries.forEach((entry) => callback(entry.isIntersecting)),
      { rootMargin: rootMargin || '0px' }
    ).observe(node);
  };

  // Keeps a canvas's backing store matched to its CSS size and the device pixel ratio.
  L.fitCanvas = (canvas, onResize) => {
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        if (onResize) onResize(w, h, dpr);
      }
    };
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(canvas);
    else window.addEventListener('resize', fit);
    fit();
    return fit;
  };
})();
