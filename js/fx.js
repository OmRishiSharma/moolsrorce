/* MOOLSORCE — micro-interactions: magnetic buttons, 3D card tilt, mouse-reactive kinetic headline,
   and scroll-velocity skew + marquee speed. Fine pointers only; none of this runs for reduced motion. */
(function () {
  'use strict';
  var MS = window.MS;
  if (MS.reduce) return;

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- Magnetic buttons ---------- */
  if (MS.finePointer) {
    var mags = MS.$$('[data-magnetic], .cta__btns .btn, .pm__quote');
    var magRAF = 0, mx = 0, my = 0;
    var moveMags = function () {
      magRAF = 0;
      mags.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = mx - cx, dy = my - cy;
        var reach = Math.max(r.width, r.height) / 2 + 70;
        var inside = Math.abs(dx) < r.width / 2 + 70 && Math.abs(dy) < r.height / 2 + 70;
        if (inside) {
          el.style.setProperty('--mx', clamp(dx * 0.28, -14, 14).toFixed(1) + 'px');
          el.style.setProperty('--my', clamp(dy * 0.34, -10, 10).toFixed(1) + 'px');
        } else if (el.style.getPropertyValue('--mx')) {
          el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px');
        }
      });
    };
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!magRAF) magRAF = requestAnimationFrame(moveMags);
    }, { passive: true });
  }

  /* ---------- 3D tilt (+ moving glare) ---------- */
  if (MS.finePointer) {
    MS.$$('[data-tilt]').forEach(function (el) {
      var strength = el.classList.contains('sc') ? 9 : 6;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('is-tilting');
        el.style.setProperty('--ry', (px * strength * 2).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-py * strength * 2).toFixed(2) + 'deg');
        el.style.setProperty('--gx', ((px + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', ((py + 0.5) * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Kinetic headline: letters lean away from the cursor ---------- */
  var hero = MS.$('.hero--cine');
  var chars = hero ? MS.$$('.hero .k', hero) : [];
  if (hero && chars.length && MS.finePointer) {
    var kRAF = 0, px = 0, py = 0, t0 = performance.now(), heroVisible = true;
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; }).observe(hero);
    var wave = function () {
      kRAF = 0;
      if (!heroVisible || performance.now() - t0 < 2400) return;       // wait for the intro to finish
      chars.forEach(function (c) {
        var r = c.getBoundingClientRect();
        var dx = (r.left + r.width / 2) - px, dy = (r.top + r.height / 2) - py;
        var d = Math.sqrt(dx * dx + dy * dy), reach = 170;
        if (d < reach) {
          var f = 1 - d / reach;
          c.style.setProperty('--ky', ((dy > 0 ? 1 : -1) * f * 12).toFixed(1) + 'px');
          c.style.setProperty('--kr', ((dx > 0 ? 1 : -1) * f * 7).toFixed(1) + 'deg');
          c._on = true;
        } else if (c._on) {
          c.style.setProperty('--ky', '0px'); c.style.setProperty('--kr', '0deg'); c._on = false;
        }
      });
    };
    hero.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; if (!kRAF) kRAF = requestAnimationFrame(wave); }, { passive: true });
    hero.addEventListener('pointerleave', function () { chars.forEach(function (c) { c.style.setProperty('--ky', '0px'); c.style.setProperty('--kr', '0deg'); c._on = false; }); });
  }

  /* ---------- Scroll velocity: headline + marquee skew, marquee speed ---------- */
  var skewEls = [MS.$('.hero--cine h1'), MS.$('.marquee')].filter(Boolean);
  var track = MS.$('.marquee__track');
  var lastY = window.scrollY, lastT = performance.now(), skew = 0, dir = 1, rate = 1, loopOn = false;
  function loop(now) {
    var y = window.scrollY, dt = Math.max(now - lastT, 1);
    var v = (y - lastY) / dt * 1000;                                  // px/s
    lastY = y; lastT = now;
    var target = clamp(v * 0.0035, -5, 5);
    skew += (target - skew) * 0.14;
    skewEls.forEach(function (el) { el.style.setProperty('--skew', skew.toFixed(2) + 'deg'); });
    if (track) {
      if (Math.abs(v) > 40) dir = v > 0 ? 1 : -1;
      var want = dir * (1 + clamp(Math.abs(v) / 500, 0, 5));
      if (Math.abs(v) <= 40) want = dir;
      rate += (want - rate) * 0.1;
      var anim = track.getAnimations && track.getAnimations()[0];
      if (anim) anim.playbackRate = rate;
    }
    if (Math.abs(skew) > 0.02 || Math.abs(v) > 40 || Math.abs(rate - dir) > 0.02) requestAnimationFrame(loop);
    else { loopOn = false; skewEls.forEach(function (el) { el.style.setProperty('--skew', '0deg'); }); }
  }
  window.addEventListener('scroll', function () {
    if (!loopOn) { loopOn = true; lastY = window.scrollY; lastT = performance.now(); requestAnimationFrame(loop); }
  }, { passive: true });
})();
