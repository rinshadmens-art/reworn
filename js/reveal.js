/* ============================================================
   REVEAL — the quiet layer for the inner pages.

   Deliberately not GSAP-dependent for visibility: whether a
   product is on screen must never hinge on an animation ticker.
   IntersectionObserver + native scroll + a real timer, with the
   transition itself in CSS.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DIRS = [
    'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',        /* from bottom */
    'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',        /* from right  */
    'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' /* from left   */
  ];

  function reveal(scope) {
    var nodes = [].slice.call((scope || document).querySelectorAll('.card, .reveal'))
      .filter(function (n) { return !n.__lit; });
    if (!nodes.length) return;

    nodes.forEach(function (n, i) {
      n.__lit = true;
      if (REDUCED) return;
      if (n.classList.contains('card')) n.style.setProperty('--from', DIRS[i % 3]);
      n.classList.add('is-clipped');
    });

    if (REDUCED) return;

    var show = function (n) { n.classList.remove('is-clipped'); };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          show(e.target);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      nodes.forEach(function (n) { io.observe(n); });
    }

    /* Observers and rAF are throttled in backgrounded or low-power tabs;
       native scroll and setTimeout are not. */
    var sweep = function () {
      var left = 0;
      nodes.forEach(function (n) {
        if (!n.classList.contains('is-clipped')) return;
        var r = n.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show(n);
        else left++;
      });
      if (!left) window.removeEventListener('scroll', sweep);
    };
    window.addEventListener('scroll', sweep, { passive: true });
    setTimeout(sweep, 300);
    setTimeout(sweep, 1400);
  }

  window.addEventListener('reworn:grid', function (e) { reveal(e.detail || document); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { reveal(); });
  } else {
    reveal();
  }
})();
