/* MOOLSORCE — trade-route globe (the one 3D element on the page).
   - Three.js is lazy-loaded when the band is ONE VIEWPORT away. Nothing here runs before that.
   - A static SVG map of the same routes is the default: it is what no-JS, reduced-motion,
     no-WebGL and low-power visitors see, and what everyone sees until the globe is ready.
   - Cream dots on dark, ochre arcs, green destinations. No glow, no photoreal Earth.
   - Renders only while visible and while the tab is visible. DPR capped at 2. No wheel zoom. */
(function () {
  'use strict';
  var MS = window.MS;
  var band = document.querySelector('.globe');
  if (!band) return;
  var stage = band.querySelector('.globe__stage');
  var canvas = band.querySelector('.globe__canvas');

  /* ==========================================================================================
     ROUTE CONFIG — edit here. PLACEHOLDER: destination regions are not confirmed trade lanes.
     (Keep assets/routes-map.svg in step if you change these; it is the static fallback.)
     ========================================================================================== */
  var PORTS = [
    { id: 'Mundra',      lat: 22.84, lon: 69.72 },
    { id: 'Nhava Sheva', lat: 18.95, lon: 72.95 },
    { id: 'Chennai',     lat: 13.08, lon: 80.29 },
    { id: 'Kochi',       lat: 9.93,  lon: 76.27 }
  ];
  var DESTS = [   // PLACEHOLDER regions, each pinned to a representative port city
    { id: 'Gulf',           lat: 25.01, lon: 55.06 },   // Jebel Ali
    { id: 'Europe',         lat: 51.92, lon: 4.48 },    // Rotterdam
    { id: 'Southeast Asia', lat: 1.29,  lon: 103.85 },  // Singapore
    { id: 'East Africa',    lat: -4.04, lon: 39.67 }    // Mombasa
  ];
  var ROUTES = [  // [port id, destination id]
    ['Mundra', 'Gulf'], ['Nhava Sheva', 'Europe'], ['Chennai', 'Southeast Asia'],
    ['Kochi', 'East Africa'], ['Mundra', 'East Africa'], ['Nhava Sheva', 'Gulf']
  ];
  var INDIA = { lat: 20, lon: 70 };   // face slightly west of India so the Arabian Sea lanes read

  /* Land mask, 180 × 90 cells of 2° (1 bit each, row-major from the north-west), from Natural Earth 110m. */
  var MASK = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABf+Af/gAAAAAAAAAAAAAAAAAAAAAAA///////AAAABgAADgAAAAAAAAAAACd//f///4AB/AAAAAB8AAAAAAAAAAB1D34////4AAYAAAEAAPwAAAAAAAAAAfi/wAf//wAAAAADgAf/4AHIAAAAAAH8338AP//wAAAAAMBD///+DAAAgDwADfy3/wP//gAAA4AMH///////gAAf////7934H/+AAAP/gA//////////8P//////h+H/gAAAf/7///////////s///////n8D8A+AA+/////////////Cf/////4w8D4AAAH5/////////////Af/////gHgB4AAAP5///////////P4AHoH///gH0AAAAAH4//////////2MAADAB///4H+AAAAGDx/////////8A8AAAAA////v/gAAAPDv/////////wB4AAAABf///v/wAAAbv///////////AwAAAAAP/////wAAAH////////////AAAAAAAH////+cAAAD///////////9AAAAAAAD////8MAAAB///////////9AAAAAAAD////+AAAAB//7fP//////5AAAAAAAD////gAAAAf5vwPP//////jgAAAAAAD////gAAAAfi///n/////+CAAAAAAAD///+AAAAAfCLf/n/////MCAAAAAAAB///8AAAAAOfRP/n/////mOAAAAAAAB///8AAAAAH/AC///////G8AAAAAAAAf//wAAAAAf/iB///////hgAAAAAAAAP//wAAAAAf//////////gAAAAAAAAAP/gwAAAAA/////f/////gAAAAAAAAAF/AQAAAAB///+/v/////AAAAAAAAAAC+AQAAAAD/////2/////gAAAAAAAAAAeAwAAAAD////f/D///8gAAAAAAAAAAfGGAAAAH////v/B/z/wAAAAAAAgAAAPsFwAAAD////v+A/h+gAAAAAAAAAAAD8AAAAAD////n8AeB/AgAAAAAAAAAAAfAAAAAH////3wAcAfggAAAAAAAAAAAHgAAAAH////+AAcAfgwAAAAAAAAAAABD6AAAD////9wAMATAYAAAAAAAAAAAA//AAAB/////gAOAQAYAAAAAAAAAAAAH/gAAA/////gACAIAYAAAAAAAAAAAAH/8AAAfP///AAAAsHAAAAAAAAAAAAAH/+AAAAB///AAAA8OAAAAAAAAAAAAAP/+AAAAD//8AAAAc+yAAAAAAAAAAAAf//gAAAD//4AAAAMfhgAAAAAAAAAAAP//8AAAB//wAAAAGdi+AAAAAAAAAAAf///AAAA//wAAAACAwPkAAAAAAAAAAP///gAAA//wAAAAB4AHwAAAAAAAAAAP///AAAA//wAAAAABoDYIAAAAAAAAAH///AAAAf/wAAAAAAAAAAAAAAAAAAAH//+AAAA//4gAAAAABxAAAAAAAAAAAD//+AAAA//xgAAAAAPxgAAAAAAAAAAA//+AAAA//zgAAAAAf/gABAAAAAAAAAf/8AAAA//DgAAAAA//wAAAAAAAAAAAf/8AAAAf/DAAAAAD//4CAAAAAAAAAAf/4AAAAf/DAAAAAH//8AAAAAAAAAAAf/AAAAAf+DAAAAAH//8AAAAAAAAAAA//AAAAAf+AAAAAAH//+AAAAAAAAAAA//AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAH//+AAAAAAAAAAA/8AAAAAHwAAAAAAD4f8AAAAAAAAAAA/4AAAAAAAAAAAAADAP8AAAAAAAAAAB/wAAAAAAAAAAAAAAAD4AEAAAAAAAAB/AAAAAAAAAAAAAAAABAAGAAAAAAAAB+AAAAAAAAAAAAAAAAAwAMAAAAAAAAB8AAAAAAAAAAAAAAAAAQAYAAAAAAAAB4AAAAAAAAAAAAAAAAAAAwAAAAAAAAD4AAAAAAAAAAAAAAAAAAAgAAAAAAAAD4AAAAAAAAAACAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  /* ---------- Gate: who gets the live globe? ---------- */
  if (MS.reduce || MS.lowPower() || !canvas || !('IntersectionObserver' in window) || !window.WebGLRenderingContext) return;   // fallback map stays

  var state = null;   // live scene, if any
  var loading = false, loaded = !!window.THREE;

  /* Lazy load: start when the band is within one viewport */
  var lazyIO = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    lazyIO.disconnect();
    load();
  }, { rootMargin: '100% 0px 100% 0px' });
  lazyIO.observe(band);

  function load() {
    if (loaded) { build(); return; }
    if (loading) return;
    loading = true;
    MS.loadThree().then(function () { loaded = true; build(); }).catch(function (e) { console.warn(e); });
  }

  /* Rebuild when the layout changes breakpoint, so the renderer is never stale or leaked */
  [ '(min-width: 640px)', '(min-width: 960px)' ].forEach(function (q) {
    window.matchMedia(q).addEventListener('change', function () { if (state) { var wasIn = state.S.entered; destroy(); build(wasIn); } });
  });

  /* ================================ scene ================================ */
  function ll(lat, lon, r) {
    var a = lat * Math.PI / 180, o = lon * Math.PI / 180;
    return new THREE.Vector3(r * Math.cos(a) * Math.sin(o), r * Math.sin(a), r * Math.cos(a) * Math.cos(o));
  }
  function landAt(lat, lon) {
    var j = Math.min(89, Math.max(0, Math.floor((90 - lat) / 2)));
    var i = Math.min(179, Math.max(0, Math.floor((lon + 180) / 2)));
    var k = j * 180 + i;
    return (BITS[k >> 3] >> (7 - (k & 7))) & 1;
  }
  var BITS = (function () {
    var bin = atob(MASK), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  })();

  function dotTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 32;
    var g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }

  function build(startEntered) {
    if (state) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: dpr < 2, alpha: true, powerPreference: 'low-power' }); }
    catch (e) { return; }
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1.4, 0.1, 20);
    camera.position.set(0, 0, 4.1);

    var globe = new THREE.Group();
    scene.add(globe);
    var disposables = [];
    function track(o) { disposables.push(o); return o; }

    /* Body: matches the band so back-facing dots are hidden by depth */
    var body = new THREE.Mesh(track(new THREE.SphereGeometry(0.985, 48, 32)), track(new THREE.MeshBasicMaterial({ color: 0x33421C })));
    globe.add(body);

    /* Land dots: rings of ~2.2° spacing sampled against the mask (≈3.5k points) */
    var pos = [], step = 2.2;
    for (var lat = -58; lat <= 84; lat += step) {
      var n = Math.max(1, Math.round(360 * Math.cos(lat * Math.PI / 180) / step));
      for (var k = 0; k < n; k++) {
        var lon = -180 + (k + 0.5 * ((lat / step) & 1)) * 360 / n;
        if (landAt(lat, lon)) { var v = ll(lat, lon, 1); pos.push(v.x, v.y, v.z); }
      }
    }
    var dotGeo = track(new THREE.BufferGeometry());
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var tex = track(dotTexture());
    var dots = new THREE.Points(dotGeo, track(new THREE.PointsMaterial({ color: 0xF4EDE0, size: 0.034, map: tex, alphaTest: 0.4, transparent: true, opacity: 1, depthWrite: false })));
    globe.add(dots);

    /* Port + destination markers */
    function markers(list, color, size) {
      var p = []; list.forEach(function (m) { var v = ll(m.lat, m.lon, 1.006); p.push(v.x, v.y, v.z); });
      var g = track(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      var pts = new THREE.Points(g, track(new THREE.PointsMaterial({ color: color, size: size, map: tex, alphaTest: 0.4, transparent: true, depthWrite: false })));
      globe.add(pts); return pts;
    }
    var portPts = markers(PORTS, 0xE3B94F, 0.06);
    var destPts = markers(DESTS, 0x9DB85A, 0.075);
    destPts.material.opacity = 0; portPts.material.opacity = 1;

    /* Arcs: great-circle, lifted. Drawn once (setDrawRange); a bright head rides the front. */
    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
    var arcs = ROUTES.map(function (r, idx) {
      var a = byId(PORTS, r[0]), b = byId(DESTS, r[1]);
      var va = ll(a.lat, a.lon, 1), vb = ll(b.lat, b.lon, 1);
      var ang = va.angleTo(vb), N = 72, pts = [];
      for (var i = 0; i <= N; i++) {
        var t = i / N;
        var v = new THREE.Vector3().copy(va).lerp(vb, t).normalize();          // spherical path
        v.multiplyScalar(1.004 + Math.sin(Math.PI * t) * (0.05 + 0.5 * ang / Math.PI));   // lift grows with distance
        pts.push(v);
      }
      var g = track(new THREE.BufferGeometry().setFromPoints(pts));
      g.setDrawRange(0, 0);
      var line = new THREE.Line(g, track(new THREE.LineBasicMaterial({ color: 0xE3B94F, transparent: true, opacity: 0.95 })));
      globe.add(line);
      return { line: line, geo: g, pts: pts, N: N, delay: 0.7 + idx * 0.28, dur: 1.9, dest: b };
    });
    var headGeo = track(new THREE.BufferGeometry());
    headGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(arcs.length * 3), 3));
    var heads = new THREE.Points(headGeo, track(new THREE.PointsMaterial({ color: 0xFFF1C9, size: 0.05, map: tex, alphaTest: 0.4, transparent: true, depthWrite: false })));
    heads.frustumCulled = false;
    globe.add(heads);

    /* ---- interaction: damped drag, no zoom ---- */
    var S = {
      yaw: -(INDIA.lon + 105) * Math.PI / 180,      // start facing away; eased to India on entry
      tilt: 0.3, userYaw: 0, userTilt: 0, vel: 0,
      dragging: false, lastX: 0, lastY: 0, idle: 0,
      entered: false, enterT: -1, clock: 0, running: false, visible: false, raf: 0, intro: 0
    };
    var targetYaw = -INDIA.lon * Math.PI / 180;
    var startYaw = S.yaw;

    function onDown(e) { S.dragging = true; S.lastX = e.clientX; S.lastY = e.clientY; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); }
    function onMove(e) {
      if (!S.dragging) return;
      var dx = e.clientX - S.lastX, dy = e.clientY - S.lastY; S.lastX = e.clientX; S.lastY = e.clientY;
      S.userYaw = Math.max(-1.3, Math.min(1.3, S.userYaw + dx * 0.006));
      S.userTilt = Math.max(-0.3, Math.min(0.3, S.userTilt + dy * 0.003));
      S.idle = 0;
    }
    function onUp() { S.dragging = false; }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    /* deliberately NO wheel listener: scrolling the page over the globe must never zoom it */

    /* ---- sizing ---- */
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    var ro = new ResizeObserver(resize); ro.observe(stage); resize();

    /* ---- frame ---- */
    var last = 0;
    function ease(t) { return 1 - Math.pow(1 - t, 4); }       // ease-out
    function frame(now) {
      S.raf = 0;
      if (!S.running) return;
      var dt = Math.min((now - last) / 1000 || 0, 0.05); last = now; S.clock += dt;

      if (S.entered) {
        S.enterT += dt;
        var p = Math.min(S.enterT / 1.8, 1);
        if (p < 1) S.yaw = startYaw + (targetYaw - startYaw) * ease(p);
        else S.yaw += dt * 0.07;                                 // slow auto-rotation, the only loop
      }
      if (!S.dragging) {
        S.idle += dt;
        if (S.idle > 1.2) {                                       // damped return after a drag
          var k = 1 - Math.exp(-dt * 1.4);
          S.userYaw -= S.userYaw * k; S.userTilt -= S.userTilt * k;
        }
      }
      globe.rotation.y = S.yaw + S.userYaw;
      globe.rotation.x = S.tilt + S.userTilt;

      /* arcs draw once, staggered; head leads the line and ends on the destination */
      var hp = headGeo.attributes.position.array, anyActive = false, landed = 0;
      arcs.forEach(function (a, i) {
        var t = S.entered ? (S.enterT - a.delay) / a.dur : -1;
        if (t <= 0) { hp[i * 3] = hp[i * 3 + 1] = hp[i * 3 + 2] = 0; return; }
        var c = Math.min(t, 1), idx = Math.floor(ease(c) * a.N);
        a.geo.setDrawRange(0, idx + 1);
        var v = a.pts[idx]; hp[i * 3] = v.x; hp[i * 3 + 1] = v.y; hp[i * 3 + 2] = v.z;
        if (c >= 1) { landed++; hp[i * 3] = hp[i * 3 + 1] = hp[i * 3 + 2] = 0; }   // head retires on arrival
        else anyActive = true;
      });
      headGeo.attributes.position.needsUpdate = true;
      if (landed) destPts.material.opacity = Math.min(1, destPts.material.opacity + dt * 2.2);

      renderer.render(scene, camera);
      S.raf = requestAnimationFrame(frame);
    }
    function setRunning() {
      var should = S.visible && !document.hidden;
      if (should && !S.running) { S.running = true; last = performance.now(); S.raf = requestAnimationFrame(frame); }
      else if (!should && S.running) { S.running = false; cancelAnimationFrame(S.raf); S.raf = 0; }
    }
    var vis = function () { setRunning(); };
    document.addEventListener('visibilitychange', vis);

    /* render only while on screen; the first time it is >25% visible, the intro begins */
    var io = new IntersectionObserver(function (entries) {
      var en = entries[0];
      S.visible = en.isIntersecting;
      if (en.isIntersecting && !S.entered && en.intersectionRatio >= 0.25) {
        S.entered = true; S.enterT = 0;
        band.classList.add('is-live');                           // crossfade static map → canvas
      }
      setRunning();
    }, { threshold: [0, 0.25] });
    io.observe(stage);
    if (startEntered) { S.entered = true; S.enterT = 99; S.yaw = targetYaw; startYaw = targetYaw; destPts.material.opacity = 1; band.classList.add('is-live'); }

    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); destroy(); band.classList.remove('is-live'); });   // static map takes over for good

    state = {
      S: S,
      destroy: function () {
        cancelAnimationFrame(S.raf); S.running = false;
        io.disconnect(); ro.disconnect();
        document.removeEventListener('visibilitychange', vis);
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
        disposables.forEach(function (d) { d.dispose && d.dispose(); });
        renderer.dispose();   // frees GPU resources; the context stays reusable for a rebuild
      }
    };
  }

  function destroy() {
    if (!state) return;
    state.destroy();
    state = null;
  }
})();
