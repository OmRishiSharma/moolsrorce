/* MOOLSORCE — three-scene.js
   Two WebGL scenes, both lazy and both paused when they are not on screen:

   1. The WORLD (fixed, full viewport, behind the page): a dotted globe with ports and trade arcs, floating
      spice shapes, and an interactive dust field. The camera/globe are choreographed by page scroll
      (animations.js tweens MOOL.gl) and respond to the mouse. Depth fog fakes depth-of-field.
   2. The SPECIMEN viewer (Products section): a heap of 3D grains / pods / fruit that changes with the
      selected product family.

   Fallbacks: reduced motion, low-power hardware or no WebGL leave the CSS mesh, the static route map
   and a typographic HS numeral in place. */
(function () {
  'use strict';
  var MOOL = window.MOOL, doc = document.documentElement;

  /* The numbers animations.js scrubs. gx/gy/gs = globe position + scale, gop = globe opacity,
     sp = spice shapes amount, spin = extra globe rotation (radians) driven by page progress. */
  MOOL.gl = { gx: 2.0, gy: 0.05, gs: 1.3, gop: 1, sp: 1, spin: 0 };

  if (MOOL.reduce || MOOL.lowPower() || !window.WebGLRenderingContext) return;

  /* ============================== ROUTE DATA ============================== */
  /* Ports and the regions we are building routes to (the same facts as the page copy). */
  var PORTS = [
    { id: 'Mundra', lat: 22.84, lon: 69.72 }, { id: 'Nhava Sheva', lat: 18.95, lon: 72.95 },
    { id: 'Chennai', lat: 13.08, lon: 80.29 }, { id: 'Kochi', lat: 9.93, lon: 76.27 }
  ];
  var DESTS = [
    { id: 'Gulf', lat: 25.01, lon: 55.06 }, { id: 'Europe', lat: 51.92, lon: 4.48 },
    { id: 'Southeast Asia', lat: 1.29, lon: 103.85 }, { id: 'East Africa', lat: -4.04, lon: 39.67 }
  ];
  var ROUTES = [['Mundra', 'Gulf'], ['Nhava Sheva', 'Europe'], ['Chennai', 'Southeast Asia'], ['Kochi', 'East Africa'], ['Mundra', 'East Africa'], ['Nhava Sheva', 'Gulf']];
  /* Land mask: 180 x 90 cells of 2 degrees, 1 bit each, from Natural Earth 110m. */
  var MASK = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABf+Af/gAAAAAAAAAAAAAAAAAAAAAAA///////AAAABgAADgAAAAAAAAAAACd//f///4AB/AAAAAB8AAAAAAAAAAB1D34////4AAYAAAEAAPwAAAAAAAAAAfi/wAf//wAAAAADgAf/4AHIAAAAAAH8338AP//wAAAAAMBD///+DAAAgDwADfy3/wP//gAAA4AMH///////gAAf////7934H/+AAAP/gA//////////8P//////h+H/gAAAf/7///////////s///////n8D8A+AA+/////////////Cf/////4w8D4AAAH5/////////////Af/////gHgB4AAAP5///////////P4AHoH///gH0AAAAAH4//////////2MAADAB///4H+AAAAGDx/////////8A8AAAAA////v/gAAAPDv/////////wB4AAAABf///v/wAAAbv///////////AwAAAAAP/////wAAAH////////////AAAAAAAH////+cAAAD///////////9AAAAAAAD////8MAAAB///////////9AAAAAAAD////+AAAAB//7fP//////5AAAAAAAD////gAAAAf5vwPP//////jgAAAAAAD////gAAAAfi///n/////+CAAAAAAAD///+AAAAAfCLf/n/////MCAAAAAAAB///8AAAAAOfRP/n/////mOAAAAAAAB///8AAAAAH/AC///////G8AAAAAAAAf//wAAAAAf/iB///////hgAAAAAAAAP//wAAAAAf//////////gAAAAAAAAAP/gwAAAAA/////f/////gAAAAAAAAAF/AQAAAAB///+/v/////AAAAAAAAAAC+AQAAAAD/////2/////gAAAAAAAAAAeAwAAAAD////f/D///8gAAAAAAAAAAfGGAAAAH////v/B/z/wAAAAAAAgAAAPsFwAAAD////v+A/h+gAAAAAAAAAAAD8AAAAAD////n8AeB/AgAAAAAAAAAAAfAAAAAH////3wAcAfggAAAAAAAAAAAHgAAAAH////+AAcAfgwAAAAAAAAAAABD6AAAD////9wAMATAYAAAAAAAAAAAA//AAAB/////gAOAQAYAAAAAAAAAAAAH/gAAA/////gACAIAYAAAAAAAAAAAAH/8AAAfP///AAAAsHAAAAAAAAAAAAAH/+AAAAB///AAAA8OAAAAAAAAAAAAAP/+AAAAD//8AAAAc+yAAAAAAAAAAAAf//gAAAD//4AAAAMfhgAAAAAAAAAAAP//8AAAB//wAAAAGdi+AAAAAAAAAAAf///AAAA//wAAAACAwPkAAAAAAAAAAP///gAAA//wAAAAB4AHwAAAAAAAAAAP///AAAA//wAAAAABoDYIAAAAAAAAAH///AAAAf/wAAAAAAAAAAAAAAAAAAAH//+AAAA//4gAAAAABxAAAAAAAAAAAD//+AAAA//xgAAAAAPxgAAAAAAAAAAA//+AAAA//zgAAAAAf/gABAAAAAAAAAf/8AAAA//DgAAAAA//wAAAAAAAAAAAf/8AAAAf/DAAAAAD//4CAAAAAAAAAAf/4AAAAf/DAAAAAH//8AAAAAAAAAAAf/AAAAAf+DAAAAAH//8AAAAAAAAAAA//AAAAAf+AAAAAAH//+AAAAAAAAAAA//AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAH//+AAAAAAAAAAA/8AAAAAHwAAAAAAD4f8AAAAAAAAAAA/4AAAAAAAAAAAAADAP8AAAAAAAAAAB/wAAAAAAAAAAAAAAAD4AEAAAAAAAAB/AAAAAAAAAAAAAAAABAAGAAAAAAAAB+AAAAAAAAAAAAAAAAAwAMAAAAAAAAB8AAAAAAAAAAAAAAAAAQAYAAAAAAAAB4AAAAAAAAAAAAAAAAAAAwAAAAAAAAD4AAAAAAAAAAAAAAAAAAAgAAAAAAAAD4AAAAAAAAAACAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  var BITS = (function () { var b = atob(MASK), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; })();
  function landAt(lat, lon) {
    var j = Math.min(89, Math.max(0, Math.floor((90 - lat) / 2))), i = Math.min(179, Math.max(0, Math.floor((lon + 180) / 2))), k = j * 180 + i;
    return (BITS[k >> 3] >> (7 - (k & 7))) & 1;
  }
  function ll(THREE, lat, lon, r) {
    var a = lat * Math.PI / 180, o = lon * Math.PI / 180;
    return new THREE.Vector3(r * Math.cos(a) * Math.sin(o), r * Math.sin(a), r * Math.cos(a) * Math.cos(o));
  }
  function dotTexture(THREE) {
    var c = document.createElement('canvas'); c.width = c.height = 32;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  }

  /* ============================== 1. THE WORLD ============================== */
  var DUST_V = [
    'attribute float aSeed; uniform float uTime; uniform float uPx; uniform float uScroll; uniform vec2 uMouse; varying float vA; varying float vC;',
    'void main(){',
    '  vec3 p = position;',
    '  p.x += sin(uTime * 0.12 + aSeed * 20.0) * 0.5;',
    '  p.y += cos(uTime * 0.10 + aSeed * 13.0) * 0.4 + uScroll * (1.2 + aSeed * 3.0);',
    '  p.y = mod(p.y + 6.0, 12.0) - 6.0;',
    '  vec2 d = p.xy - uMouse; float l = length(d); float push = smoothstep(2.2, 0.0, l);',
    '  p.xy += normalize(d + 0.0001) * push * 0.85;',                              // dust parts around the cursor
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  gl_PointSize = (1.3 + aSeed * 2.8) * uPx * (7.0 / -mv.z);',
    '  vA = (0.16 + aSeed * 0.4) * smoothstep(17.0, 4.0, -mv.z);',                  // far dust fades: fake depth of field
    '  vC = aSeed;',
    '}'
  ].join('\n');
  var DUST_F = [
    'varying float vA; varying float vC;',
    'void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;',
    '  float a = smoothstep(0.5, 0.08, d) * vA;',
    '  vec3 c = mix(vec3(0.96, 0.93, 0.88), vec3(0.89, 0.73, 0.31), step(0.72, vC));',
    '  gl_FragColor = vec4(c, a); }'
  ].join('\n');

  function buildWorld() {
    var THREE = window.THREE, canvas = document.getElementById('scene');
    if (!canvas) return;
    var small = window.innerWidth < 760;
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: dpr < 1.5, alpha: true, powerPreference: 'low-power' }); }
    catch (e) { return; }
    renderer.setPixelRatio(dpr); renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1B2410, 9, 19);
    var cam = new THREE.PerspectiveCamera(35, 1.6, 0.1, 40); cam.position.set(0, 0, 7.6);
    scene.add(new THREE.AmbientLight(0xfff1d6, 0.55));
    var key = new THREE.DirectionalLight(0xffe2a8, 1.0); key.position.set(3, 4, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9db85a, 0.8); rim.position.set(-4, -2, 2); scene.add(rim);
    var tex = dotTexture(THREE), disposables = [tex];
    function track(o) { disposables.push(o); return o; }

    /* ---- Globe ---- */
    var globe = new THREE.Group(); scene.add(globe);
    var body = new THREE.Mesh(track(new THREE.SphereGeometry(0.985, 48, 32)), track(new THREE.MeshBasicMaterial({ color: 0x34431C, transparent: true, fog: false })));
    globe.add(body);
    var pos = [], step = 2.1;
    for (var lat = -58; lat <= 84; lat += step) {
      var n = Math.max(1, Math.round(360 * Math.cos(lat * Math.PI / 180) / step));
      for (var k = 0; k < n; k++) { var lon = -180 + (k + 0.5 * ((lat / step) & 1)) * 360 / n; if (landAt(lat, lon)) { var v = ll(THREE, lat, lon, 1); pos.push(v.x, v.y, v.z); } }
    }
    var dg = track(new THREE.BufferGeometry()); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var dots = new THREE.Points(dg, track(new THREE.PointsMaterial({ color: 0xF4EDE0, size: 0.044, map: tex, alphaTest: 0.4, transparent: true, depthWrite: false, fog: false })));
    globe.add(dots);
    function markers(list, color, size) {
      var p = []; list.forEach(function (m) { var q = ll(THREE, m.lat, m.lon, 1.006); p.push(q.x, q.y, q.z); });
      var g = track(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      var pts = new THREE.Points(g, track(new THREE.PointsMaterial({ color: color, size: size, map: tex, alphaTest: 0.4, transparent: true, depthWrite: false, fog: false })));
      globe.add(pts); return pts;
    }
    var portPts = markers(PORTS, 0xE3B94F, 0.06), destPts = markers(DESTS, 0x9DB85A, 0.075);
    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
    var arcs = ROUTES.map(function (r, idx) {
      var a = byId(PORTS, r[0]), b = byId(DESTS, r[1]), va = ll(THREE, a.lat, a.lon, 1), vb = ll(THREE, b.lat, b.lon, 1);
      var ang = va.angleTo(vb), N = 72, pts = [];
      for (var i = 0; i <= N; i++) { var t = i / N, q = new THREE.Vector3().copy(va).lerp(vb, t).normalize(); q.multiplyScalar(1.004 + Math.sin(Math.PI * t) * (0.05 + 0.5 * ang / Math.PI)); pts.push(q); }
      var g = track(new THREE.BufferGeometry().setFromPoints(pts)); g.setDrawRange(0, 0);
      var line = new THREE.Line(g, track(new THREE.LineBasicMaterial({ color: 0xE3B94F, transparent: true, fog: false })));
      globe.add(line);
      return { geo: g, pts: pts, N: N, delay: 0.9 + idx * 0.3, dur: 2.0 };
    });
    var headGeo = track(new THREE.BufferGeometry()); headGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(arcs.length * 3), 3));
    var heads = new THREE.Points(headGeo, track(new THREE.PointsMaterial({ color: 0xFFF1C9, size: 0.055, map: tex, alphaTest: 0.4, transparent: true, depthWrite: false, fog: false })));
    heads.frustumCulled = false; globe.add(heads);

    /* ---- Spice shapes (peppercorns, turmeric fingers, cardamom pods) ---- */
    var nS = small ? 10 : 18, nF = small ? 4 : 7, nP = small ? 3 : 6;
    var sets = [
      { geo: new THREE.SphereGeometry(0.16, 12, 10), n: nS, colors: [0x2a1c13, 0x4a3320, 0xc69632, 0xf4ede0] },
      { geo: new THREE.CapsuleGeometry(0.11, 0.55, 3, 8), n: nF, colors: [0xc69632, 0xb97b1e, 0xe3b94f] },
      { geo: new THREE.IcosahedronGeometry(0.2, 0), n: nP, colors: [0x4e5e1f, 0x6f7f2d, 0x9db85a] }
    ];
    var mat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 }));
    var spiceGroup = new THREE.Group(); scene.add(spiceGroup);
    var dummy = new THREE.Object3D(), col = new THREE.Color(), items = [];
    sets.forEach(function (s) {
      track(s.geo);
      var mesh = new THREE.InstancedMesh(s.geo, mat, s.n); spiceGroup.add(mesh); s.mesh = mesh;
      for (var i = 0; i < s.n; i++) {
        var left = Math.random() < 0.18, z = left ? -4.5 + Math.random() * 2 : -3.8 + Math.random() * 4.6;
        items.push({ mesh: mesh, i: i, bx: left ? -4.4 + Math.random() * 2.2 : 0.4 + Math.random() * 5.4, by: -2.6 + Math.random() * 5.2, z: z,
          rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, vr: 0.12 + Math.random() * 0.35, sp: 0.25 + Math.random() * 0.5, ph: Math.random() * 6.28,
          sc: (0.4 + Math.random() * 0.55) * (0.75 + (z + 5) / 6 * 0.45), k: (z + 6) / 8 });
        mesh.setColorAt(i, col.setHex(s.colors[(Math.random() * s.colors.length) | 0]));
      }
      mesh.instanceColor.needsUpdate = true;
    });

    /* ---- Dust ---- */
    var nD = small ? 500 : 1300, dp = new Float32Array(nD * 3), ds = new Float32Array(nD);
    for (var d = 0; d < nD; d++) { dp[d * 3] = (Math.random() - 0.5) * 20; dp[d * 3 + 1] = (Math.random() - 0.5) * 12; dp[d * 3 + 2] = -7 + Math.random() * 11; ds[d] = Math.random(); }
    var dustGeo = track(new THREE.BufferGeometry()); dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(ds, 1));
    var U = { uTime: { value: 0 }, uPx: { value: dpr * (window.innerHeight / 900) * 13 }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector2(99, 99) } };
    var dust = new THREE.Points(dustGeo, track(new THREE.ShaderMaterial({ uniforms: U, vertexShader: DUST_V, fragmentShader: DUST_F, transparent: true, depthWrite: false })));
    dust.frustumCulled = false; scene.add(dust);

    /* ---- Input + sizing ---- */
    var mouse = { x: 0, y: 0, tx: 0, ty: 0, live: false };
    window.addEventListener('pointermove', function (e) { mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2; mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2; mouse.live = true; }, { passive: true });
    var W = 0, H = 0;
    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      if (w === W && Math.abs(h - H) < 120) return;      // ignore mobile URL-bar jitter
      W = w; H = h;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      U.uPx.value = dpr * (h / 900) * 13;
    }
    resize(); window.addEventListener('resize', resize);

    /* ---- Loop: only while a 3D section is on screen and the tab is visible ---- */
    var S = { yaw: -78 * Math.PI / 180, start: null }, onScreen = {}, active = true, running = false, raf = 0, last = 0, clock = 0, shown = false;
    function frame(now) {
      raf = 0; if (!running) return;
      var dt = Math.max(0, Math.min((now - last) / 1000 || 0, 0.05)); last = now; clock += dt;
      var G = MOOL.gl, sy = window.scrollY, halfH = 7.6 * Math.tan(17.5 * Math.PI / 180), halfW = halfH * cam.aspect;
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
      var auto = mouse.live ? 0 : 1;                                                // touch: gentle self-drift instead
      var mx = mouse.live ? mouse.x : Math.sin(clock * 0.25) * 0.4, my = mouse.live ? mouse.y : Math.cos(clock * 0.2) * 0.25;

      cam.position.x = mx * 0.3; cam.position.y = my * 0.18; cam.lookAt(0, 0, 0);       // smooth camera movement
      U.uTime.value = clock; U.uScroll.value = sy * 0.0007; U.uMouse.value.set(mx * halfW, my * halfH);

      /* globe */
      var gv = G.gop > 0.01; globe.visible = gv;
      if (gv) {
        globe.position.set(G.gx + mx * 0.12, G.gy + my * 0.08, 0); globe.scale.setScalar(G.gs);
        S.yaw += dt * 0.05;
        globe.rotation.y = S.yaw + G.spin + mx * 0.3; globe.rotation.x = 0.3 - my * 0.16;
        body.material.opacity = G.gop * 0.96; dots.material.opacity = G.gop;
        portPts.material.opacity = G.gop; destPts.material.opacity = G.gop;
        heads.material.opacity = G.gop;
        var t0 = S.start === null ? 0 : clock - S.start;
        arcs.forEach(function (a, i) {
          var t = (t0 - a.delay) / a.dur;
          if (t <= 0) { headGeo.attributes.position.array[i * 3] = headGeo.attributes.position.array[i * 3 + 1] = headGeo.attributes.position.array[i * 3 + 2] = 0; return; }
          var c = Math.min(t, 1), idx = Math.floor((1 - Math.pow(1 - c, 3)) * a.N);
          a.geo.setDrawRange(0, idx + 1);
          var v = a.pts[idx], arr = headGeo.attributes.position.array;
          if (c >= 1) { arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = 0; } else { arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; }
        });
        headGeo.attributes.position.needsUpdate = true;
        globe.children.forEach(function (c) { if (c.isLine) c.material.opacity = G.gop * 0.95; });
      }
      /* spice shapes */
      var sv = G.sp > 0.01; spiceGroup.visible = sv;
      if (sv) {
        spiceGroup.rotation.y = mx * 0.12; spiceGroup.rotation.x = -my * 0.06;
        items.forEach(function (o) {
          dummy.position.set(o.bx + Math.sin(clock * o.sp + o.ph) * 0.18 + mx * o.k * 0.9, o.by + Math.cos(clock * o.sp * 0.8 + o.ph) * 0.22 + my * o.k * 0.55 + (1 - G.sp) * 2, o.z);
          dummy.rotation.set(o.rx + clock * o.vr, o.ry + clock * o.vr * 0.7, o.rz);
          dummy.scale.setScalar(o.sc * G.sp); dummy.updateMatrix(); o.mesh.setMatrixAt(o.i, dummy.matrix);
        });
        sets.forEach(function (s) { s.mesh.instanceMatrix.needsUpdate = true; });
      }
      renderer.render(scene, cam);
      if (!shown) { shown = true; S.start = clock; doc.classList.add('gl-ready'); }
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      var should = active && !document.hidden;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { onScreen[e.target.id] = e.isIntersecting; });
        active = Object.keys(onScreen).some(function (k) { return onScreen[k]; }); sync();
      });
      MOOL.$$('[data-gl]').forEach(function (s) { io.observe(s); });
    }
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; doc.classList.remove('gl-ready'); });
    sync();
  }

  /* ============================== 2. SPECIMEN VIEWER ============================== */
  function buildStage() {
    var THREE = window.THREE, stage = document.getElementById('stage'), canvas = stage && stage.querySelector('.stage__gl');
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { return; }
    renderer.setPixelRatio(dpr); renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 30); cam.position.set(0, 0.4, 5.6); cam.lookAt(0, -0.05, 0);
    scene.add(new THREE.AmbientLight(0xfff1d6, 0.6));
    var key = new THREE.DirectionalLight(0xffe2a8, 1.15); key.position.set(3, 4, 4); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9db85a, 0.9); rim.position.set(-4, -1, 2); scene.add(rim);

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function heap(R, flat) { var x, y, z, l; do { x = rnd(-1, 1); y = rnd(-1, 1); z = rnd(-1, 1); l = x * x + y * y + z * z; } while (l > 1 || l < 0.001); return [x * R, y * R * flat - 0.15, z * R]; }
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.04 });
    var dummy = new THREE.Object3D(), col = new THREE.Color();
    /* each family: layers of instanced shapes arranged in a loose heap */
    var DEFS = [
      [ { g: new THREE.SphereGeometry(0.075, 10, 8), n: 100, c: [0x2a1c13, 0x3b2a1b, 0x1a120c], s: [0.8, 1.2] },                 // black pepper
        { g: new THREE.CapsuleGeometry(0.06, 0.3, 3, 8), n: 36, c: [0xc69632, 0xb97b1e, 0xd9a441], s: [0.9, 1.3], rot: true },     // turmeric
        { g: new THREE.ConeGeometry(0.07, 0.3, 8), n: 24, c: [0x9b2c1a, 0x7c2014, 0xb5391f], s: [0.9, 1.3], rot: true },           // chilli
        { g: new THREE.SphereGeometry(0.055, 8, 6), n: 40, c: [0x8a9a3a, 0x6f7f2d], s: [0.8, 1.2] } ],                            // cardamom
      [ { g: new THREE.CapsuleGeometry(0.022, 0.17, 3, 6), n: 460, c: [0xf3ead3, 0xeae0c6, 0xf8f2e2], s: [0.85, 1.15], rot: true } ],   // rice
      [ { g: new THREE.SphereGeometry(0.08, 10, 8), n: 120, c: [0xd8b67a, 0xcfa860, 0xe0c28a], s: [0.85, 1.15] },                // chickpeas
        { g: new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), n: 150, c: [0xc8662b, 0xb5551f, 0xd9783a], s: [0.8, 1.2], rot: true } ],     // lentils
      [ { g: new THREE.SphereGeometry(0.15, 16, 12), n: 34, c: [0x7b3f5e, 0xd98a1f, 0x8fa64a, 0xa3262a], s: [0.7, 1.15], squash: true } ],  // onion / mango / grape / pomegranate
      [ { g: new THREE.SphereGeometry(0.1, 10, 8), n: 90, c: [0xf6efe0, 0xefe5cd], s: [0.85, 1.2] },                              // makhana
        { g: new THREE.BoxGeometry(0.2, 0.12, 0.14), n: 24, c: [0x8a4b1e, 0x6e3a17, 0xa05d26], s: [0.9, 1.2], rot: true },         // jaggery
        { g: new THREE.SphereGeometry(0.04, 8, 6), n: 130, c: [0xd9b04a, 0xc99a33], s: [0.8, 1.2] } ]                              // millets
    ];
    var groups = [];
    function make(i) {
      if (groups[i]) return groups[i];
      var g = new THREE.Group(); g.visible = false; scene.add(g);
      DEFS[i].forEach(function (L) {
        var m = new THREE.InstancedMesh(L.g, mat, L.n); g.add(m);
        for (var k = 0; k < L.n; k++) {
          var p = heap(1.25, 0.82), sc = rnd(L.s[0], L.s[1]);
          dummy.position.set(p[0], p[1], p[2]);
          dummy.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
          dummy.scale.set(sc, L.squash && Math.random() < 0.4 ? sc * 1.25 : sc, sc);
          dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix);
          m.setColorAt(k, col.setHex(L.c[(Math.random() * L.c.length) | 0]));
        }
        m.instanceColor.needsUpdate = true; m.instanceMatrix.needsUpdate = true;
      });
      groups[i] = g; return g;
    }

    var cur = null, incoming = null, t = 1, want = MOOL.family || 0, tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    function setFamily(i) { want = i; }
    MOOL.onFamily = setFamily;
    stage.addEventListener('pointermove', function (e) { var r = stage.getBoundingClientRect(); tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.9; tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.5; });
    stage.addEventListener('pointerleave', function () { tilt.tx = 0; tilt.ty = 0; });

    function resize() { var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    var ro = new ResizeObserver(resize); ro.observe(stage); resize();

    var visible = false, running = false, raf = 0, last = 0, clock = 0, shown = false;
    function ease(x) { return 1 - Math.pow(1 - x, 3); }
    function frame(now) {
      raf = 0; if (!running) return;
      var dt = Math.max(0, Math.min((now - last) / 1000 || 0, 0.05)); last = now; clock += dt;
      if (want !== (incoming ? incoming.i : cur ? cur.i : -1)) { incoming = { i: want, g: make(want) }; t = 0; }
      if (incoming) {
        t += dt / 0.7;
        var out = cur, inn = incoming.g;
        if (out) out.g.scale.setScalar(Math.max(0, 1 - t * 2.4));                      // old heap shrinks away quickly
        if (t > 0.25) { inn.visible = true; inn.scale.setScalar(ease(Math.min((t - 0.25) / 0.75, 1))); }
        if (t >= 1) { if (out) out.g.visible = false; cur = incoming; incoming = null; }
      }
      tilt.x += (tilt.tx - tilt.x) * 0.08; tilt.y += (tilt.ty - tilt.y) * 0.08;
      groups.forEach(function (g) { if (g.visible) { g.rotation.y = clock * 0.35 + tilt.x * 1.4; g.rotation.x = tilt.y * 0.8; g.position.y = Math.sin(clock * 0.9) * 0.04; } });
      renderer.render(scene, cam);
      if (!shown) { shown = true; stage.classList.add('is-gl'); }
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      var should = visible && !document.hidden;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }).observe(stage);
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; stage.classList.remove('is-gl'); });
    want = MOOL.family || 0; sync();
  }

  /* ============================== Boot (lazy) ============================== */
  function startWorld() { MOOL.loadThree().then(buildWorld).catch(function (e) { console.warn(e); }); }
  function afterPaint() { setTimeout(startWorld, 400); }
  if (document.readyState === 'complete') afterPaint(); else window.addEventListener('load', afterPaint);

  var stageEl = document.getElementById('stage');
  if (stageEl && 'IntersectionObserver' in window) {
    var lazy = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      lazy.disconnect();
      MOOL.loadThree().then(buildStage).catch(function (e) { console.warn(e); });
    }, { rootMargin: '100% 0px 100% 0px' });
    lazy.observe(stageEl);
  }
})();
