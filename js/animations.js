/* MOOLSORCE — animations.js
   Everything GSAP / ScrollTrigger: split headings, reveals, image masks, section wipes, the process line,
   counters, and the scroll choreography of the 3D scene. Plus fine-pointer micro-interactions
   (magnetic buttons, card tilt, kinetic headline). Nothing here runs for reduced motion.
   Each thing animates in once; scrubbed pieces (process line, scene, wipes, parallax) follow the scroll. */
(function () {
  'use strict';
  var MOOL = window.MOOL, $ = MOOL.$, $$ = MOOL.$$;
  if (MOOL.reduce) return;

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ================= Fine-pointer micro-interactions (no GSAP needed) ================= */
  if (MOOL.fine) {
    /* magnetic buttons */
    var mags = $$('[data-magnetic]'), mx = 0, my = 0, mRAF = 0;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (mRAF) return;
      mRAF = requestAnimationFrame(function () {
        mRAF = 0;
        mags.forEach(function (el) {
          var r = el.getBoundingClientRect(), dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
          if (Math.abs(dx) < r.width / 2 + 70 && Math.abs(dy) < r.height / 2 + 70) {
            el.style.setProperty('--mx', clamp(dx * 0.28, -14, 14).toFixed(1) + 'px'); el.style.setProperty('--my', clamp(dy * 0.34, -10, 10).toFixed(1) + 'px');
          } else if (el.style.getPropertyValue('--mx')) { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); }
        });
      });
    }, { passive: true });

    /* 3D tilt */
    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('is-tilting');
        el.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('is-tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });

    /* kinetic hero headline: letters lean away from the cursor once the intro has played */
    var hero = $('.hero'), chars = $$('.hero .k'), t0 = performance.now(), kRAF = 0, kx = 0, ky = 0, vis = true;
    if (hero && chars.length) {
      new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }).observe(hero);
      hero.addEventListener('pointermove', function (e) {
        kx = e.clientX; ky = e.clientY;
        if (kRAF) return;
        kRAF = requestAnimationFrame(function () {
          kRAF = 0;
          if (!vis || performance.now() - t0 < 2600) return;
          chars.forEach(function (c) {
            var r = c.getBoundingClientRect(), dx = r.left + r.width / 2 - kx, dy = r.top + r.height / 2 - ky, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 190) { var f = 1 - d / 190; c.style.transform = 'translate3d(0,' + ((dy > 0 ? 1 : -1) * f * 14).toFixed(1) + 'px,0) rotate(' + ((dx > 0 ? 1 : -1) * f * 6).toFixed(1) + 'deg)'; c._on = 1; }
            else if (c._on) { c.style.transform = ''; c._on = 0; }
          });
        });
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { chars.forEach(function (c) { c.style.transform = ''; c._on = 0; }); });
      chars.forEach(function (c) { c.style.transition = 'transform .3s cubic-bezier(.2,.7,.2,1)'; });
    }
  }

  /* ================= GSAP ================= */
  MOOL.ready(function () {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    var done = function (els) { [].concat(els).forEach(function (el) { el.classList.add('is-in'); gsap.set(el, { clearProps: 'opacity,transform,clipPath,willChange,visibility' }); }); };

    /* ---- Split headings into masked words (once), reveal when they arrive ---- */
    $$('[data-split]').forEach(function (h) {
      if (h.classList.contains('is-split')) return;
      var text = h.textContent.trim();
      h.setAttribute('aria-label', text);
      h.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="sw" aria-hidden="true"><span class="sw__in">' + w.replace(/&/g, '&amp;') + '</span></span>'; }).join(' ');
      h.classList.add('is-split');
    });

    var mm = gsap.matchMedia();
    mm.add({ desk: '(min-width: 960px)', mob: '(max-width: 959px)' }, function (ctx) {
      var desk = ctx.conditions.desk;

      $$('[data-split]').forEach(function (h) {
        if (h.classList.contains('is-in')) return;
        var words = $$('.sw__in', h);
        gsap.set(words, { yPercent: 115 });
        ST.create({ trigger: h, start: 'top 88%', once: true, onEnter: function () {
          gsap.to(words, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.06, onComplete: function () { gsap.set(words, { clearProps: 'transform' }); h.classList.add('is-in'); } });
        } });
      });

      /* ---- Fades: elements arriving together stagger ---- */
      var fades = $$('[data-fade]').filter(function (e) { return !e.classList.contains('is-in'); });
      if (fades.length) ST.batch(fades, { start: 'top 90%', once: true, interval: 0.1, batchMax: 6, onEnter: function (b) {
        gsap.fromTo(b, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, onComplete: function () { done(b); } });
      } });

      /* ---- Image masks: clip-path opens, image settles, then drifts with scroll ---- */
      $$('[data-mask]').forEach(function (fig) {
        var img = $('img', fig), pic = $('picture', fig);
        if (!fig.classList.contains('is-in')) {
          ST.create({ trigger: fig, start: 'top 85%', once: true, onEnter: function () {
            gsap.fromTo(fig, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out', onComplete: function () { done(fig); } });
          } });
        }
        if (img && pic) gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, { yPercent: 7, scale: 1.16, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      /* ---- Cinematic section transitions: paper sections rise into place ---- */
      $$('[data-wipe]').forEach(function (sec) {
        gsap.fromTo(sec, { clipPath: 'inset(5% 3% 0% 3% round 56px 56px 0px 0px)' }, {
          clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top 96%', end: 'top 35%', scrub: 0.4 },
          onComplete: function () { gsap.set(sec, { clearProps: 'clipPath' }); }
        });
      });

      /* ---- Hero: type drifts up and softens as you leave ---- */
      gsap.to('.hero__in', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

      /* ---- Approach + Why: perspective rise ---- */
      var ap = $$('.approach__list li').filter(function (e) { return !e.classList.contains('is-in'); });
      if (ap.length) ST.batch(ap, { start: 'top 90%', once: true, onEnter: function (b) {
        gsap.fromTo(b, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, onComplete: function () { done(b); } });
      } });
      $$('.why__i').forEach(function (li) {
        if (li.classList.contains('is-in')) return;
        ST.create({ trigger: li, start: 'top 88%', once: true, onEnter: function () {
          gsap.fromTo(li, { opacity: 0, y: 60, rotateX: 16, transformPerspective: 1200 }, { opacity: 1, y: 0, rotateX: 0, duration: 1.1, ease: 'expo.out', onComplete: function () { done(li); } });
        } });
      });

      /* ---- Counters: ease-out, once ---- */
      $$('[data-count]').forEach(function (el) {
        var final = parseInt(el.getAttribute('data-count'), 10);
        if (el.getAttribute('data-counted')) return;
        el.textContent = '0';
        ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: function () {
          var o = { v: 0 };
          gsap.to(o, { v: final, duration: 1.8, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); }, onComplete: function () { el.textContent = final; el.setAttribute('data-counted', '1'); } });
        } });
      });

      /* ---- Process: a line draws down the staircase; numerals arrive as it reaches them ---- */
      var steps = $('#steps');
      if (steps) {
        var NS = 'http://www.w3.org/2000/svg';
        var old = $('.steps__line', steps); if (old) old.remove();
        var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'steps__line'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
        var path = document.createElementNS(NS, 'path'); path.setAttribute('pathLength', '1'); path.setAttribute('stroke-dasharray', '1'); path.setAttribute('stroke-dashoffset', '1'); svg.appendChild(path);
        var items = $$('.step', steps), nodes = items.map(function () { var c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 4.5); svg.appendChild(c); return c; });
        steps.insertBefore(svg, steps.firstChild);
        var fractions = [];
        var layout = function () {
          var box = steps.getBoundingClientRect();
          var pts = items.map(function (s) { var r = s.getBoundingClientRect(); return { x: Math.round(r.left - box.left - 14), top: Math.round(r.top - box.top), bot: Math.round(r.bottom - box.top) }; });
          var d = 'M' + pts[0].x + ' ' + pts[0].top, acc = 0, x = pts[0].x, y = pts[0].top, cum = [];
          pts.forEach(function (p) { if (p.x !== x) { d += 'H' + p.x; acc += Math.abs(p.x - x); x = p.x; } cum.push(acc); d += 'V' + p.bot; acc += p.bot - y; y = p.bot; });
          path.setAttribute('d', d);
          nodes.forEach(function (c, i) { c.setAttribute('cx', pts[i].x); c.setAttribute('cy', pts[i].top); });
          fractions = cum.map(function (c) { return c / (acc || 1); });
        };
        layout();
        var numerals = $$('.step__n', steps), shown = numerals.map(function (n) { return n.classList.contains('is-in'); });
        gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: steps, start: 'top 66%', end: 'bottom 60%', scrub: 0.4, onUpdate: function (self) {
          fractions.forEach(function (f, i) {
            var reached = self.progress >= f - 0.005;
            nodes[i].classList.toggle('is-on', reached);
            if (reached && !shown[i]) { shown[i] = true; gsap.fromTo(numerals[i], { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', onComplete: function () { done(numerals[i]); } }); }
          });
        } } });
        ST.addEventListener('refresh', layout);
        ctx.add(function () {});
        return function () { ST.removeEventListener('refresh', layout); };
      }
    });

    /* ================= Scroll choreography of the 3D scene =================
       MOOL.gl is read every frame by three-scene.js. Everything below only tweens numbers. */
    var G = MOOL.gl;
    if (!G) return;
    var gmm = gsap.matchMedia();
    gmm.add({ desk: '(min-width: 960px)', mob: '(max-width: 959px)' }, function (ctx) {
      var desk = ctx.conditions.desk;
      var hero = desk ? { gx: 2.0, gy: 0.05, gs: 1.3 } : { gx: 0, gy: 1.15, gs: 0.82 };
      var about = desk ? { gx: 3.1, gy: -1.2, gs: 0.62 } : { gx: 0.9, gy: 1.7, gs: 0.5 };
      var proc = desk ? { gx: -2.9, gy: -0.9, gs: 1.35 } : { gx: 0, gy: 1.0, gs: 0.9 };
      var scope = desk ? { gx: 0.0, gy: 0.0, gs: 1.0 } : { gx: 0, gy: 0.6, gs: 0.7 };
      var h0 = desk ? 1 : 0.55;
      gsap.set(G, { gx: hero.gx, gy: hero.gy, gs: hero.gs, gop: h0, sp: 1 });

      var sc = function (trigger, start, end) { return { trigger: trigger, start: start, end: end, scrub: 0.8, immediateRender: false }; };
      gsap.fromTo(G, { gx: hero.gx, gy: hero.gy, gs: hero.gs, gop: h0, sp: 1 }, { gx: about.gx, gy: about.gy, gs: about.gs, gop: 0.5, sp: 0, ease: 'none', immediateRender: false, scrollTrigger: sc('#about', 'top 92%', 'top 8%') });
      gsap.fromTo(G, { gop: 0.5 }, { gop: 0, ease: 'none', immediateRender: false, scrollTrigger: sc('#services', 'top 100%', 'top 45%') });
      gsap.fromTo(G, { gx: proc.gx, gy: proc.gy, gs: proc.gs, gop: 0 }, { gop: 1, ease: 'none', immediateRender: false, scrollTrigger: sc('#process', 'top 100%', 'top 25%') });
      gsap.fromTo(G, { gx: proc.gx, gy: proc.gy, gs: proc.gs, gop: 1 }, { gx: scope.gx, gy: scope.gy, gs: scope.gs, gop: 0.7, ease: 'none', immediateRender: false, scrollTrigger: sc('#scope', 'top 90%', 'top 20%') });
      gsap.fromTo(G, { spin: 0 }, { spin: 7.5, ease: 'none', immediateRender: false, scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.8 } });
    });
  });
})();
