/* MOOLSORCE — in-page navigation as page transitions (View Transitions API),
   with a plain smooth-scroll fallback. Focus always lands on the target's heading. */
(function () {
  'use strict';
  var MS = window.MS;
  var root = document.documentElement;

  /* Run a DOM change inside a view transition when supported; otherwise just run it.
     `kind` ("nav" | "modal") picks the CSS in motion.css. Returns a promise for "finished". */
  MS.transition = function (kind, update) {
    if (!MS.supportsVT || MS.reduce) { update(); return Promise.resolve(); }
    root.setAttribute('data-vt', kind);
    var t = document.startViewTransition(update);
    var clear = function () { root.removeAttribute('data-vt'); };
    t.finished.then(clear, clear);
    return t.finished.catch(function () { /* interrupted: nothing to do */ });
  };

  function headingOf(target) {
    return target.matches('h1,h2,h3,h4') ? target : (target.querySelector('h1,h2,h3') || target);
  }
  function focusHeading(target, selector) {
    var el = selector ? MS.$(selector) : headingOf(target);
    if (!el) return;
    if (!el.hasAttribute('tabindex') && !/^(input|select|textarea|button|a)$/i.test(el.tagName)) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }
  function topOf(target) {
    var y = target.getBoundingClientRect().top + window.scrollY;
    var offset = target.hasAttribute('data-nooffset') ? 0 : (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    return Math.max(0, Math.round(y - offset));
  }

  /* goTo('#contact', { focus: '#f-name' }) — also used by the product dialog */
  MS.goTo = function (hash, opts) {
    opts = opts || {};
    var target = hash === '#top' ? document.body : MS.$(hash);
    if (!target) return;
    var y = hash === '#top' ? 0 : topOf(target);
    var focusSel = opts.focus || (hash === '#top' ? '.hero h1' : null);

    MS.programmaticScroll = true;
    var settle = function () {
      focusHeading(target, focusSel);
      setTimeout(function () { MS.programmaticScroll = false; }, 120);
    };
    if (history.pushState && location.hash !== hash) history.pushState(null, '', hash);

    if (MS.supportsVT && !MS.reduce) {
      MS.transition('nav', function () { MS.scrollTo(y, true); }).then(settle);
    } else if (MS.reduce) {
      window.scrollTo({ top: y, behavior: 'auto' });
      settle();
    } else {
      MS.scrollTo(y, false);
      var done = false, fin = function () { if (!done) { done = true; settle(); } };
      if ('onscrollend' in window) window.addEventListener('scrollend', fin, { once: true });
      setTimeout(fin, 900);
    }
  };

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (hash.length < 2 && hash !== '#top') return;     // "#" placeholders (Buyer Login, Privacy) stay inert
    if (!MS.$(hash) && hash !== '#top') return;
    e.preventDefault();
    MS.goTo(hash);
  });

  /* Back / forward between hashes */
  window.addEventListener('popstate', function () {
    if (location.hash && MS.$(location.hash)) {
      var y = topOf(MS.$(location.hash));
      window.scrollTo({ top: y, behavior: 'auto' });
    }
  });
})();
