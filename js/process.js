/* MOOLSORCE — process staircase: a thin line draws down the steps as you scroll
   (stroke-dashoffset scrubbed by ScrollTrigger); each numeral fades in as the line reaches it;
   document tags land like stamps (handled by the "stamp" kind in sections.js). */
(function () {
  'use strict';
  var MS = window.MS;
  var NS = 'http://www.w3.org/2000/svg';
  var steps = document.querySelector('.steps');
  if (!steps) return;

  /* Create the SVG once, then (re)lay it out from the steps' real positions.
     The path uses pathLength="1", so the scrub never depends on pixel length. */
  function createLine() {
    var old = steps.querySelector('.steps__line');
    if (old) old.remove();
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'steps__line');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('pathLength', '1');
    path.setAttribute('stroke-dasharray', '1');
    path.setAttribute('stroke-dashoffset', MS.reduce ? '0' : '1');
    svg.appendChild(path);
    var line = { svg: svg, path: path, nodes: [], fractions: [] };
    [].slice.call(steps.querySelectorAll('.step')).forEach(function () {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'node'); c.setAttribute('r', 4);
      svg.appendChild(c); line.nodes.push(c);
    });
    steps.insertBefore(svg, steps.firstChild);
    layout(line);
    return line;
  }

  function layout(line) {
    var items = [].slice.call(steps.querySelectorAll('.step'));
    var box = steps.getBoundingClientRect();
    var pts = items.map(function (s) {
      var r = s.getBoundingClientRect();
      return { x: Math.round(r.left - box.left - 12), top: Math.round(r.top - box.top), bot: Math.round(r.bottom - box.top) };
    });
    /* down each step's left edge, then across to the next step's edge: a staircase */
    var d = 'M' + pts[0].x + ' ' + pts[0].top;
    var acc = 0, x = pts[0].x, y = pts[0].top, cum = [];
    pts.forEach(function (p, i) {
      if (p.x !== x) { d += 'H' + p.x; acc += Math.abs(p.x - x); x = p.x; }
      cum.push(acc);                       // length of line at the top of step i
      d += 'V' + p.bot; acc += p.bot - y; y = p.bot;
    });
    line.path.setAttribute('d', d);
    line.nodes.forEach(function (c, i) { c.setAttribute('cx', pts[i].x); c.setAttribute('cy', pts[i].top); });
    line.fractions = cum.map(function (c) { return c / (acc || 1); });
  }

  /* Reduced motion: the finished line, no scrubbing. */
  if (MS.reduce) {
    var still = createLine();
    window.addEventListener('resize', function () { layout(still); });
    return;
  }

  MS.mod('process', function () {
    var gsap = window.gsap, ST = window.ScrollTrigger, C = MS.cfg;
    var numerals = MS.$$('.step__n', steps);
    var shown = numerals.map(function (n) { return n.classList.contains('is-in'); });
    var line = createLine();

    function reveal(i) {
      if (shown[i]) return;
      shown[i] = true;
      gsap.fromTo(numerals[i], { opacity: 0, x: -16 }, {
        opacity: 1, x: 0, duration: 0.7, ease: C.ease.standard,
        onComplete: function () { MS.done(numerals[i]); }
      });
    }

    gsap.to(line.path, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: {
        trigger: steps, start: 'top 68%', end: 'bottom 62%', scrub: 0.4,
        onUpdate: function (self) {
          for (var i = 0; i < line.fractions.length; i++) {
            var reached = self.progress >= line.fractions[i] - 0.005;
            line.nodes[i].classList.toggle('is-on', reached);   // dots follow the line (it retracts on scroll-back)
            if (reached) reveal(i);                              // numerals animate in once and stay
          }
        }
      }
    });

    /* positions shift when fonts load or the window resizes: re-lay the same SVG in place */
    var onRefresh = function () { layout(line); };
    ST.addEventListener('refresh', onRefresh);
    return function () { ST.removeEventListener('refresh', onRefresh); };
  });
})();
