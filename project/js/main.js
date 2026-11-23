/* MOOLSORCE — main.js
   Core: config, environment, library loading (GSAP / ScrollTrigger / Lenis after first paint, Three.js on demand),
   header, anchor navigation, accordions (FAQ + product families), quote links and the contact form.
   Plain scripts (not ES modules) so the site also opens straight from disk. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var MOOL = (window.MOOL = window.MOOL || {});

  /* ---------- Config ---------- */
  MOOL.config = {
    /* Contact form delivery. Paste a form-service endpoint here (Formspree, Getform, your own API) and the
       form will POST JSON to it. While it is empty, the form opens the visitor's email app with the
       inquiry prefilled and addressed to `mailto`, which is honest and works with no backend. */
    formEndpoint: '',
    mailto: 'export@moolsorce.example',
    lib: {
      gsap: { src: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', sri: 'sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt' },
      st: { src: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js', sri: 'sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d' },
      lenis: { src: 'https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js', sri: 'sha384-B2WBjDzEjJpYvhmi2UyEn7rektqkf5suS6sNoyyrf0EBAwBHdkiXxIlU0V5Ru2ed' },
      three: { src: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.149.0/three.min.js', sri: 'sha384-RRHfJ6w1mTlKUBMYT/hvnRiOzEB/vyRV3DrQOseb6oYfvaZSfdd0byS4bHps0k2R' }
    }
  };

  /* ---------- Environment ---------- */
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  MOOL.reduce = mqReduce.matches;
  if (MOOL.reduce) doc.classList.add('reduce-motion');
  MOOL.coarse = window.matchMedia('(pointer: coarse)').matches;
  MOOL.fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  MOOL.lowPower = function () {
    var n = navigator;
    return !!((n.connection && n.connection.saveData) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || (n.deviceMemory && n.deviceMemory <= 2));
  };
  MOOL.$ = function (s, r) { return (r || document).querySelector(s); };
  MOOL.$$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Script loading ---------- */
  MOOL.loadScript = function (lib) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = lib.src; s.integrity = lib.sri; s.crossOrigin = 'anonymous'; s.async = true;
      s.onload = resolve; s.onerror = function () { reject(new Error('Failed to load ' + lib.src)); };
      document.head.appendChild(s);
    });
  };
  MOOL.loadThree = function () {
    if (!MOOL._three) MOOL._three = window.THREE ? Promise.resolve() : MOOL.loadScript(MOOL.config.lib.three);
    return MOOL._three;
  };

  var queue = [];
  MOOL.gsapReady = false;
  MOOL.ready = function (fn) { if (MOOL.reduce) return; if (MOOL.gsapReady) fn(); else queue.push(fn); };

  function boot() {
    if (MOOL.reduce) return;
    var timer = setTimeout(function () { if (!MOOL.gsapReady) doc.classList.add('m-fail'); }, 6000);
    MOOL.loadScript(MOOL.config.lib.gsap)
      .then(function () { return MOOL.loadScript(MOOL.config.lib.st); })
      .then(function () { return MOOL.loadScript(MOOL.config.lib.lenis).catch(function () { /* optional */ }); })
      .then(function () {
        var gsap = window.gsap, ST = window.ScrollTrigger;
        gsap.registerPlugin(ST);
        gsap.config({ nullTargetWarn: false });
        if (window.Lenis && !MOOL.coarse) {
          MOOL.lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
          doc.classList.add('lenis', 'lenis-smooth');
          MOOL.lenis.on('scroll', ST.update);
          gsap.ticker.add(function (t) { MOOL.lenis.raf(t * 1000); });
          gsap.ticker.lagSmoothing(0);
        }
        MOOL.gsapReady = true; clearTimeout(timer); doc.classList.add('m-ready');
        queue.splice(0).forEach(function (fn) { try { fn(); } catch (e) { console.error(e); doc.classList.add('m-fail'); } });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
        window.addEventListener('load', function () { ST.refresh(); });
      })
      .catch(function (e) { console.warn(e); doc.classList.add('m-fail'); });
  }
  function afterFirstPaint() {
    var go = function () { 'requestIdleCallback' in window ? requestIdleCallback(boot, { timeout: 1200 }) : setTimeout(boot, 200); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }
  afterFirstPaint();

  MOOL.scrollTo = function (y, immediate) {
    if (MOOL.lenis) MOOL.lenis.scrollTo(y, { immediate: !!immediate, duration: 1.4, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else window.scrollTo({ top: y, behavior: immediate || MOOL.reduce ? 'auto' : 'smooth' });
  };

  /* ---------- Year ---------- */
  var yr = document.getElementById('year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Header: compact on scroll, hide on fast down-scroll, progress bar, scroll-spy ---------- */
  var hdr = document.getElementById('header');
  var bar = MOOL.$('.progress i');
  var lastY = window.scrollY, lastT = performance.now(), ticking = false, menuOpen = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, t = performance.now(), dy = y - lastY, speed = dy / Math.max(t - lastT, 1) * 1000;
    hdr.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen && !MOOL.jumping) {
      if (dy > 0 && speed > 1000 && y > 300 && !hdr.contains(document.activeElement)) hdr.classList.add('is-hidden');
      else if (dy < -4 || y < 120) hdr.classList.remove('is-hidden');
    }
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    lastY = y; lastT = t;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  hdr.addEventListener('focusin', function () { hdr.classList.remove('is-hidden'); });
  onScroll();

  MOOL.$$('.nav__list li').forEach(function (li, i) { li.style.setProperty('--n', i); });
  var btn = MOOL.$('.menu-btn'), nav = document.getElementById('nav');
  function setMenu(open) {
    menuOpen = open;
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    doc.classList.toggle('menu-open', open);
    if (open) { hdr.classList.remove('is-hidden'); if (MOOL.lenis) MOOL.lenis.stop(); } else if (MOOL.lenis) MOOL.lenis.start();
  }
  btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); btn.focus(); } });
  window.matchMedia('(min-width: 960px)').addEventListener('change', function (e) { if (e.matches && menuOpen) setMenu(false); });

  var links = MOOL.$$('.nav__list a[href^="#"]');
  var byId = {}; links.forEach(function (l) { byId[l.getAttribute('href').slice(1)] = l; });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.removeAttribute('aria-current'); });
        var l = byId[e.target.id]; if (l) l.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    MOOL.$$('main > section').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Anchor navigation (Lenis-aware) ---------- */
  function headingOf(t) { return t.matches('h1,h2,h3,h4') ? t : (t.querySelector('h1,h2,h3') || t); }
  MOOL.goTo = function (hash, focusSel) {
    var target = hash === '#top' ? document.body : MOOL.$(hash);
    if (!target) return;
    var y = hash === '#top' ? 0 : Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0)));
    MOOL.jumping = true;
    MOOL.scrollTo(y, false);
    if (history.pushState && location.hash !== hash) history.pushState(null, '', hash);
    setTimeout(function () {
      var el = focusSel ? MOOL.$(focusSel) : (hash === '#top' ? MOOL.$('#hero-h') : headingOf(target));
      if (el) { if (!el.hasAttribute('tabindex') && !/^(input|select|textarea|button|a)$/i.test(el.tagName)) el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
      MOOL.jumping = false;
    }, MOOL.reduce ? 60 : 1500);
  };
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var hash = a.getAttribute('href'); if (hash.length < 2 || (!MOOL.$(hash) && hash !== '#top')) return;
    e.preventDefault();
    if (/^#fam-/.test(hash)) MOOL.openFamily(MOOL.$(hash));
    MOOL.goTo(hash);
  });

  /* ---------- Accordions ---------- */
  function accordion(items, btnSel, panelSel, onOpen) {
    items.forEach(function (item) {
      var b = item.querySelector(btnSel), p = item.querySelector(panelSel);
      if (!b || !p) return;
      p.removeAttribute('hidden');
      b.addEventListener('click', function () {
        var willOpen = b.getAttribute('aria-expanded') !== 'true';
        items.forEach(function (o) {
          var ob = o.querySelector(btnSel);
          o.classList.toggle('is-open', o === item && willOpen);
          ob.setAttribute('aria-expanded', String(o === item && willOpen));
        });
        if (willOpen && onOpen) onOpen(item);
        if (window.ScrollTrigger) setTimeout(function () { window.ScrollTrigger.refresh(); }, 480);
      });
    });
  }
  var accItems = MOOL.$$('.acc__item');
  accItems.forEach(function (it) { it.classList.remove('is-open'); });
  accordion(accItems, 'button[aria-expanded]', '.acc__panel');

  var famItems = MOOL.$$('.fam__item');
  accordion(famItems, '.fam__btn', '.fam__panel', function (item) { MOOL.setFamily(+item.getAttribute('data-family')); });
  MOOL.openFamily = function (item) { if (!item) return; var b = item.querySelector('.fam__btn'); if (b.getAttribute('aria-expanded') !== 'true') b.click(); };
  /* preview the 3D shapes on hover / focus without changing what is open */
  famItems.forEach(function (it) {
    var i = +it.getAttribute('data-family');
    it.addEventListener('pointerenter', function () { if (MOOL.fine) MOOL.setFamily(i); });
    it.querySelector('.fam__btn').addEventListener('focus', function () { MOOL.setFamily(i); });
  });
  var famMeta = famItems.map(function (it) { return { name: it.getAttribute('data-name'), chap: it.getAttribute('data-chap') }; });
  MOOL.family = 0;
  MOOL.setFamily = function (i) {
    if (i === MOOL.family && MOOL._famSet) return;
    MOOL._famSet = true; MOOL.family = i;
    var st = document.getElementById('stage'); if (!st) return;
    MOOL.$('.stage__no', st).textContent = '0' + (i + 1);
    MOOL.$('.stage__name', st).textContent = famMeta[i].name;
    MOOL.$('.stage__hs', st).textContent = 'HS chapter ' + famMeta[i].chap;
    MOOL.$('.stage__fb span', st).textContent = famMeta[i].chap.replace(/ · .*/, '');
    if (MOOL.onFamily) MOOL.onFamily(i);
  };

  /* ---------- "Request a quote for this product" → prefill the form and go ---------- */
  document.addEventListener('click', function (e) {
    var q = e.target.closest('[data-quote]'); if (!q) return;
    var sel = document.getElementById('f-product');
    if (sel) for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === q.getAttribute('data-quote')) { sel.selectedIndex = i; break; }
    e.preventDefault();
    MOOL.goTo('#contact', '#f-name');
  });

  /* ---------- Contact form ---------- */
  var form = document.getElementById('inquiry');
  if (!form) return;
  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Enter your full name.'; },
    company: function (v) { return v.trim() ? '' : 'Enter your company name.'; },
    country: function (v) { return v.trim() ? '' : 'Enter your country.'; },
    email: function (v) { if (!v.trim()) return 'Enter your email address.'; return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email, like name@company.com.'; },
    phone: function (v) { if (!v.trim()) return ''; return /^[+()\d][\d\s().-]{6,}$/.test(v.trim()) ? '' : 'Use digits with country code, like +971 50 000 0000.'; },
    product: function (v) { return v ? '' : 'Choose a product.'; }
  };
  var timers = {};
  function check(f) {
    var rule = rules[f.name]; if (!rule) return true;
    var msg = rule(f.value), err = document.getElementById('e-' + f.name), wrap = err.closest('.err-wrap');
    clearTimeout(timers[f.name]);
    if (msg) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', err.id); err.textContent = msg; wrap.classList.add('is-open'); }
    else { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); wrap.classList.remove('is-open'); timers[f.name] = setTimeout(function () { err.textContent = ''; }, 440); }
    return !msg;
  }
  [].forEach.call(form.elements, function (f) {
    if (!rules[f.name]) return;
    f.addEventListener('blur', function () { check(f); });
    f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) check(f); });
  });
  function shake(f) {
    if (MOOL.reduce) return;
    (f.closest('.field') || f).animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }

  var okEl = document.getElementById('form-ok');
  var fields = [].filter.call(form.children, function (c) { return c !== okEl; });
  function fade(els, a, b, ms) { return Promise.all(els.map(function (el) { return el.animate ? el.animate([{ opacity: a }, { opacity: b }], { duration: ms, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }).finished : Promise.resolve(); })); }
  function swap(done) {
    var h0 = form.offsetHeight, out = done ? fields : [okEl], inn = done ? [okEl] : fields;
    function apply() { fields.forEach(function (el) { el.style.display = done ? 'none' : ''; }); okEl.hidden = !done; }
    if (MOOL.reduce || !form.animate) { apply(); return Promise.resolve(); }
    form.style.height = h0 + 'px'; form.style.overflow = 'hidden';
    return fade(out, 1, 0, 220).then(function () {
      apply(); out.forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); });
      inn.forEach(function (el) { el.style.opacity = '0'; });
      form.style.height = ''; var h1 = form.offsetHeight; form.style.height = h0 + 'px';
      return form.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 400, easing: 'cubic-bezier(.2,.7,.2,1)' }).finished;
    }).then(function () { form.style.height = ''; form.style.overflow = ''; return fade(inn, 0, 1, 260); })
      .then(function () { inn.forEach(function (el) { el.style.opacity = ''; el.getAnimations().forEach(function (a) { a.cancel(); }); }); });
  }
  function show(text, withAgain) {
    okEl.textContent = text;
    if (withAgain) {
      var p = document.createElement('button'); p.type = 'button'; p.className = 'form__again'; p.textContent = 'Send another inquiry';
      p.addEventListener('click', function () { swap(false).then(function () { okEl.textContent = ''; var f = document.getElementById('f-name'); if (f) f.focus(); }); });
      okEl.appendChild(p);
    }
    okEl.hidden = true;
    swap(true).then(function () { okEl.focus(); });
  }
  function mailBody(data) {
    var lines = []; ['name', 'company', 'country', 'email', 'phone', 'product', 'quantity', 'unit', 'message'].forEach(function (k) { if (data[k]) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + data[k]); });
    return lines.join('\n');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, first = null, bad = [];
    [].forEach.call(form.elements, function (f) { if (rules[f.name] && !check(f)) { ok = false; bad.push(f); if (!first) first = f; } });
    if (!ok) { bad.forEach(shake); first.focus(); return; }
    if (form.elements.website && form.elements.website.value) return;      // honeypot
    var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; }); delete data.website;
    var submit = form.querySelector('[type=submit]'); submit.disabled = true;
    if (MOOL.config.formEndpoint) {
      fetch(MOOL.config.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(); form.reset(); show('Thank you. Your inquiry has been sent and the export desk will reply.', true); })
        .catch(function () { show('Sorry, the inquiry could not be sent. Please email ' + MOOL.config.mailto + ' directly.', true); })
        .then(function () { submit.disabled = false; });
    } else {
      /* no backend yet: hand the inquiry to the visitor's email app, addressed to the export desk */
      window.location.href = 'mailto:' + MOOL.config.mailto + '?subject=' + encodeURIComponent('Inquiry: ' + (data.product || 'products') + ' — ' + data.company) + '&body=' + encodeURIComponent(mailBody(data));
      show('Your email app should open with the inquiry ready to send to ' + MOOL.config.mailto + '. If it does not, please email us at that address.', true);
      submit.disabled = false;
    }
  });
})();
