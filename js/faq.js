/* MOOLSORCE — FAQ accordion. One open at a time; the open item closes while the new one opens.
   Height animates through grid-template-rows (0fr → 1fr) in CSS, so there is no display toggling
   and no measuring. This file only flips state and keeps aria + visibility honest. */
(function () {
  'use strict';
  var MS = window.MS;
  var triggers = MS.$$('.acc button[aria-expanded]');
  if (!triggers.length) return;

  function panelOf(t) { return document.getElementById(t.getAttribute('aria-controls')); }
  function set(t, open) {
    t.setAttribute('aria-expanded', String(open));
    var p = panelOf(t);
    p.classList.toggle('is-open', open);
    p.removeAttribute('hidden');           // visibility is handled in CSS so the height can animate
  }

  triggers.forEach(function (t) {
    set(t, false);
    t.addEventListener('click', function () {
      var willOpen = t.getAttribute('aria-expanded') !== 'true';
      triggers.forEach(function (o) { if (o !== t) set(o, false); });   // simultaneous close
      set(t, willOpen);
    });
  });
})();
