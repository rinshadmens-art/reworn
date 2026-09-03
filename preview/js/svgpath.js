/* ============================================================
   ON-SCROLL PATH ANIMATIONS — port of "OnScrollPathAnimations".

   The reference's whole engine is one loop: every path.path-anim tweens
   its `d` attribute to data-path-to, scrubbed from the moment its SVG
   enters the viewport to the moment it leaves. That loop is reproduced
   verbatim below; only the class name is ours (.pa).

   Two departures, both about not shipping the reference's fragility:

   1. It runs its own Lenis instance on a bare requestAnimationFrame
      loop. This site already owns its scrolling, and a second smooth
      scroller fighting the first is a guaranteed stutter — so the
      scrub rides native scroll instead.

   2. Its preloader hides <body> behind .loading until imagesLoaded
      reports every SVG <image> decoded. A blocking whole-page curtain
      keyed to image decode is exactly the pattern that has stranded
      this site before. Here nothing is ever hidden waiting on an
      image: the paths animate when they can, and ScrollTrigger is
      refreshed as images land so its measurements stay honest.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('.pa-page');
  if (!root || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  var paths = [].slice.call(root.querySelectorAll('path.pa'));
  if (!paths.length) return;

  /* Reduced motion keeps every shape exactly as authored. The clip paths
     are the composition, not the decoration — freezing them costs the
     page nothing, whereas hiding them would cost it the photography. */
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  paths.forEach(function (el) {
    var svgEl  = el.closest('svg');
    var pathTo = el.dataset.pathTo;
    if (!svgEl || !pathTo) return;

    gsap.timeline({
      scrollTrigger: {
        trigger: svgEl,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    }).to(el, {
      ease: 'none',
      attr: { d: pathTo }
    });
  });

  /* The triggers were measured against boxes that some images had not
     filled yet. Refresh as they arrive, and once more after the fonts
     settle, or the scrubs stay keyed to a layout that no longer exists. */
  var refresh = function () { ScrollTrigger.refresh(); };

  var imgs = [].slice.call(root.querySelectorAll('image, img'));
  var left = imgs.length;
  imgs.forEach(function (n) {
    var href = n.getAttribute('href') || n.getAttribute('xlink:href') || n.src;
    if (!href) { left--; return; }
    var probe = new Image();
    var done = function () { if (--left <= 0) refresh(); };
    probe.addEventListener('load', done, { once: true });
    probe.addEventListener('error', done, { once: true });
    probe.src = href;
  });

  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  setTimeout(refresh, 900);
  setTimeout(refresh, 2400);
})();
