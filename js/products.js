/* MOOLSORCE — products: staggered row reveal, sticky group heading crossfade,
   and the product detail dialog with a shared-element View Transition. */
(function () {
  'use strict';
  var MS = window.MS;
  var root = document.documentElement;

  /* ============ Scroll motion (needs GSAP) ============ */
  MS.mod('products', function () {
    var gsap = window.gsap, ST = window.ScrollTrigger, C = MS.cfg;

    /* Rows reveal in sequence as each group enters; rows arriving together are staggered. */
    var rows = MS.$$('.ledger .row').filter(function (r) { return !r.classList.contains('is-in'); });
    rows.forEach(function (r) { r.setAttribute('data-r', 'row'); });
    if (rows.length) {
      ST.batch(rows, {
        start: 'top 90%', once: true, interval: 0.12, batchMax: 6,
        onEnter: function (batch) {
          gsap.fromTo(batch, { opacity: 0, y: 18 }, {
            opacity: 1, y: 0, duration: 0.7, ease: C.ease.standard, stagger: C.stagger,
            onComplete: function () { MS.done(batch); }
          });
        }
      });
    }

    /* Sticky group heading: the outgoing group's heading fades as the next group takes over.
       Only meaningful where the heading is sticky (>= 960px). */
    if (window.matchMedia('(min-width: 960px)').matches) {
      MS.$$('.ledger .group').forEach(function (g) {
        var head = MS.$('.group__head', g);
        ST.create({
          trigger: g, start: 'top 82%', end: 'bottom 38%',
          onToggle: function (self) { head.classList.toggle('is-dim', !self.isActive); }
        });
      });
    }
    return function () { MS.$$('.group__head').forEach(function (h) { h.classList.remove('is-dim'); }); };
  });

  /* ============ Detail dialog (no GSAP needed) ============ */
  var dlg = document.getElementById('pm');
  if (!dlg || typeof dlg.showModal !== 'function') return;

  var elRef = document.getElementById('pm-ref');
  var elTitle = document.getElementById('pm-title');
  var elDesc = dlg.querySelector('.pm__desc');
  var elMeta = dlg.querySelector('.pm__meta');
  var btnClose = dlg.querySelector('.pm__close');
  var btnQuote = dlg.querySelector('.pm__quote');
  var lastRow = null, current = null, busy = false;

  function fill(row) {
    var btn = row.querySelector('.row__btn');
    elRef.textContent = row.querySelector('.row__ref').textContent;
    elTitle.textContent = btn.textContent;
    elDesc.textContent = row.querySelector('.row__main p').textContent;
    elMeta.textContent = '';
    MS.$$('.row__meta > div', row).forEach(function (div) {
      var wrap = document.createElement('div');
      wrap.appendChild(div.querySelector('dt').cloneNode(true));
      var dd = document.createElement('dd');
      dd.textContent = div.querySelector('dd').textContent;
      wrap.appendChild(dd);
      elMeta.appendChild(wrap);
    });
  }

  /* view-transition-name can live on only one element at a time, so the names are handed over
     inside the transition callback: row → dialog when opening, dialog → row when closing. */
  function setNames(parts) {
    if (parts.title) parts.title.style.viewTransitionName = 'pname';
    if (parts.ref) parts.ref.style.viewTransitionName = 'pref';
  }
  function rowParts(row) { return { title: row.querySelector('.row__btn'), ref: row.querySelector('.row__ref') }; }
  function dlgParts() { return { title: elTitle, ref: elRef }; }
  function clearNames(parts) { [parts.title, parts.ref].forEach(function (el) { if (el) el.style.viewTransitionName = ''; }); }

  function openFor(row) {
    if (busy) return;
    busy = true;
    lastRow = row;
    fill(row);
    var rp = rowParts(row), dp = dlgParts();
    var useVT = MS.supportsVT && !MS.reduce;
    var show = function () { root.classList.add('pm-open'); if (MS.lenis) MS.lenis.stop(); dlg.showModal(); };

    if (useVT) {
      dlg.classList.add('use-vt');
      setNames(rp);                                   // old state: names on the row
      MS.transition('modal', function () {
        clearNames(rp); setNames(dp); show();         // new state: names on the dialog
      }).then(function () { clearNames(dp); dlg.classList.remove('use-vt'); busy = false; focusInside(); });
    } else {
      show(); busy = false;
    }
  }
  function focusInside() { if (document.activeElement === document.body || !dlg.contains(document.activeElement)) btnClose.focus(); }

  /* opts.quiet: skip the shared-element return (used when jumping to the form) */
  function closeDlg(opts) {
    opts = opts || {};
    if (busy || !dlg.open) return;
    busy = true;
    var row = lastRow;
    var finish = function () {
      dlg.close();
      root.classList.remove('pm-open');
      if (MS.lenis) MS.lenis.start();
      dlg.classList.remove('is-closing');
      if (!opts.noFocus && row) { var b = row.querySelector('.row__btn'); if (b) b.focus({ preventScroll: true }); }
      busy = false;
    };
    var useVT = MS.supportsVT && !MS.reduce && !opts.quiet && row;
    if (useVT) {
      var rp = rowParts(row), dp = dlgParts();
      dlg.classList.add('use-vt');
      setNames(dp);
      MS.transition('modal', function () { clearNames(dp); setNames(rp); finish(); })
        .then(function () { clearNames(rp); dlg.classList.remove('use-vt'); });
    } else if (MS.reduce || opts.quiet) {
      finish();
    } else {
      dlg.classList.add('is-closing');
      var t = setTimeout(finish, 300);
      dlg.addEventListener('animationend', function once() { clearTimeout(t); dlg.removeEventListener('animationend', once); finish(); });
    }
  }

  /* Open: one delegated listener on the ledger */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.row__btn');
    if (b) { openFor(b.closest('.row')); return; }
    /* click on the backdrop (the dialog element itself, outside the panel) */
    if (e.target === dlg) closeDlg();
  });
  btnClose.addEventListener('click', function () { closeDlg(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeDlg(); });   // Esc → animated close
  /* Focus trap: Tab and Shift+Tab wrap inside the dialog */
  dlg.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = MS.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', dlg).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  dlg.addEventListener('close', function () { root.classList.remove('pm-open'); });

  /* Quote button: pre-fill the form's product field, close, and go to the form */
  btnQuote.addEventListener('click', function () {
    var row = lastRow;
    var select = document.getElementById('f-product');
    if (row && select) {
      var want = row.getAttribute('data-product');
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].text === want) { select.selectedIndex = i; break; }
      }
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeDlg({ quiet: true, noFocus: true });
    setTimeout(function () { MS.goTo('#contact', { focus: '#f-name' }); }, 30);
  });
})();
