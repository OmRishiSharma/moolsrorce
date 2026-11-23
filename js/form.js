/* MOOLSORCE — contact form: validation (unchanged rules) + motion.
   Motion here is deliberately quiet: focus colour is CSS, errors slide down via grid rows,
   the fields shake ONCE and only on a failed submit, and success crossfades with the height eased
   so the page never jumps. */
(function () {
  'use strict';
  var MS = window.MS;

  var sampleLink = document.querySelector('[data-sample]');
  if (sampleLink) {
    /* "Ask for samples" CTA preselects intent in the message box */
    sampleLink.addEventListener('click', function () {
      var msg = document.getElementById('f-msg');
      if (msg && !msg.value) msg.value = 'I would like to request samples of: ';
    });
  }

  var form = document.getElementById('inquiry');
  if (!form) return;

  /* ---------- Validation rules (same as before) ---------- */
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

  var clearTimers = {};
  function check(field) {
    var rule = rules[field.name];
    if (!rule) return true;
    var msg = rule(field.value);
    var err = document.getElementById('e-' + field.name);
    var wrap = err.closest('.err-wrap');
    clearTimeout(clearTimers[field.name]);
    if (msg) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', err.id);
      err.textContent = msg;
      if (wrap) wrap.classList.add('is-open');        // slides down (CSS)
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      if (wrap) {
        wrap.classList.remove('is-open');             // slides up, then the text is cleared
        clearTimers[field.name] = setTimeout(function () { err.textContent = ''; }, 420);
      } else { err.textContent = ''; }
    }
    return !msg;
  }

  Array.prototype.forEach.call(form.elements, function (f) {
    if (!rules[f.name]) return;
    f.addEventListener('blur', function () { check(f); });
    f.addEventListener('input', function () { if (f.getAttribute('aria-invalid')) check(f); });
  });

  /* One subtle shake (3px), only on a failed submit, and not at all for reduced motion */
  function shakeOnce(field) {
    if (MS.reduce || !field.animate) return;
    var box = field.closest('.field') || field;
    box.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }],
      { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }
    );
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();   // remove if you point the form's action at a form service
    var ok = true, first = null, bad = [];
    Array.prototype.forEach.call(form.elements, function (f) {
      if (rules[f.name] && !check(f)) { ok = false; bad.push(f); if (!first) first = f; }
    });
    if (!ok) { bad.forEach(shakeOnce); first.focus(); return; }
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

  /* ---------- Success: crossfade form → message, height eased ---------- */
  var okEl = document.getElementById('form-ok');
  var fields = Array.prototype.filter.call(form.children, function (c) { return c !== okEl; });

  function fade(els, from, to, ms) {
    return Promise.all(els.map(function (el) {
      if (!el.animate) return Promise.resolve();
      return el.animate([{ opacity: from }, { opacity: to }], { duration: ms, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }).finished;
    }));
  }
  function easeHeight(h0, h1) {
    if (!form.animate || MS.reduce) return Promise.resolve();
    return form.animate([{ height: h0 + 'px' }, { height: h1 + 'px' }], { duration: 400, easing: 'cubic-bezier(.2,.7,.2,1)' }).finished;
  }
  function cancelAnims(els) {
    [].concat(els).forEach(function (el) { if (el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); }); });
  }
  function swapTo(done) {
    var h0 = form.offsetHeight;
    var out = done ? fields : [okEl], inn = done ? [okEl] : fields;
    function apply() {
      fields.forEach(function (el) { el.style.display = done ? 'none' : ''; });
      okEl.hidden = !done;
      form.classList.toggle('is-done', done);
    }
    if (MS.reduce || !form.animate) { apply(); return Promise.resolve(); }
    form.style.height = h0 + 'px';
    form.style.overflow = 'hidden';
    return fade(out, 1, 0, 220).then(function () {
      apply(); cancelAnims(out);
      inn.forEach(function (el) { el.style.opacity = '0'; });
      form.style.height = '';
      var h1 = form.offsetHeight;                // natural height of the new state
      form.style.height = h0 + 'px';
      return easeHeight(h0, h1);
    }).then(function () {
      form.style.height = ''; form.style.overflow = '';
      return fade(inn, 0, 1, 260);
    }).then(function () {
      inn.forEach(function (el) { el.style.opacity = ''; });
      cancelAnims(inn);
    });
  }

  function showOk() {
    okEl.textContent = 'Thank you. Your inquiry has been noted and the export desk will reply within one working day.';
    var actions = document.createElement('p');
    actions.className = 'form__ok-actions';
    var again = document.createElement('button');
    again.type = 'button'; again.className = 'form__again'; again.textContent = 'Send another inquiry';
    actions.appendChild(again);
    okEl.appendChild(actions);
    again.addEventListener('click', function () {
      swapTo(false).then(function () { okEl.textContent = ''; var f = document.getElementById('f-name'); if (f) f.focus(); });
    });
    form.reset();
    okEl.hidden = true;
    swapTo(true).then(function () { okEl.focus(); });
  }
})();
