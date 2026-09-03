/* ============================================================
   HERO — port of the "hero animation" reference script.
   Timeline, easing curves and Flip handoff are the reference's;
   the images and copy are built from catalog.js.
   ============================================================ */
(function () {
  'use strict';

  var stage = document.querySelector('.hero-stage-wrap');
  if (!stage || !window.gsap) return;

  var D = window.REWORN || {};
  var M = D.motion || {};
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(Flip, CustomEase);

  CustomEase.create('hop',  'M0,0 C0.355,0.022 0.448,0.079 0.5,0.5 0.542,0.846 0.615,1 1,1');
  CustomEase.create('hop2', 'M0,0 C0.078,0.617 0.114,0.716 0.255,0.828 0.373,0.922 0.561,1 1,1');

  /* ---------- build the image sequence from the archive ---------- */
  var shots = (M.heroSequence || []).slice(0, 8);
  var wrap  = stage.querySelector('.images');

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                          .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  if (wrap && shots.length) {
    wrap.innerHTML = shots.map(function (s, i) {
      /* the last three survive the sequence and become the stack */
      var main = i >= shots.length - 3 ? ' main' : '';
      /* every frame is on screen within ~3s, so none of them are lazy —
         a lazy frame decodes mid-animation and shows as a blur */
      return '<figure class="img' + main + '"><img src="' + esc(s.src) +
             '" alt="' + esc(s.alt) + '" decoding="async"' +
             (i === 0 ? ' fetchpriority="high"' : '') + '></figure>';
    }).join('');
  }

  /* The ambient frame is decorative, so it is painted as a background and
     never enters the accessibility tree. It is also set from JS rather than
     CSS so it is not fetched at all when the sequence never runs. */
  var amb = stage.querySelector('.hero-amb');
  if (amb && M.heroAmbient) amb.style.backgroundImage = 'url("' + M.heroAmbient + '")';

  if (REDUCED) {
    stage.classList.add('hero-lit');
    gsap.set('.img', { opacity: 1, scale: 1 });
    gsap.set('.word h1, .nav-item p, .nav-item a, .line p, .site-info h2 .line span', { y: 0 });
    gsap.set('.team-img', { clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)' });
    var rv = document.querySelector('.revealers'); if (rv) rv.style.display = 'none';
    return;
  }

  /* The revealers stay shut until every hero frame has actually decoded.
     Starting the timeline earlier is what caused the first seconds to look
     blurry: the browser was still progressively decoding full-size JPEGs
     while they were already on screen at scale(1.5). */
  /* Only the frames that are actually on screen in the first beat are worth
     blocking on. Waiting for all eight meant a visitor on a slow connection
     stared at a shut curtain until the 2.5s timeout fired and then watched
     the whole sequence stutter in. The later frames get a ~1s head start
     from the earlier ones' airtime, which is all they need. */
  var GATE = 3;

  function framesReady() {
    var imgs = [].slice.call(wrap ? wrap.querySelectorAll('img') : []).slice(0, GATE);
    if (!imgs.length) return Promise.resolve();
    return Promise.all(imgs.map(function (img) {
      if (img.decode) {
        return img.decode().catch(function () {});   // decode() rejects on some GIF/SVG
      }
      if (img.complete) return Promise.resolve();
      return new Promise(function (res) {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      });
    }));
  }

  /* ---------- split the statement into masked lines ---------- */
  if (window.SplitType) {
    var splitH2 = new SplitType('.site-info h2', { types: 'lines' });
    splitH2.lines.forEach(function (line) {
      var text = line.textContent;
      var wrapper = document.createElement('div');
      wrapper.className = 'line';
      var span = document.createElement('span');
      span.textContent = text;
      wrapper.appendChild(span);
      line.parentNode.replaceChild(wrapper, line);
    });
  }

  var mainTl    = gsap.timeline({ paused: true });
  var revealerTl = gsap.timeline();
  var scaleTl    = gsap.timeline();

  revealerTl
    .to('.r-1', {
      clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
      duration: 1.5, ease: 'hop'
    })
    .to('.r-2', {
      clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
      duration: 1.5, ease: 'hop'
    }, '<');

  scaleTl.to('.img:first-child', { scale: 1, duration: 2, ease: 'power4.inOut' });

  var images = document.querySelectorAll('.img:not(:first-child)');
  images.forEach(function (img) {
    scaleTl.to(img, {
      opacity: 1, scale: 1, duration: 1.25, ease: 'power3.out'
    }, '>-0.95');
  });

  mainTl
    .add(revealerTl)
    .add(scaleTl, '-=1.25')
    .add(function () {
      /* the full-bleed frames are leaving, so the ambient plate comes up
         behind the copy — without it the ground is simply empty */
      stage.classList.add('hero-lit');
      document.querySelectorAll('.img:not(.main)').forEach(function (img) { img.remove(); });

      var state = Flip.getState('.main');
      var imagesContainer = document.querySelector('.images');
      imagesContainer.classList.add('stacked-container');

      document.querySelectorAll('.main').forEach(function (img, i) {
        img.classList.add('stacked');
        img.style.order = i;
        gsap.set('.img.stacked', { clearProps: 'transform,top,left' });
      });

      return Flip.from(state, {
        duration: 2, ease: 'hop', absolute: true,
        stagger: { amount: -0.3 }
      });
    })
    .to('.word h1, .nav-item p, .nav-item a, .line p, .site-info h2 .line span', {
      y: 0, duration: 3, ease: 'hop2', stagger: 0.1, delay: 1.25
    })
    .to('.team-img', {
      clipPath: 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)',
      duration: 2, ease: 'hop', delay: -4.75
    });

  /* Start once the frames are decoded, but never wait forever on a slow
     connection — after 2.5s the reveal runs regardless. */
  var started = false;
  var start = function () {
    if (started) return;
    started = true;
    mainTl.play();
  };
  framesReady().then(start);
  setTimeout(start, 2500);

  /* Failsafe on a real timer — gsap.delayedCall shares the throttled
     rAF ticker, so it would stall exactly when the rescue is needed. */
  setTimeout(function () {
    stage.classList.add('hero-lit');
    var stacked = document.querySelector('.images.stacked-container');
    if (!stacked) {
      document.querySelectorAll('.img:not(.main)').forEach(function (n) { n.remove(); });
      var c = document.querySelector('.images');
      if (c) c.classList.add('stacked-container');
      document.querySelectorAll('.main').forEach(function (n, i) {
        n.classList.add('stacked');
        n.style.order = i;
        n.removeAttribute('style');
        n.classList.add('stacked');
        n.style.order = i;
      });
    }
    document.querySelectorAll('.main').forEach(function (n) {
      n.style.opacity = '1';
    });
    document.querySelectorAll('.word h1, .nav-item p, .nav-item a, .line p, .site-info h2 .line span')
      .forEach(function (n) { n.style.transform = 'none'; });
    var t = document.querySelector('.team-img');
    if (t) t.style.clipPath = 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)';
    document.querySelectorAll('.revealer').forEach(function (n) {
      n.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';
    });
  }, 9000);
})();
