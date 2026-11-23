/* MOOLSORCE — scroll motion for About, Stats, Commitments, CTA and Footer, plus the
   shared reveal kinds used across the page. One technique per section on purpose:
     up       text blocks            rise 24px, expo-out, staggered when they arrive together
     fade     captions, headings     opacity only
     row      table rows / lists     short 14px rise, faster stagger
     stamp    document tags          scale .9 → 1 with opacity (no overshoot)
     foot     footer columns         opacity only, light stagger
     clip-l   About photo            clip-path opens left → right, image slides under the mask
     clip-up  Products banner        clip-path opens bottom → top, image settles from 1.08
     commit   Commitments            rule draws first, then text slides in
     cta      CTA band               diagonal clip-path wipe, headline lines like the hero
*/
(function () {
  'use strict';
  var MS = window.MS;

  MS.mod('sections', function () {
    var gsap = window.gsap, ST = window.ScrollTrigger, C = MS.cfg, d = C.dist;

    /* ---- Shared kinds ---- */
    MS.revealKind('up',   { opacity: 0, y: d },  { opacity: 1, y: 0 });
    MS.revealKind('fade', { opacity: 0 },        { opacity: 1 }, { duration: 0.8 });
    MS.revealKind('row',  { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { duration: 0.6, stagger: 0.06 });
    MS.revealKind('stamp', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }, { duration: 0.35, stagger: 0.07 });
    MS.revealKind('foot', { opacity: 0 },        { opacity: 1 }, { duration: 0.9, stagger: 0.09, start: 'top 96%' });

    /* ---- Clip-path photo reveals (About, Products banner) ---- */
    function clipReveal(fig, from, to, imgFrom) {
      if (fig.classList.contains('is-in')) return;
      var img = fig.querySelector('img');
      ST.create({
        trigger: fig, start: 'top 82%', once: true,
        onEnter: function () {
          var tl = gsap.timeline({ onComplete: function () { MS.done(fig); if (img) gsap.set(img, { clearProps: 'transform,willChange' }); } });
          tl.fromTo(fig, { clipPath: from }, { clipPath: to, duration: 1.1, ease: C.ease.emphasis }, 0);
          if (img) tl.fromTo(img, imgFrom, { xPercent: 0, yPercent: 0, scale: 1, duration: 1.3, ease: C.ease.emphasis }, 0);
        }
      });
    }
    MS.$$('[data-r="clip-l"]').forEach(function (f) {
      clipReveal(f, 'inset(0 100% 0 0)', 'inset(0 0% 0 0)', { xPercent: -3.5, scale: 1.08 });
    });
    MS.$$('[data-r="clip-up"]').forEach(function (f) {
      clipReveal(f, 'inset(100% 0 0 0)', 'inset(0% 0 0 0)', { scale: 1.08 });
    });

    /* ---- About: dictionary entry types in letter by letter, once ---- */
    var entry = MS.$('.entry');
    if (entry && !entry.getAttribute('data-split')) {
      entry.setAttribute('data-split', '1');
      var seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
      var chars = [];
      ['.entry__word', '.entry__dev'].forEach(function (sel) {
        var el = MS.$(sel, entry);
        if (!el) return;
        var text = el.textContent;
        var parts = seg ? Array.from(seg.segment(text), function (s) { return s.segment; }) : [text];
        el.textContent = '';
        var sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;
        var vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
        parts.forEach(function (p) { var c = document.createElement('span'); c.className = 'ch'; c.textContent = p; vis.appendChild(c); chars.push(c); });
        el.appendChild(sr); el.appendChild(vis);
      });
      ['.entry__pos', '.entry__def'].forEach(function (sel) {
        var el = MS.$(sel, entry); if (el) { el.classList.add('ch'); chars.push(el); }
      });
      entry._chars = chars;
    }
    if (entry && entry._chars && !entry.classList.contains('is-in')) {
      ST.create({
        trigger: entry, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(entry._chars, { opacity: 1, duration: 0.3, ease: C.ease.standard, stagger: 0.045,
            onComplete: function () { entry.classList.add('is-in'); gsap.set(entry._chars, { clearProps: 'opacity' }); } });
        }
      });
    }

    /* ---- Stats: count up once, ease-out; labels follow after the number lands ---- */
    var cleanups = [];
    MS.$$('.stats dd').forEach(function (dd) {
      var node = dd.firstChild;
      if (!node || node.nodeType !== 3) return;
      var final = parseInt(node.nodeValue, 10);
      if (isNaN(final)) return;
      var label = dd.parentNode.querySelector('dt');
      if (!dd.getAttribute('data-counted')) node.nodeValue = '0';
      cleanups.push(function () { node.nodeValue = String(final); });
      if (dd.getAttribute('data-counted')) return;
      ST.create({
        trigger: dd, start: 'top 90%', once: true,
        onEnter: function () {
          var o = { v: 0 };
          gsap.to(o, { v: final, duration: 1.6, ease: C.ease.standard,
            onUpdate: function () { node.nodeValue = String(Math.round(o.v)); },
            onComplete: function () {
              node.nodeValue = String(final);
              dd.setAttribute('data-counted', '1');
              if (label) gsap.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: C.ease.standard, onComplete: function () { MS.done(label); } });
            } });
        }
      });
    });

    /* ---- Commitments: the thin rule draws left → right, then the text slides in ---- */
    var items = MS.$$('[data-r="commit"]').filter(function (el) { return !el.classList.contains('is-in'); });
    if (items.length) {
      ST.batch(items, {
        start: 'top 88%', once: true, interval: 0.1, batchMax: 4,
        onEnter: function (batch) {
          batch.forEach(function (el, i) {
            var tl = gsap.timeline({ delay: i * 0.1, onComplete: function () { el.classList.add('is-in'); gsap.set([el].concat([].slice.call(el.children)), { clearProps: 'opacity,transform,--rule' }); } });
            tl.to(el, { '--rule': 1, duration: 0.7, ease: C.ease.standard })
              .fromTo(el.children, { opacity: 0, x: -d }, { opacity: 1, x: 0, duration: 0.8, ease: C.ease.emphasis, stagger: 0.08 }, '-=0.15');
          });
        }
      });
    }

    /* ---- CTA band: diagonal wipe, headline lines mirror the hero ---- */
    var cta = MS.$('[data-r="cta"]');
    if (cta && !cta.classList.contains('is-in')) {
      var h2 = MS.$('.ln-js', cta);
      var lines = h2 ? MS.$$('.ln__in', h2) : [];
      ST.create({
        trigger: cta, start: 'top 78%', once: true,
        onEnter: function () {
          var tl = gsap.timeline({ onComplete: function () { MS.done(cta); if (h2) { h2.classList.add('is-in'); gsap.set(lines, { clearProps: 'transform' }); } } });
          tl.fromTo(cta, { clipPath: 'polygon(0% 0%, 0% 0%, -30% 100%, 0% 100%)' },
                         { clipPath: 'polygon(0% 0%, 130% 0%, 100% 100%, 0% 100%)', duration: 1.1, ease: C.ease.emphasis }, 0);
          if (lines.length) tl.fromTo(lines, { yPercent: 105 }, { yPercent: 0, duration: 0.9, ease: C.ease.emphasis, stagger: 0.08 }, 0.25);
        }
      });
    }

    return function () { cleanups.forEach(function (f) { f(); }); };
  });
})();
