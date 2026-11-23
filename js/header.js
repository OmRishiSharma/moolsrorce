/* MOOLSORCE — header: compress on scroll, hide on fast down-scroll, SVG hamburger morph,
   mobile menu, and the sliding active-section underline. No library needed. */
(function () {
  'use strict';
  var MS = window.MS;
  var hdr = document.querySelector('.site-header');
  if (!hdr) return;

  /* ---------- Compress / hide / show ----------
     Compress after 40px. Hide only on a FAST downward scroll (so slow reading keeps the header);
     any upward scroll brings it back. Never hides while the menu is open or focus is inside it. */
  var lastY = window.scrollY, lastT = performance.now(), ticking = false, menuOpen = false;

  function onScroll() {
    var y = window.scrollY, t = performance.now();
    var dy = y - lastY, dt = Math.max(t - lastT, 1);
    var speed = dy / dt * 1000;           // px per second
    hdr.classList.toggle('is-compact', y > 40);
    hdr.classList.toggle('is-scrolled', y > 8);

    if (!menuOpen && !MS.programmaticScroll) {
      if (dy > 0 && speed > 900 && y > 240 && !hdr.contains(document.activeElement)) hdr.classList.add('is-hidden');
      else if (dy < -4 || y < 120) hdr.classList.remove('is-hidden');
    }
    lastY = y; lastT = t; ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  hdr.addEventListener('focusin', function () { hdr.classList.remove('is-hidden'); });
  onScroll();

  /* ---------- Hamburger → X: a real path morph (interpolated coordinates, not an icon swap) ---------- */
  var btn = hdr.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  var paths = btn ? [].slice.call(btn.querySelectorAll('.menu-btn__svg path')) : [];
  //            [x1, y1, x2, y2]   closed (≡)            open (✕)
  var SHAPES = {
    closed: [[4, 7, 20, 7], [4, 12, 20, 12], [4, 17, 20, 17]],
    open:   [[6, 6, 18, 18], [12, 12, 12, 12], [6, 18, 18, 6]]
  };
  var morphT = 0, morphRAF = 0;
  function drawMorph(k) {
    paths.forEach(function (p, i) {
      var a = SHAPES.closed[i], b = SHAPES.open[i];
      var v = a.map(function (n, j) { return (n + (b[j] - n) * k).toFixed(2); });
      p.setAttribute('d', 'M' + v[0] + ' ' + v[1] + 'L' + v[2] + ' ' + v[3]);
      if (i === 1) p.style.opacity = String(1 - k);
    });
  }
  function morphTo(target) {
    cancelAnimationFrame(morphRAF);
    if (MS.reduce) { morphT = target; drawMorph(target); return; }
    var from = morphT, start = performance.now(), dur = 320;
    (function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);              // ease-out, same family as the rest of the page
      morphT = from + (target - from) * e;
      drawMorph(morphT);
      if (p < 1) morphRAF = requestAnimationFrame(step);
    })(start);
  }

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    menuOpen = open;
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    hdr.classList.toggle('menu-open', open);
    if (open) hdr.classList.remove('is-hidden');
    morphTo(open ? 1 : 0);
  }
  if (btn && nav) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); btn.focus(); }
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* Disabled Buyer Login placeholder: don't jump to top */
  var login = document.querySelector('.nav__login');
  if (login) login.addEventListener('click', function (e) { e.preventDefault(); });

  /* ---------- Active section: aria-current + one underline that slides between links ---------- */
  var list = document.querySelector('.nav__list');
  var links = MS.$$('.nav__list a[href^="#"]');
  var ind = null;
  if (list) {
    ind = document.createElement('span');
    ind.className = 'nav__ind is-jump';
    ind.setAttribute('aria-hidden', 'true');
    list.appendChild(ind);
  }
  var currentLink = null;
  function placeIndicator(link) {
    if (!ind) return;
    if (!link || !window.matchMedia('(min-width: 960px)').matches) { ind.classList.remove('is-on'); return; }
    var x = link.offsetLeft, w = link.offsetWidth;
    var firstPlacement = !ind.classList.contains('is-on');
    if (firstPlacement) ind.classList.add('is-jump');   // appear in place, don't travel from the left edge
    ind.style.setProperty('--ind-x', x + 'px');
    ind.style.setProperty('--ind-w', w);
    if (firstPlacement) { void ind.offsetWidth; ind.classList.remove('is-jump'); }
    ind.classList.add('is-on');
  }
  function setCurrent(link) {
    currentLink = link;
    links.forEach(function (l) { if (l === link) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    placeIndicator(link);
  }
  if ('IntersectionObserver' in window && links.length) {
    var byId = {};
    links.forEach(function (l) { byId[l.getAttribute('href').slice(1)] = l; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        setCurrent(byId[en.target.id] || null);   // bands with no nav link clear the highlight
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    MS.$$('main > section, .site-footer').forEach(function (s) { spy.observe(s); });
  }
  window.addEventListener('resize', function () { placeIndicator(currentLink); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeIndicator(currentLink); });
})();
