/* REWORN. — motion layer
   Everything interactive lives here so app.js stays about data.

   Contents
     1  custom cursor            8  magnetic buttons
     2  page transition curtain  9  scroll-driven parallax
     3  overlay navigation      10  split-text hero reveal
     4  hover image reveal      11  marquee velocity on scroll
     5  WebGL grain shader      12  count-up numerals
     6  SVG draw-on             13  editorial slider
     7  grid stagger reveal

   House rules (DESIGN.md): transform + opacity only, never layout.
   Travel eases on cubic-bezier(0.19,1,0.22,1); touch feedback stays instant.
*/
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE    = matchMedia('(pointer: fine)').matches;
  var EASE    = 'cubic-bezier(0.19, 1, 0.22, 1)';
  var lerp    = function (a, b, t) { return a + (b - a) * t; };
  var clamp   = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ============================================================
     1 — CUSTOM CURSOR
     A hairline ring that lags the pointer and swells over links.
     ============================================================ */
  function cursor() {
    if (!FINE || REDUCED) return;
    var el = document.createElement('div');
    el.className = 'cur';
    el.innerHTML = '<span class="cur__dot"></span><span class="cur__ring"></span>';
    document.body.appendChild(el);
    var dot = el.querySelector('.cur__dot'), ring = el.querySelector('.cur__ring');
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });

    (function loop() {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(loop);
    })();

    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('a, button, [data-scrub], .card');
      el.classList.toggle('is-active', !!t);
      var scrub = e.target.closest('[data-scrub]');
      el.classList.toggle('is-drag', !!scrub);
    });
    addEventListener('pointerdown', function () { el.classList.add('is-down'); });
    addEventListener('pointerup',   function () { el.classList.remove('is-down'); });
  }

  /* ============================================================
     2 — PAGE TRANSITION CURTAIN
     An ink panel wipes up over the old page, then away from the new
     one. Runs alongside the View Transitions morph.
     ============================================================ */
  function curtain() {
    if (REDUCED) return;
    var c = document.createElement('div');
    c.className = 'curtain';
    c.innerHTML = '<span class="curtain__mark">REWORN<i>.</i></span>';
    document.body.appendChild(c);

    /* On first paint the curtain is already hidden — it only ever covers
       during an outgoing navigation. */

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('mailto') || a.target === '_blank') return;
      if (document.startViewTransition) return;   /* the morph handles it */
      e.preventDefault();
      c.classList.add('is-covering');
      setTimeout(function () { location.href = href; }, 560);
    });
    addEventListener('pageshow', function () { c.classList.remove('is-covering'); });
  }

  /* ============================================================
     3 — OVERLAY NAVIGATION
     Full-screen ink panel, oversized serif list, staggered in.
     ============================================================ */
  function overlayNav() {
    var nav = document.querySelector('.nav');
    if (!nav || document.querySelector('.menu')) return;

    var btn = document.createElement('button');
    btn.className = 'menu__toggle micro';
    btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = '<span></span><span></span>';
    nav.appendChild(btn);

    var links = [['Index', 'index.html'], ['Collection', 'collection.html'],
                 ['About', 'about.html'], ['Contact', 'index.html#contact']];
    var m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML =
      '<div class="menu__inner">' +
        '<ul class="menu__list">' +
          links.map(function (l, i) {
            return '<li style="--i:' + i + '"><a href="' + l[1] + '"><span>' + l[0] + '</span></a></li>';
          }).join('') +
        '</ul>' +
        '<div class="menu__meta">' +
          '<p class="micro">Archive 01</p><p class="micro">21 pieces · one of each</p>' +
          '<p class="micro" style="margin-top:auto">WhatsApp +39 389 433 8878<br>rinshadmens@gmail.com</p>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);

    var open = false;
    var set = function (v) {
      open = v;
      m.classList.toggle('is-open', v);
      btn.classList.toggle('is-open', v);
      document.documentElement.style.overflow = v ? 'hidden' : '';
    };
    btn.addEventListener('click', function () { set(!open); });
    m.addEventListener('click', function (e) { if (e.target === m) set(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) set(false); });
  }

  /* ============================================================
     4 — HOVER IMAGE REVEAL
     A text list where hovering a row floats its image toward the
     cursor on a spring. Ported from the Originkit component.
     ============================================================ */
  function hoverReveal() {
    var list = document.querySelector('[data-reveal-list]');
    if (!list || !FINE || REDUCED) return;

    var figure = document.createElement('div');
    figure.className = 'reveal-img';
    list.appendChild(figure);
    var rows = [].slice.call(list.querySelectorAll('[data-reveal]'));
    rows.forEach(function (r) {
      var img = document.createElement('img');
      img.src = r.dataset.reveal; img.alt = ''; img.loading = 'lazy';
      figure.appendChild(img);
    });
    var imgs = figure.querySelectorAll('img');

    var tx = 0, ty = 0, cx = 0, cy = 0, vx = 0, vy = 0, active = -1;
    list.addEventListener('pointermove', function (e) {
      var r = list.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top;
    });
    rows.forEach(function (row, i) {
      row.addEventListener('pointerenter', function () {
        active = i;
        list.classList.add('is-hovering');
        rows.forEach(function (o, j) { o.classList.toggle('is-dim', j !== i); });
        imgs.forEach(function (im, j) { im.classList.toggle('is-on', j === i); });
      });
    });
    list.addEventListener('pointerleave', function () {
      active = -1;
      list.classList.remove('is-hovering');
      rows.forEach(function (o) { o.classList.remove('is-dim'); });
      imgs.forEach(function (im) { im.classList.remove('is-on'); });
    });

    /* critically-damped spring so it settles without wobble */
    (function loop() {
      var k = 0.12, d = 0.72;
      vx = (vx + (tx - cx) * k) * d; cx += vx;
      vy = (vy + (ty - cy) * k) * d; cy += vy;
      figure.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) translate(-50%,-50%)' +
        ' rotate(' + clamp(vx * 0.35, -9, 9) + 'deg)';
      requestAnimationFrame(loop);
    })();
  }

  /* ============================================================
     5 — WEBGL GRAIN SHADER
     A slow animated film-grain + warm wash over the hero. Real
     WebGL; silently does nothing if the context is unavailable.
     ============================================================ */
  function shader() {
    var host = document.querySelector('[data-shader]');
    if (!host || REDUCED) return;
    var cv = document.createElement('canvas');
    cv.className = 'shader';
    host.appendChild(cv);
    var gl = cv.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) { cv.remove(); return; }

    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs =
      'precision mediump float;uniform vec2 r;uniform float t;' +
      'float h(vec2 v){return fract(sin(dot(v,vec2(12.9898,78.233)))*43758.5453);}' +
      'float n(vec2 v){vec2 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);' +
      'return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}' +
      'void main(){vec2 uv=gl_FragCoord.xy/r;' +
      'float g=h(gl_FragCoord.xy+t*60.)*0.055;' +          /* film grain */
      'float w=n(uv*2.2+vec2(t*0.02,t*0.014))*0.10;' +      /* slow warm drift */
      'float v=smoothstep(1.25,0.15,distance(uv,vec2(0.5)));' + /* vignette */
      'vec3 c=vec3(0.949,0.945,0.918)*w;' +                 /* linen tint */
      'gl_FragColor=vec4(c+g,(g+w*0.85)*v);}';

    var sh = function (type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr); gl.useProgram(pr);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't');
    var size = function () {
      var d = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = host.offsetWidth * d; cv.height = host.offsetHeight * d;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(uR, cv.width, cv.height);
    };
    size(); addEventListener('resize', size);

    var run = true, t0 = performance.now();
    new IntersectionObserver(function (es) { run = es[0].isIntersecting; }).observe(host);
    (function draw() {
      if (run) {
        gl.uniform1f(uT, (performance.now() - t0) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      requestAnimationFrame(draw);
    })();
  }

  /* ============================================================
     6 — SVG DRAW-ON
     Any path inside [data-draw] strokes itself in when scrolled to.
     ============================================================ */
  function svgDraw() {
    var svgs = document.querySelectorAll('[data-draw]');
    if (!svgs.length) return;
    svgs.forEach(function (svg) {
      var paths = svg.querySelectorAll('path, line, circle, rect, polyline');
      paths.forEach(function (p, i) {
        var len = p.getTotalLength ? p.getTotalLength() : 400;
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = REDUCED ? 0 : len;
        p.style.transition = 'stroke-dashoffset 1.6s ' + EASE + ' ' + (i * 110) + 'ms';
      });
      new IntersectionObserver(function (es, o) {
        if (!es[0].isIntersecting) return;
        paths.forEach(function (p) { p.style.strokeDashoffset = 0; });
        o.disconnect();
      }, { threshold: 0.3 }).observe(svg);
    });
  }

  /* ============================================================
     7 — GRID STAGGER REVEAL
     Tiles rise and clip open in sequence as the grid enters view.
     ============================================================ */
  function gridReveal() {
    if (REDUCED) return;
    var io = new IntersectionObserver(function (es, o) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        [].slice.call(e.target.children).forEach(function (c, i) {
          c.style.transitionDelay = Math.min(i, 8) * 60 + 'ms';
          c.classList.add('tile-in');
        });
        var kids = [].slice.call(e.target.children);
        setTimeout(function () {
          kids.forEach(function (n) {
            if (getComputedStyle(n).opacity !== '1') {
              n.style.transition = 'none';
              n.style.opacity = '1';
              n.style.transform = 'none';
              n.style.clipPath = 'none';
            }
          });
        }, 1900);
        o.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8%' });
    document.querySelectorAll('.grid').forEach(function (g) {
      [].slice.call(g.children).forEach(function (c) { c.classList.add('tile'); });
      io.observe(g);
    });
  }

  /* ============================================================
     8 — MAGNETIC BUTTONS
     The pill leans toward the cursor, then springs back.
     ============================================================ */
  function magnetic() {
    if (!FINE || REDUCED) return;
    document.querySelectorAll('.btn, .menu__toggle').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.32;
        b.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      b.addEventListener('pointerleave', function () {
        b.style.transition = 'transform 700ms ' + EASE;
        b.style.transform = '';
        setTimeout(function () { b.style.transition = ''; }, 700);
      });
    });
  }

  /* ============================================================
     9 — SCROLL PARALLAX
     Images drift slower than the page. Transform only.
     ============================================================ */
  function parallax() {
    if (REDUCED) return;
    var items = [].slice.call(document.querySelectorAll('[data-parallax]'));
    if (!items.length) return;
    var tick = function () {
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        var mid = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        var amt = parseFloat(el.dataset.parallax) || 12;
        el.style.transform = 'translate3d(0,' + (-mid * amt).toFixed(2) + '%,0) scale(1.06)';
      });
    };
    addEventListener('scroll', tick, { passive: true });
    addEventListener('resize', tick); tick();
  }

  /* ============================================================
     10 — SPLIT-TEXT HERO REVEAL
     Each line masked, rising on its own delay.
     ============================================================ */
  function splitText() {
    document.querySelectorAll('[data-split]').forEach(function (el) {
      var html = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = html.map(function (line, i) {
        return '<span class="line"><span class="line__in" style="--d:' +
               (i * 110 + 120) + 'ms">' + line + '</span></span>';
      }).join('');
      requestAnimationFrame(function () { el.classList.add('is-in'); });
      /* A transition can stall (throttled tab, backgrounded window) and leave
         the headline masked forever. Guarantee the end state. */
      var lines = el.querySelectorAll('.line__in');
      setTimeout(function () {
        lines.forEach(function (n) {
          if (getComputedStyle(n).transform !== 'none') {
            n.style.transition = 'none';
            n.style.transform = 'none';
          }
        });
      }, 1700);
    });
  }

  /* ============================================================
     11 — MARQUEE VELOCITY
     Scrolling faster speeds the marquee and skews it slightly.
     ============================================================ */
  function marqueeVelocity() {
    var track = document.querySelector('.marquee__track');
    if (!track || REDUCED) return;
    var last = scrollY, v = 0;
    addEventListener('scroll', function () {
      v = clamp((scrollY - last) * 0.35, -14, 14); last = scrollY;
    }, { passive: true });
    (function loop() {
      v *= 0.92;
      track.style.transform = 'skewX(' + (-v * 0.22).toFixed(2) + 'deg)';
      requestAnimationFrame(loop);
    })();
  }

  /* ============================================================
     12 — COUNT-UP NUMERALS
     The stat bar counts to its value once, on entry.
     ============================================================ */
  function countUp() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var to = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '';
      new IntersectionObserver(function (es, o) {
        if (!es[0].isIntersecting) return;
        o.disconnect();
        if (REDUCED) { el.textContent = to + suffix; return; }
        var t0 = performance.now(), dur = 1200;
        (function step(now) {
          var p = clamp((now - t0) / dur, 0, 1);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * e) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      }, { threshold: 0.6 }).observe(el);
    });
  }

  /* ============================================================
     13 — EDITORIAL SLIDER
     Drag-scrollable horizontal rail with momentum and a progress
     rule. (Reference slider 1 — the restrained one.)
     ============================================================ */
  function slider() {
    document.querySelectorAll('[data-slider]').forEach(function (rail) {
      var bar = rail.parentElement.querySelector('.rail__bar i');
      var down = false, sx = 0, sl = 0;
      rail.addEventListener('pointerdown', function (e) {
        down = true; sx = e.clientX; sl = rail.scrollLeft;
        rail.setPointerCapture(e.pointerId); rail.classList.add('is-drag');
      });
      rail.addEventListener('pointermove', function (e) {
        if (!down) return;
        rail.scrollLeft = sl - (e.clientX - sx);
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) {
        rail.addEventListener(ev, function () { down = false; rail.classList.remove('is-drag'); });
      });
      var prog = function () {
        if (!bar) return;
        var max = rail.scrollWidth - rail.clientWidth;
        bar.style.transform = 'scaleX(' + (max > 0 ? rail.scrollLeft / max : 0) + ')';
      };
      rail.addEventListener('scroll', prog, { passive: true }); prog();
    });
  }

  /* ---------- boot ---------- */
  function init() {
    cursor(); curtain(); overlayNav(); hoverReveal(); shader();
    svgDraw(); gridReveal(); magnetic(); parallax(); splitText();
    marqueeVelocity(); countUp(); slider();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
