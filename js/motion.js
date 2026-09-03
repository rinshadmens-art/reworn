/* ============================================================
   REWORN. — motion layer (GSAP 3.14)

   Five techniques adapted from the reference set, plus the cursor
   kept from the previous layer:
     0 hairline cursor
     1 intro revealers + Flip hero stack      (hero animation)
     2 marquee → pinned Flip → horizontal     (scroll animation)
     3 category folder fan-out                (hover)
     4 fullscreen overlay menu + SplitText    (navigation menus)
     5 directional clip-path grid reveal      (HoverGrid)

   Two rules this file obeys:
   - Nothing is hidden by CSS. Every "from" state is set here at
     runtime, so a JS failure leaves the page fully readable.
   - Anything that pins or runs a timeline is desktop-only. Phones
     get the same content as ordinary, fast scroll.
   ============================================================ */
(function () {
  'use strict';

  var D = window.REWORN;
  if (!D || !window.gsap) return;

  var M = D.motion || {};
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DESKTOP = matchMedia('(min-width: 900px)').matches;
  var HOVERS  = matchMedia('(hover: hover)').matches;

  gsap.registerPlugin(ScrollTrigger, Flip, CustomEase, SplitText);

  /* The reference set's signature easing — slow in, decisive out. */
  CustomEase.create('hop',  'M0,0 C0.355,0.022 0.448,0.079 0.5,0.5 0.542,0.846 0.615,1 1,1');
  CustomEase.create('hop2', 'M0,0 C0.078,0.617 0.114,0.716 0.255,0.828 0.373,0.922 0.561,1 1,1');

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var inr = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };

  /* ============================================================
     Smooth scroll (Lenis) — drives ScrollTrigger so pinning stays
     in sync. Off for reduced motion and on phones, where native
     momentum scrolling beats anything JS can do.
     ============================================================ */
  function initScroll() {
    if (REDUCED || !DESKTOP || !window.Lenis) return;
    var lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  /* ============================================================
     0 · Cursor — a hairline ring that trails the pointer and
     swells over anything clickable.
     ============================================================ */
  function initCursor() {
    if (!HOVERS || REDUCED || !DESKTOP) return;
    var ring = document.createElement('div');
    ring.className = 'cursor';
    document.body.appendChild(ring);

    var x = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    var y = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });

    window.addEventListener('mousemove', function (e) { x(e.clientX); y(e.clientY); });
    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest('a, button, .card, .folder');
      ring.classList.toggle('is-hot', !!hot);
    });
  }

  /* ============================================================
     1 · Hero — revealers wipe away, images scale in, then Flip
     collapses the survivors into a centred stack.
     ============================================================ */
  function initHero() {
    var stage = $('.hero-stage');
    if (!stage) return;

    var wrap  = $('.hero-stage__images', stage);
    var shots = (M.heroStack || []).slice(0, 7);
    if (!wrap || !shots.length) return;

    /* Deterministic scatter — a designed composition, not random. */
    var LAYOUT = [
      { x: -128, y: -18, r: -8 }, { x: 122, y: -32, r: 7 },
      { x:  -74, y:  34, r:  5 }, { x:  86, y:  40, r: -6 },
      { x:  -14, y: -46, r:  3 },
      { x:  -34, y:   6, r:  0 }, { x:  34, y:   6, r:  0 }
    ];

    wrap.innerHTML = shots.map(function (s, i) {
      var kept = i >= shots.length - 3;   /* the last three survive */
      return '<figure class="hero-stage__img' + (kept ? ' is-kept' : '') + '">' +
               '<img src="' + esc(s.src) + '" alt="' + esc(s.brand + ' ' + s.name) + '">' +
             '</figure>';
    }).join('');

    var imgs  = $$('.hero-stage__img', wrap);
    var kept  = $$('.hero-stage__img.is-kept', wrap);
    var lines = $$('.mask > *', stage);

    if (REDUCED) {
      wrap.classList.add('is-stacked');
      imgs.forEach(function (n) {
        n.classList.contains('is-kept') ? n.classList.add('is-settled') : n.remove();
      });
      return;
    }

    imgs.forEach(function (n, i) {
      var L = LAYOUT[i] || LAYOUT[0];
      gsap.set(n, { xPercent: L.x, yPercent: L.y, rotate: L.r, scale: 0.86, opacity: 0 });
    });
    gsap.set(lines, { yPercent: 110 });
    gsap.set('.revealer', { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' });

    /* Flip writes inline position/width/height while absolute:true. Strip
       them or the stack keeps the scattered geometry forever. */
    function settle() {
      wrap.classList.add('is-stacked');
      kept.forEach(function (n) {
        n.removeAttribute('style');
        n.classList.add('is-settled');
      });
    }

    gsap.timeline({ defaults: { ease: 'hop' } })
      .to('.r-1', { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', duration: 1.4 })
      .to('.r-2', { clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)', duration: 1.4 }, '<')
      .to(imgs, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out', stagger: 0.075 }, '-=1.0')
      .add(function () {
        imgs.forEach(function (n) { if (!n.classList.contains('is-kept')) n.remove(); });
        var state = Flip.getState(kept);
        wrap.classList.add('is-stacked');
        gsap.set(kept, { clearProps: 'transform' });
        return Flip.from(state, {
          duration: 1.5, ease: 'hop', absolute: true, stagger: { amount: -0.22 },
          onComplete: settle
        });
      })
      .to(lines, { yPercent: 0, duration: 1.5, ease: 'hop2', stagger: 0.07 }, '-=1.05');

    /* Failsafe on a real timer, NOT gsap.delayedCall: delayedCall rides the
       same requestAnimationFrame ticker as the timeline, so a throttled or
       backgrounded tab stalls the rescue exactly when it is needed. */
    setTimeout(function () {
      if (kept.length && kept[0].classList.contains('is-settled')) return;
      settle();
      lines.forEach(function (n) { n.style.transform = 'none'; });
      $$('.revealer').forEach(function (n) {
        n.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';
      });
    }, 7000);
  }

  /* ============================================================
     2 · Scroll sequence — the marquee drifts, one frame detaches
     and Flips to fullscreen, then the rail travels sideways while
     the ground turns to ink.
     ============================================================ */
  function initSequence() {
    var seq = $('.seq');
    if (!seq) return;

    var track  = $('.seq__track', seq);
    var rail   = $('.seq__rail', seq);
    var horiz  = $('.seq__horizontal', seq);
    var shots  = M.marquee || [];
    var panels = M.horizontal || [];
    if (!track || !shots.length) { seq.remove(); return; }

    track.innerHTML = shots.map(function (s) {
      return '<figure class="seq__shot' + (s.pin ? ' is-pin' : '') + '">' +
               '<img src="' + esc(s.src) + '" alt="' + esc(s.brand + ' ' + s.name) +
               '" loading="lazy">' +
             '</figure>';
    }).join('');

    if (rail) {
      rail.innerHTML =
        '<div class="seq__panel seq__panel--spacer"></div>' +
        panels.slice(0, 2).map(function (p) {
          return '<div class="seq__panel"><div class="seq__panel-inner">' +
                   '<p class="micro" style="color:var(--signal)">' + esc(p.brand) + '</p>' +
                   '<h3>' + esc(p.name) + '</h3>' +
                   '<p>' + esc(p.story) + '</p>' +
                   '<a class="price" href="product.html?id=' + esc(p.id) + '">' +
                     inr(p.price) + ' — see the piece →</a>' +
                 '</div></div>';
        }).join('');
    }

    /* Phones and reduced motion get a plain scrolling strip: no pin,
       no fixed plate, nothing that can trap the page. */
    if (!DESKTOP || REDUCED) { horiz && horiz.remove(); return; }

    var css   = getComputedStyle(document.documentElement);
    var ink   = css.getPropertyValue('--ink').trim();
    var linen = css.getPropertyValue('--linen').trim();

    gsap.fromTo(track, { xPercent: -8 }, {
      xPercent: -46, ease: 'none',
      scrollTrigger: { trigger: seq, start: 'top bottom', end: 'top top', scrub: true }
    });

    /* The reference clones the marquee frame at its live position. That
       only works when the strip is stationary — ours has already scrolled
       the frame off-screen by the time the section is reached, so the
       clone lands outside the viewport. A dedicated plate that starts
       centred is deterministic at any width and cannot be orphaned. */
    var pin = (shots.filter(function (s) { return s.pin; })[0]) || shots[0];
    var plate = document.createElement('figure');
    plate.className = 'seq__plate';
    plate.innerHTML = '<img src="' + esc(pin.src) + '" alt="' + esc(pin.brand + ' ' + pin.name) + '">';
    plate.setAttribute('aria-hidden', 'true');
    horiz.insertBefore(plate, horiz.firstChild);

    /* The plate is always full-bleed; it *appears* small because a
       centred clip-path masks it down. Opening the mask is the growth.
       No width/height/position animation means nothing to go stale. */
    function maskAt(t) {
      var box = Math.min(340, Math.max(220, window.innerWidth * 0.22));
      var h = box * 4 / 3;
      var x = Math.max(0, (100 - (box / window.innerWidth) * 100) / 2);
      var y = Math.max(0, (100 - (h / window.innerHeight) * 100) / 2);
      return 'inset(' + (y * (1 - t)) + '% ' + (x * (1 - t)) + '% ' +
                        (y * (1 - t)) + '% ' + (x * (1 - t)) + '%)';
    }

    gsap.set(plate, { clipPath: maskAt(0) });

    ScrollTrigger.create({
      trigger: horiz,
      start: 'top top',
      end: function () { return '+=' + window.innerHeight * 4; },
      pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      onRefresh: function () { gsap.set(plate, { clipPath: maskAt(0) }); },
      onLeaveBack: function () {
        gsap.set(plate, { clipPath: maskAt(0), xPercent: 0 });
        gsap.set(horiz, { backgroundColor: linen });
        gsap.set(rail, { xPercent: 0 });
      },
      onUpdate: function (self) {
        var p = self.progress;

        gsap.set(horiz, {
          backgroundColor: p <= 0.06
            ? gsap.utils.interpolate(linen, ink, Math.min(p / 0.06, 1))
            : ink
        });

        if (p <= 0.3) {
          gsap.set(plate, { clipPath: maskAt(p / 0.3), xPercent: 0 });
        } else {
          var hp = Math.min((p - 0.3) / 0.65, 1);
          /* the plate clears the screen in the first half of the travel so
             it never sits on top of the panel copy arriving behind it */
          gsap.set(plate, { clipPath: maskAt(1), xPercent: -110 * Math.min(hp / 0.45, 1) });
          gsap.set(rail, { xPercent: -66.667 * hp });
        }
      }
    });
  }

  /* ============================================================
     3 · Category folders — three frames fan out on hover and the
     siblings dim. Pointer devices only.
     ============================================================ */
  function initFolders() {
    var host = $('.folders');
    if (!host) return;

    var cats = (M.categories || []).filter(function (c) { return c.shots.length; });
    if (!cats.length) { host.remove(); return; }

    host.innerHTML = cats.map(function (c, i) {
      return '<a class="folder" href="collection.html?c=' + esc(c.key) + '">' +
               '<span class="folder__preview">' +
                 c.shots.map(function (s) {
                   return '<span class="folder__shot"><img src="' + esc(s) +
                          '" alt="" loading="lazy"></span>';
                 }).join('') +
               '</span>' +
               '<span class="folder__body">' +
                 '<span class="micro faint">' + String(i + 1).padStart(2, '0') + '</span>' +
                 '<span class="folder__name">' + esc(c.label) + '</span>' +
                 '<span class="folder__count">' + c.count + ' pieces</span>' +
               '</span>' +
             '</a>';
    }).join('');

    if (REDUCED || !HOVERS) return;

    var folders = $$('.folder', host);

    folders.forEach(function (folder) {
      var shots = $$('.folder__shot', folder);
      var body  = $('.folder__body', folder);
      gsap.set(shots, { yPercent: 115, rotate: 0 });
      gsap.set(body, { y: 18 });

      folder.addEventListener('mouseenter', function () {
        folders.forEach(function (f) { if (f !== folder) f.classList.add('is-dimmed'); });
        gsap.to(body, { y: 0, duration: 0.3, ease: 'back.out(1.7)' });
        shots.forEach(function (s, i) {
          gsap.to(s, {
            yPercent: 0, rotate: i === 0 ? -13 : i === 1 ? 2 : 14,
            duration: 0.4, ease: 'back.out(1.6)', delay: i * 0.04
          });
        });
      });

      folder.addEventListener('mouseleave', function () {
        folders.forEach(function (f) { f.classList.remove('is-dimmed'); });
        gsap.to(body, { y: 18, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(shots, { yPercent: 115, rotate: 0, duration: 0.3, ease: 'power2.in', stagger: 0.03 });
      });
    });
  }

  /* ============================================================
     4 · Overlay menu — page drops away, ink panel wipes in, links
     reveal line by line.
     ============================================================ */
  function initMenu() {
    var toggle  = $('.menu-toggle');
    var overlay = $('.menu-overlay');
    if (!toggle || !overlay) return;

    var page  = $('.page-shell');
    var links = $$('.menu-links a', overlay);
    var metas = $$('.menu-meta p, .menu-meta a', overlay);
    var label = $('.menu-toggle__label span', toggle);
    var open = false, busy = false;

    var lines = links.concat(metas).reduce(function (acc, el) {
      return acc.concat(SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line'
      }).lines);
    }, []);

    function lock(on) {
      document.documentElement.classList.toggle('no-scroll', on);
      document.body.classList.toggle('no-scroll', on);
      if (window.__lenis) { on ? window.__lenis.stop() : window.__lenis.start(); }
    }

    /* The open/closed state is a CLASS, applied synchronously, with the
       final geometry in CSS. GSAP only decorates the change. If the
       timeline stalls — throttled tab, low-power mode — the menu is still
       correctly open or closed and the page is never left scroll-locked
       behind an invisible overlay. */
    function run() {
      if (busy) return;
      busy = true;
      open = !open;

      overlay.classList.toggle('is-open', open);
      document.body.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      lock(open);

      var done = function () {
        busy = false;
        /* Hand control back to CSS. A stalled tween leaves its "from"
           value inline, which would otherwise outrank .is-open and pin
           the overlay shut with the page still locked. */
        gsap.set(overlay, { clearProps: 'clipPath' });
        gsap.set(lines, { clearProps: 'transform' });
        if (page && !open) gsap.set(page, { clearProps: 'transform,opacity' });
      };
      /* real timer, independent of the GSAP ticker */
      var guard = setTimeout(done, 1600);

      var tl = gsap.timeline({
        defaults: { ease: 'hop', duration: 0.9 },
        onComplete: function () { clearTimeout(guard); done(); }
      });

      if (open) {
        tl.fromTo(overlay,
            { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' },
            { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' })
          .fromTo(lines, { yPercent: 110 },
            { yPercent: 0, duration: 1, stagger: 0.045, ease: 'hop2' }, '-=0.45');
        if (page)  tl.to(page, { y: '14svh', opacity: 0.3 }, 0);
        if (label) tl.to(label, { yPercent: -100, duration: 0.4, ease: 'power2.out' }, 0);
      } else {
        tl.to(lines, { yPercent: 110, duration: 0.4, stagger: 0.02, ease: 'power2.in' })
          .fromTo(overlay,
            { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
            { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)' }, '-=0.15');
        if (page)  tl.to(page, { y: 0, opacity: 1 }, 0);
        if (label) tl.to(label, { yPercent: 0, duration: 0.4, ease: 'power2.out' }, 0);
      }
    }

    toggle.addEventListener('click', run);

    /* A fullscreen overlay with no keyboard exit is a trap. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { busy = false; run(); }
    });
  }

  /* ============================================================
     5 · Grid — cards reveal with a directional clip-path.
     Supersedes the IntersectionObserver that lived in app.js.
     ============================================================ */
  var DIRS = [
    'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',        /* from bottom */
    'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',        /* from right  */
    'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' /* from left   */
  ];
  var FULL = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

  /* Deliberately NOT GSAP. Whether a product is visible is the one thing
     that must never depend on an animation ticker: a throttled tab, a
     backgrounded window or low-power mode would otherwise leave the
     archive blank. IntersectionObserver fires from the browser, the
     transition is plain CSS, and the direction is the only thing the
     reference technique actually contributes. */
  function revealCards(scope) {
    var cards = $$('.card', scope || document).filter(function (c) { return !c.__lit; });
    if (!cards.length) return;

    cards.forEach(function (card, i) {
      card.__lit = true;
      card.style.setProperty('--from', DIRS[i % 3]);
      if (!REDUCED) card.classList.add('is-clipped');
    });

    if (REDUCED || !('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.remove('is-clipped'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('is-clipped');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    cards.forEach(function (c) { io.observe(c); });

    /* IntersectionObserver and requestAnimationFrame are both throttled in
       backgrounded or low-power tabs. Native scroll events are not, and
       neither is setTimeout — so sweep on both. Whatever else fails, a
       shopper never faces an empty grid. */
    var sweep = function () {
      var left = 0;
      cards.forEach(function (c) {
        if (!c.classList.contains('is-clipped')) return;
        var r = c.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) c.classList.remove('is-clipped');
        else left++;
      });
      if (!left) window.removeEventListener('scroll', sweep);
    };
    window.addEventListener('scroll', sweep, { passive: true });
    setTimeout(sweep, 400);
    setTimeout(sweep, 1500);
  }

  /* app.js re-renders grids on filter change and fires this. */
  window.addEventListener('reworn:grid', function (e) {
    revealCards(e.detail || document);
    ScrollTrigger.refresh();
  });

  /* ============================================================
     Small handlers the existing markup still relies on:
     [data-draw] rules, [data-count] numerals, [data-parallax] images.
     ============================================================ */
  function initDetails() {
    $$('[data-draw] line, [data-draw] circle, [data-draw] path').forEach(function (n) {
      var len = n.getTotalLength ? n.getTotalLength() : 0;
      if (!len || REDUCED) return;
      gsap.set(n, { strokeDasharray: len, strokeDashoffset: len });
      ScrollTrigger.create({
        trigger: n.closest('[data-draw]'), start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(n, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' });
        }
      });
    });

    $$('[data-count]').forEach(function (el) {
      var target = parseFloat(el.dataset.count) || 0;
      var suffix = el.dataset.suffix || '';
      if (REDUCED) { el.textContent = target + suffix; return; }
      var obj = { v: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: function () {
          gsap.to(obj, {
            v: target, duration: 1.6, ease: 'power2.out',
            onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
          });
        }
      });
      setTimeout(function () { el.textContent = target + suffix; }, 4000);
    });

    if (REDUCED || !DESKTOP) return;
    $$('[data-parallax]').forEach(function (el) {
      var amt = parseFloat(el.dataset.parallax) || 8;
      gsap.fromTo(el, { yPercent: -amt / 2 }, {
        yPercent: amt / 2, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* section headings and copy blocks */
  function initCopy() {
    var els = $$('.reveal');
    if (!els.length || REDUCED) return;
    els.forEach(function (el) {
      gsap.set(el, { opacity: 0, y: 18 });
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' });
        }
      });
    });
    setTimeout(function () {
      els.forEach(function (el) {
        if (el.getBoundingClientRect().top > window.innerHeight * 1.2) return;
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }, 4500);
  }

  /* ---------- boot ---------- */
  function boot() {
    initScroll();
    initCursor();
    initHero();
    initSequence();
    initFolders();
    initMenu();
    initDetails();
    initCopy();
    revealCards();
    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Late images move every trigger position. */
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
