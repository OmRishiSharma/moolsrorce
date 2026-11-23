/* MOOLSORCE — hero intro.
   The intro itself is pure CSS (motion.css) so it starts at first paint and never waits on a
   library or blocks a click. This file only cleans up afterwards: once the last animation ends,
   will-change is released so the compositor layers are freed. */
(function () {
  'use strict';
  var last = document.querySelector('.routes');
  var root = document.documentElement;
  var settle = function () { root.classList.add('hero-settled'); };
  if (!last || window.MS.reduce) { settle(); return; }
  last.addEventListener('animationend', function () { setTimeout(settle, 700); }, { once: true });
  setTimeout(settle, 2600);   // safety net if the animation never fires
})();
