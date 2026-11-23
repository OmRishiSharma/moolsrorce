/* MOOLSORCE — vanilla JS. Only what earns its place:
   mobile menu, FAQ accordion, form validation, scroll reveal, draft-mode highlight. */
(function () {
  'use strict';

  var doc = document.documentElement;

  /* ---- Draft mode: open index.html?draft to highlight every placeholder ---- */
  if (/[?&]draft\b/.test(location.search)) doc.classList.add('draft');

  /* ---- Footer year ---- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---- Header: shadow once scrolled; highlight the section in view ---- */
  var hdr = document.querySelector('.site-header');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  var navLinks = document.querySelectorAll('.nav__list a[href^="#"]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (l) {
          if (l.getAttribute('href') === '#' + en.target.id) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (l) {
      var s = document.querySelector(l.getAttribute('href'));
      if (s) spy.observe(s);
    });
  }

  /* ---- Mobile menu ---- */
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    var setMenu = function (open) {
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
    };
    btn.addEventListener('click', function () {
      setMenu(btn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        btn.focus();
      }
    });
  }

  /* ---- Disabled Buyer Login placeholder: don't jump to top ---- */
  var login = document.querySelector('.nav__login');
  if (login) login.addEventListener('click', function (e) { e.preventDefault(); });

  /* ---- FAQ accordion (one open at a time) ---- */
  var triggers = document.querySelectorAll('.acc button[aria-expanded]');
  triggers.forEach(function (t) {
    t.addEventListener('click', function () {
      var open = t.getAttribute('aria-expanded') === 'true';
      triggers.forEach(function (o) {
        o.setAttribute('aria-expanded', 'false');
        document.getElementById(o.getAttribute('aria-controls')).hidden = true;
      });
      if (!open) {
        t.setAttribute('aria-expanded', 'true');
        document.getElementById(t.getAttribute('aria-controls')).hidden = false;
      }
    });
  });

  /* ---- Scroll reveal (skipped entirely for reduced motion) ---- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- "Ask for samples" CTA preselects intent in the message box ---- */
  var sampleLink = document.querySelector('[data-sample]');
  if (sampleLink) {
    sampleLink.addEventListener('click', function () {
      var msg = document.getElementById('f-msg');
      if (msg && !msg.value) msg.value = 'I would like to request samples of: ';
    });
  }

  /* ---- Contact form ---- */
  var form = document.getElementById('inquiry');
  if (!form) return;

  var rules = {
    name:    function (v) { return v.trim().length >= 2 ? '' : 'Enter your full name.'; },
    company: function (v) { return v.trim() ? '' : 'Enter your company name.'; },
    country: function (v) { return v.trim() ? '' : 'Enter your country.'; },
    email:   function (v) {
      if (!v.trim()) return 'Enter your email address.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email, like name@company.com.';
    },
    phone:   function (v) {
      if (!v.trim()) return '';                       // optional
      return /^[+()\d][\d\s().-]{6,}$/.test(v.trim()) ? '' : 'Use digits with country code, like +971 50 000 0000.';
    },
    product: function (v) { return v ? '' : 'Choose a product.'; }
  };

  function check(field) {
    var rule = rules[field.name];
    if (!rule) return true;
    var msg = rule(field.value);
    var err = document.getElementById('e-' + field.name);
    if (msg) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', err.id);
      err.textContent = msg; err.hidden = false;
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      err.textContent = ''; err.hidden = true;
    }
    return !msg;
  }

  Array.prototype.forEach.call(form.elements, function (f) {
    if (!rules[f.name]) return;
    f.addEventListener('blur', function () { check(f); });
    f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) check(f); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();   // remove if you point the form's action at a form service
    var ok = true, first = null;
    Array.prototype.forEach.call(form.elements, function (f) {
      if (rules[f.name] && !check(f)) { ok = false; if (!first) first = f; }
    });
    if (!ok) { first.focus(); return; }
    if (form.elements.website && form.elements.website.value) return; // honeypot tripped: silently drop
    submitForm(new FormData(form));
  });

  function submitForm(data) {
    /* TODO — BACKEND GOES HERE.
       Example with a form service (Formspree / Getform / your own endpoint):

       fetch('https://formspree.io/f/XXXXXXXX', {
         method: 'POST', body: data, headers: { Accept: 'application/json' }
       }).then(function (r) { if (!r.ok) throw new Error(); showOk(); })
         .catch(function () { showError(); });

       Until then we only show the success state. NOTHING IS SENT. */
    showOk();
  }

  function showOk() {
    var ok = document.getElementById('form-ok');
    ok.textContent = 'Thank you. Your inquiry has been noted and the export desk will reply within one working day.';
    ok.hidden = false;
    form.reset();
    ok.focus();
  }
})();
