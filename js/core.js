/* MOOLSORCE — core: motion config, environment checks, library loading, shared helpers.
   Every other file in /js attaches to window.MS and loads with `defer`, in order.
   Plain scripts (not ES modules) so the page also works when opened straight from disk. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var MS = (window.MS = window.MS || {});

  /* ---------- Motion config (mirrors the CSS custom properties in motion.css) ---------- */
  MS.cfg = {
    /* GSAP has no cubic-bezier without a paid plugin; these are the nearest named curves.
       standard ≈ cubic-bezier(.2,.7,.2,1) · emphasis ≈ cubic-bezier(.16,1,.3,1) · exit ≈ cubic-bezier(.5,0,.75,0) */
    ease: { standard: 'power3.out', emphasis: 'expo.out', exit: 'power2.in' },
    dur: { fast: 0.18, base: 0.4, slow: 0.9, signature: 1.4 },
    stagger: 0.07,
    dist: 24,
    /* Pinned versions, loaded from cdnjs with Subresource Integrity */
    lib: {
      gsap: { src: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', sri: 'sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt' },
      lenis: { src: 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js', sri: 'sha384-B2WBjDzEjJpYvhmi2UyEn7rektqkf5suS6sNoyyrf0EBAwBHdkiXxIlU0V5Ru2ed' },
      st: { src: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js', sri: 'sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d' },
      three: { src: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js', sri: 'sha384-RRHfJ6w1mTlKUBMYT/hvnRiOzEB/vyRV3DrQOseb6oYfvaZSfdd0byS4bHps0k2R' }
    }
  };

  /* ---------- Environment ---------- */
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  MS.reduce = mqReduce.matches;
  if (MS.reduce) doc.classList.add('reduce-motion');
  mqReduce.addEventListener && mqReduce.addEventListener('change', function (e) {
    MS.reduce = e.matches;
    doc.classList.toggle('reduce-motion', e.matches);
  });

  MS.coarse = window.matchMedia('(pointer: coarse)').matches;     // touch: keep native momentum scrolling
  MS.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* One shared, lazy Three.js load (hero scene and globe both use it) */
  MS.loadThree = function () {
    if (!MS._three) MS._three = window.THREE ? Promise.resolve() : MS.loadScript(MS.cfg.lib.three);
    return MS._three;
  };

  /* Scroll to a y position; Lenis-aware. */
  MS.scrollTo = function (y, immediate) {
    if (MS.lenis) MS.lenis.scrollTo(y, { immediate: !!immediate, duration: 1.2 });
    else window.scrollTo({ top: y, behavior: immediate ? 'instant' : 'smooth' });
  };

  MS.supportsVT = typeof document.startViewTransition === 'function';

  MS.lowPower = function () {
    var n = navigator;
    if (n.connection && n.connection.saveData) return true;
    if (n.hardwareConcurrency && n.hardwareConcurrency <= 2) return true;
    if (n.deviceMemory && n.deviceMemory <= 2) return true;
    return false;
  };

  /* ---------- Tiny helpers ---------- */
  MS.$ = function (sel, root) { return (root || document).querySelector(sel); };
  MS.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  MS.loadScript = function (lib) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = lib.src;
      s.integrity = lib.sri;
      s.crossOrigin = 'anonymous';
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + lib.src)); };
      document.head.appendChild(s);
    });
  };

  /* ---------- GSAP: loaded after first paint, never blocks it ---------- */
  var gsapQueue = [];
  MS.gsapReady = false;

  /* Run fn once GSAP + ScrollTrigger exist. Skipped entirely for reduced motion. */
  MS.whenGsap = function (fn) {
    if (MS.reduce) return;
    if (MS.gsapReady) fn(); else gsapQueue.push(fn);
  };

  function failSafe() {
    /* If the library never arrives, reveal everything so no content stays hidden. */
    if (!MS.gsapReady) doc.classList.add('m-fail');
  }

  function bootGsap() {
    if (MS.reduce) return;
    var timer = setTimeout(failSafe, 6000);
    MS.loadScript(MS.cfg.lib.gsap)
      .then(function () { return MS.loadScript(MS.cfg.lib.st); })
      .then(function () { return MS.loadScript(MS.cfg.lib.lenis).catch(function () { /* smooth scroll is optional */ }); })
      .then(function () {
        window.gsap.registerPlugin(window.ScrollTrigger);
        /* Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger and Lenis share one clock */
        if (window.Lenis && !MS.coarse) {
          MS.lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
          doc.classList.add('lenis', 'lenis-smooth');
          MS.lenis.on('scroll', window.ScrollTrigger.update);
          window.gsap.ticker.add(function (t) { MS.lenis.raf(t * 1000); });
          window.gsap.ticker.lagSmoothing(0);
        }
        window.gsap.config({ nullTargetWarn: false });
        MS.gsapReady = true;
        clearTimeout(timer);
        doc.classList.add('m-ready');
        gsapQueue.splice(0).forEach(function (fn) {
          try { fn(); } catch (err) { console.error(err); doc.classList.add('m-fail'); }
        });
        /* fonts and images change layout: re-measure once they settle */
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
        window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
      })
      .catch(function (err) { console.warn(err); failSafe(); });
  }

  function afterFirstPaint() {
    var go = function () { 'requestIdleCallback' in window ? requestIdleCallback(bootGsap, { timeout: 1500 }) : setTimeout(bootGsap, 200); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }
  afterFirstPaint();

  /* ---------- Section modules with clean teardown on layout breakpoints ----------
     MS.mod(name, init) runs init inside a gsap.context() so every tween and ScrollTrigger it
     creates can be killed in one call. On a breakpoint change the context is reverted and init
     runs again, so there are no leaked triggers or stale measurements.
     init may return a cleanup function for non-GSAP things (renderers, observers). */
  var mods = [];
  var BREAKPOINTS = ['(min-width: 640px)', '(min-width: 960px)', '(min-width: 1280px)'];

  MS.mod = function (name, init) {
    var m = { name: name, init: init, ctx: null, cleanup: null };
    mods.push(m);
    MS.whenGsap(function () { start(m); });
  };
  function start(m) {
    m.ctx = window.gsap.context(function () { m.cleanup = m.init(); });
  }
  function stop(m) {
    if (typeof m.cleanup === 'function') { try { m.cleanup(); } catch (e) { /* noop */ } }
    m.cleanup = null;
    if (m.ctx) { m.ctx.revert(); m.ctx = null; }
  }
  var rebuildTimer;
  function rebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () {
      if (!MS.gsapReady) return;
      mods.forEach(stop);
      mods.forEach(start);
      window.ScrollTrigger.refresh();
    }, 150);
  }
  BREAKPOINTS.forEach(function (q) {
    var mq = window.matchMedia(q);
    mq.addEventListener ? mq.addEventListener('change', rebuild) : mq.addListener(rebuild);
  });

  /* ---------- Reveal helper ----------
     Every element animates in ONCE: it gets .is-in, which both clears the hidden state and
     marks it done, so a rebuild or scroll-back never replays it. */
  MS.done = function (els) {
    [].concat(els).forEach(function (el) {
      el.classList.add('is-in');
      window.gsap.set(el, { clearProps: 'opacity,transform,clipPath,willChange,visibility' });
    });
  };

  /* Reveal every [data-r="<kind>"] element as it nears the viewport.
     Elements that enter together are staggered; each kind has its own movement. */
  MS.revealKind = function (kind, from, to, opts) {
    var gsap = window.gsap;
    opts = opts || {};
    var els = MS.$$('[data-r="' + kind + '"]').filter(function (el) { return !el.classList.contains('is-in'); });
    if (!els.length) return;
    window.ScrollTrigger.batch(els, {
      start: opts.start || 'top 88%',
      once: true,
      interval: 0.1,
      batchMax: opts.batchMax || 8,
      onEnter: function (batch) {
        gsap.fromTo(batch, from, Object.assign({
          duration: opts.duration || MS.cfg.dur.slow,
          ease: opts.ease || MS.cfg.ease.standard,
          stagger: opts.stagger != null ? opts.stagger : MS.cfg.stagger,
          overwrite: 'auto',
          onStart: function () { gsap.set(batch, { willChange: 'transform,opacity' }); },
          onComplete: function () { MS.done(batch); }
        }, to));
      }
    });
  };
})();
