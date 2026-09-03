/* ============================================================
   SEQUENCE — port of the "scroll animation" reference script.
   Marquee drift, cloned pin image, Flip to fullscreen, colour
   interpolation and horizontal travel are all the reference's.
   ============================================================ */
(function () {
  'use strict';

  var section = document.querySelector('.seq-container');
  if (!section || !window.gsap) return;

  var D = window.REWORN || {};
  var M = D.motion || {};
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger, Flip);

  /* ---------- build marquee + slides from the archive ---------- */
  var track = section.querySelector('.marquee-images');
  var shots = M.marquee || [];
  if (track && shots.length) {
    /* The reference pins the 7th of 13. Ours is centred the same way so the
       clone is on screen when the section reaches the top. */
    var pinIndex = Math.floor(shots.length / 2);
    track.innerHTML = shots.map(function (s, i) {
      return '<div class="marquee-img' + (i === pinIndex ? ' pin' : '') + '">' +
               '<img src="' + s.src + '" alt="" loading="lazy">' +
             '</div>';
    }).join('');
  }

  var wrapper = section.querySelector('.horizontal-scroll-wrapper');
  var panels  = M.horizontal || [];
  if (wrapper && panels.length) {
    wrapper.innerHTML =
      '<div class="horizontal-slide horizontal-spacer"></div>' +
      panels.slice(0, 2).map(function (p) {
        return '<div class="horizontal-slide">' +
                 '<div class="col"><h3>' +
                   '<span class="brand">' + p.brand + '</span>' + p.story +
                   '<span class="meta"><a href="product.html?id=' + p.id + '">' +
                     p.name + ' — ₹' + Number(p.price).toLocaleString('en-IN') + ' →</a></span>' +
                 '</h3></div>' +
                 '<div class="col"><img src="' + p.src + '" alt="' + p.name + '" loading="lazy"></div>' +
               '</div>';
      }).join('');
  }

  /* Phones and reduced motion: no pinning, no fixed clone — the sections
     simply scroll. Nothing that can trap the page on a small screen. */
  if (REDUCED || !matchMedia('(min-width: 1000px)').matches) {
    var h = section.querySelector('.horizontal-scroll');
    if (h) {
      h.style.height = 'auto';
      var w = h.querySelector('.horizontal-scroll-wrapper');
      if (w) {
        w.style.width = '100%';
        w.style.height = 'auto';
        w.style.flexDirection = 'column';
      }
      var sp = h.querySelector('.horizontal-spacer');
      if (sp) sp.remove();
    }
    return;
  }

  var lightColor = getComputedStyle(document.documentElement).getPropertyValue('--linen').trim();
  var darkColor  = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();

  function interpolateColor(color1, color2, factor) {
    return gsap.utils.interpolate(color1, color2, factor);
  }

  gsap.to('.marquee-images', {
    scrollTrigger: {
      trigger: '.marquee-sec',
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      onUpdate: function (self) {
        var xPosition = -75 + self.progress * 25;
        gsap.set('.marquee-images', { x: xPosition + '%' });
      }
    }
  });

  var pinnedMarqueeImgClone = null;
  var isImgCloneActive = false;

  function createPinnedMarqueeImgClone() {
    if (isImgCloneActive) return;

    var originalMarqueeImg = document.querySelector('.marquee-img.pin img');
    if (!originalMarqueeImg) return;
    var rect = originalMarqueeImg.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;

    pinnedMarqueeImgClone = originalMarqueeImg.cloneNode(true);
    pinnedMarqueeImgClone.className = 'seq-clone';

    gsap.set(pinnedMarqueeImgClone, {
      position: 'fixed',
      left: centerX - originalMarqueeImg.offsetWidth / 2,
      top: centerY - originalMarqueeImg.offsetHeight / 2,
      width: originalMarqueeImg.offsetWidth,
      height: originalMarqueeImg.offsetHeight,
      objectFit: 'cover',
      transform: 'rotate(-5deg)',
      transformOrigin: 'center center',
      pointerEvents: 'none',
      willChange: 'transform',
      zIndex: 100
    });

    document.body.appendChild(pinnedMarqueeImgClone);
    gsap.set(originalMarqueeImg, { opacity: 0 });
    isImgCloneActive = true;
  }

  function removePinnedMarqueeImgClone() {
    if (!isImgCloneActive) return;
    if (pinnedMarqueeImgClone) {
      pinnedMarqueeImgClone.remove();
      pinnedMarqueeImgClone = null;
    }
    var originalMarqueeImg = document.querySelector('.marquee-img.pin img');
    if (originalMarqueeImg) gsap.set(originalMarqueeImg, { opacity: 1 });
    isImgCloneActive = false;
  }

  ScrollTrigger.create({
    trigger: '.horizontal-scroll',
    start: 'top top',
    end: function () { return '+=' + window.innerHeight * 5; },
    pin: true
  });

  ScrollTrigger.create({
    trigger: '.marquee-sec',
    start: 'top top',
    onEnter: createPinnedMarqueeImgClone,
    onEnterBack: createPinnedMarqueeImgClone,
    onLeaveBack: removePinnedMarqueeImgClone
  });

  var flipAnimation = null;

  ScrollTrigger.create({
    trigger: '.horizontal-scroll',
    start: 'top 50%',
    end: function () { return '+=' + window.innerHeight * 5.5; },
    onEnter: function () {
      if (pinnedMarqueeImgClone && isImgCloneActive && !flipAnimation) {
        var state = Flip.getState(pinnedMarqueeImgClone);

        gsap.set(pinnedMarqueeImgClone, {
          position: 'fixed',
          left: 0, top: 0,
          width: '100%', height: '100svh',
          transform: 'rotate(0deg)',
          transformOrigin: 'center center'
        });

        flipAnimation = Flip.from(state, { duration: 1, ease: 'none', paused: true });
      }
    },
    onLeaveBack: function () {
      if (flipAnimation) { flipAnimation.kill(); flipAnimation = null; }
      gsap.set('.seq-container', { backgroundColor: lightColor });
      gsap.set('.horizontal-scroll-wrapper', { x: '0%' });
    }
  });

  ScrollTrigger.create({
    trigger: '.horizontal-scroll',
    start: 'top 50%',
    end: function () { return '+=' + window.innerHeight * 5.5; },
    onUpdate: function (self) {
      var progress = self.progress;

      if (progress <= 0.05) {
        var bgColorProgress = Math.min(progress / 0.05, 1);
        gsap.set('.seq-container', {
          backgroundColor: interpolateColor(lightColor, darkColor, bgColorProgress)
        });
      } else {
        gsap.set('.seq-container', { backgroundColor: darkColor });
      }

      if (progress <= 0.2 && flipAnimation) {
        flipAnimation.progress(progress / 0.2);
      }

      if (progress > 0.2 && progress <= 0.95) {
        if (flipAnimation) flipAnimation.progress(1);

        var horizontalProgress = (progress - 0.2) / 0.75;
        gsap.set('.horizontal-scroll-wrapper', {
          x: (-66.67 * horizontalProgress) + '%'
        });

        var imageTranslateX = -((66.67 / 100) * 3 * horizontalProgress) * 100;
        if (pinnedMarqueeImgClone) gsap.set(pinnedMarqueeImgClone, { x: imageTranslateX + '%' });
      }

      if (progress > 0.95) {
        if (flipAnimation) flipAnimation.progress(1);
        if (pinnedMarqueeImgClone) gsap.set(pinnedMarqueeImgClone, { x: '-200%' });
        gsap.set('.horizontal-scroll-wrapper', { x: '-66.67%' });
      }
    }
  });

  /* A restored tab can otherwise leave the clone stranded over the page. */
  window.addEventListener('pagehide', removePinnedMarqueeImgClone);
})();
