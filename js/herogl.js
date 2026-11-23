/* MOOLSORCE — hero WebGL: a liquid gradient mesh (fragment shader, reacts to the cursor) with
   floating 3D spice shapes (peppercorns, turmeric fingers, pods) that parallax with the mouse
   and drift up as you scroll. Three.js loads after first paint; until then (and for reduced
   motion, touch-light devices and low-power hardware) the CSS mesh shows instead. */
(function () {
  'use strict';
  var MS = window.MS;
  var hero = document.querySelector('.hero--cine');
  var canvas = hero && hero.querySelector('.hero__gl');
  if (!canvas || MS.reduce || MS.lowPower() || !window.WebGLRenderingContext || !('IntersectionObserver' in window)) return;

  function start() { MS.loadThree().then(build).catch(function (e) { console.warn(e); }); }
  function afterPaint() { setTimeout(start, 350); }
  if (document.readyState === 'complete') afterPaint(); else window.addEventListener('load', afterPaint);

  var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var FRAG = [
    'varying vec2 vUv; uniform float uTime; uniform float uScroll; uniform vec2 uRes; uniform vec2 uMouse;',
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.02 + 7.1; a *= 0.5; } return v; }',
    'void main(){',
    '  float asp = uRes.x / uRes.y;',
    '  vec2 p = (vUv - 0.5) * vec2(asp, 1.0) * 2.4;',
    '  vec2 m = (uMouse - 0.5) * vec2(asp, 1.0) * 2.4;',
    '  float md = length(p - m);',
    '  p += (p - m) * 0.2 * exp(-md * 1.5);',                    // liquid bulge around the cursor
    '  float t = uTime * 0.055 + uScroll * 0.4;',
    '  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));',
    '  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.7), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.5));',
    '  float f = fbm(p + 3.0 * r);',
    '  vec3 deep = vec3(0.07, 0.095, 0.035), forest = vec3(0.22, 0.285, 0.11), leaf = vec3(0.31, 0.37, 0.12), ochre = vec3(0.78, 0.59, 0.2);',
    '  vec3 col = mix(deep, forest, smoothstep(0.2, 0.72, f));',
    '  col = mix(col, leaf, smoothstep(0.45, 0.95, length(q)) * 0.5);',
    '  col += ochre * smoothstep(0.6, 0.98, f * length(r) * 1.7) * 0.32;',
    '  col += ochre * 0.14 * exp(-md * 2.2);',
    '  col *= mix(0.72, 1.0, smoothstep(1.7, 0.2, length(vUv - 0.5) * 1.6));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function build() {
    var THREE = window.THREE;
    var small = window.innerWidth < 760;
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.6);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'low-power' }); }
    catch (e) { return; }
    renderer.setPixelRatio(dpr);
    renderer.autoClear = false;

    /* background: full-screen shader quad */
    var bgScene = new THREE.Scene(), bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var U = { uTime: { value: 0 }, uScroll: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0.65, 0.5) } };
    var bgMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false });
    var bgGeo = new THREE.PlaneGeometry(2, 2);
    bgScene.add(new THREE.Mesh(bgGeo, bgMat));

    /* floating spice shapes */
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(38, 1.6, 0.1, 50);
    cam.position.z = 9;
    scene.add(new THREE.AmbientLight(0xfff1d6, 0.85));
    var key = new THREE.DirectionalLight(0xffe2a8, 1.5); key.position.set(3, 4, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9db85a, 0.7); rim.position.set(-4, -2, 2); scene.add(rim);

    var nS = small ? 12 : 24, nF = small ? 5 : 9, nP = small ? 4 : 7;
    var sets = [
      { geo: new THREE.SphereGeometry(0.16, 12, 10), n: nS, colors: [0x2a1c13, 0x4a3320, 0xc69632, 0xf4ede0] },        // peppercorns / cumin
      { geo: new THREE.CapsuleGeometry(0.11, 0.55, 3, 8), n: nF, colors: [0xc69632, 0xb97b1e, 0xe3b94f] },              // turmeric fingers
      { geo: new THREE.IcosahedronGeometry(0.2, 0), n: nP, colors: [0x4e5e1f, 0x6f7f2d, 0x9db85a] }                    // cardamom pods
    ];
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05 });
    var group = new THREE.Group(); scene.add(group);
    var dummy = new THREE.Object3D(), color = new THREE.Color();
    var items = [];
    sets.forEach(function (s) {
      var mesh = new THREE.InstancedMesh(s.geo, mat, s.n);
      group.add(mesh);
      s.mesh = mesh;
      for (var i = 0; i < s.n; i++) {
        /* keep the left (headline) side calm: most shapes live right of centre, the few on the left sit deep and small */
        var left = Math.random() < 0.22;
        var z = left ? -5 + Math.random() * 2.2 : -4.5 + Math.random() * 5;
        var o = {
          mesh: mesh, i: i, bx: left ? -4.6 + Math.random() * 3.4 : 0.6 + Math.random() * 6.2, by: -3.3 + Math.random() * 6.6, z: z,
          rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
          vr: 0.12 + Math.random() * 0.35, sp: 0.25 + Math.random() * 0.5, ph: Math.random() * 6.28,
          sc: (0.6 + Math.random() * 0.9) * (0.75 + (z + 5) / 6.5 * 0.55), k: (z + 6.5) / 8
        };
        items.push(o);
        mesh.setColorAt(i, color.setHex(s.colors[(Math.random() * s.colors.length) | 0]));
      }
      mesh.instanceColor.needsUpdate = true;
    });

    /* input + sizing */
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var onMove = function (e) {
      var r = hero.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = -((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    hero.addEventListener('pointermove', onMove, { passive: true });

    function resize() {
      var w = hero.clientWidth, h = hero.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      U.uRes.value.set(w * dpr, h * dpr);
    }
    var ro = new ResizeObserver(resize); ro.observe(hero); resize();

    /* loop — only while the hero is on screen and the tab is visible */
    var visible = true, running = false, raf = 0, last = 0, clock = 0, shown = false;
    function frame(now) {
      raf = 0;
      if (!running) return;
      var dt = Math.min((now - last) / 1000 || 0, 0.05); last = now; clock += dt;
      var sp = Math.min(window.scrollY / Math.max(hero.clientHeight, 1), 1.4);
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
      U.uTime.value = clock; U.uScroll.value = sp;
      U.uMouse.value.set(0.5 + mouse.x * 0.5, 0.5 + mouse.y * 0.5);

      group.rotation.y = mouse.x * 0.12; group.rotation.x = -mouse.y * 0.06;
      items.forEach(function (o) {
        dummy.position.set(
          o.bx + Math.sin(clock * o.sp + o.ph) * 0.18 + mouse.x * o.k * 0.9,
          o.by + Math.cos(clock * o.sp * 0.8 + o.ph) * 0.22 + mouse.y * o.k * 0.55 + sp * (1.2 + o.k * 2.6),
          o.z
        );
        dummy.rotation.set(o.rx + clock * o.vr, o.ry + clock * o.vr * 0.7, o.rz);
        dummy.scale.setScalar(o.sc);
        dummy.updateMatrix();
        o.mesh.setMatrixAt(o.i, dummy.matrix);
      });
      sets.forEach(function (s) { s.mesh.instanceMatrix.needsUpdate = true; });

      renderer.clear();
      renderer.render(bgScene, bgCam);
      renderer.clearDepth();
      renderer.render(scene, cam);
      if (!shown) { shown = true; hero.classList.add('is-gl'); }
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      var should = visible && !document.hidden;
      if (should && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!should && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; sync(); }).observe(hero);
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; hero.classList.remove('is-gl'); });
    sync();
  }
})();
