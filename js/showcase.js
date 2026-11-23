/* MOOLSORCE — scroll-scrubbed set pieces:
   1. Manifesto: a sticky statement whose words light up as you scroll.
   2. Product families: a sticky section whose card track slides sideways, scrubbed by vertical scroll.
   Both are plain sticky sections (no ScrollTrigger pin), so Lenis and native scroll stay in agreement. */
(function () {
  'use strict';
  var MS = window.MS;

  MS.mod('showcase', function () {
    var gsap = window.gsap, ST = window.ScrollTrigger;

    /* ---------- 1. Manifesto ---------- */
    var sec = MS.$('.manifesto'), txt = MS.$('.manifesto__text[data-words]');
    if (sec && txt) {
      if (!txt.classList.contains('is-split')) {
        (function wrap(node) {
          [].slice.call(node.childNodes).forEach(function (n) {
            if (n.nodeType === 3) {
              var frag = document.createDocumentFragment();
              n.nodeValue.split(/(\s+)/).forEach(function (part) {
                if (!part) return;
                if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                var s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s);
              });
              node.replaceChild(frag, n);
            } else if (n.nodeType === 1) wrap(n);
          });
        })(txt);
        txt.classList.add('is-split');
      }
      var words = MS.$$('.w', txt);
      gsap.to(words, {
        opacity: 1, ease: 'none', stagger: 0.12, duration: 0.5,
        scrollTrigger: { trigger: sec, start: 'top 30%', end: 'bottom 90%', scrub: 0.3 }
      });
    }

    /* ---------- 2. Product families ---------- */
    var show = MS.$('.showcase'), track = MS.$('.showcase__track'), rail = MS.$('.showcase__rail'), bar = MS.$('.showcase__bar i');
    var onInit = null;
    if (show && track && rail) {
      var dist = function () {
        var cs = getComputedStyle(rail);
        return Math.max(0, parseFloat(cs.paddingLeft) + track.scrollWidth + parseFloat(cs.paddingRight) - window.innerWidth);
      };
      var size = function () { show.style.setProperty('--sc-h', (window.innerHeight + dist()) + 'px'); };
      show.classList.add('is-pinned');
      rail.scrollLeft = 0;
      size();
      gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: show, start: 'top top', end: 'bottom bottom', scrub: 0.4, invalidateOnRefresh: true,
          onUpdate: function (self) { if (bar) bar.style.setProperty('--p', self.progress.toFixed(4)); }
        }
      });
      onInit = size;
      ST.addEventListener('refreshInit', onInit);
    }

    return function () {
      if (onInit) ST.removeEventListener('refreshInit', onInit);
      if (show) { show.classList.remove('is-pinned'); show.style.removeProperty('--sc-h'); }
      if (track) gsap.set(track, { clearProps: 'transform' });
    };
  });
})();
