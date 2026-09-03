/* ============================================================
   REVEAL — scroll reveals for cards and copy blocks.

   Principle, learned the hard way: an element's RESTING state is
   the visible one, and revealing plays a keyframe animation that
   starts hidden. No fill-mode, so if the animation is throttled
   and never runs, the element is simply visible.

   Hiding first and animating back (a transition, or a GSAP "from"
   state) is the opposite bet, and when the ticker stalls it leaves
   the archive blank — which is the worst thing this site can do.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the reference's three directions, cycled across the grid */
  var DIRS = [
    'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',        /* from bottom */
    'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',        /* from right  */
    'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' /* from left   */
  ];

  function reveal(scope) {
    var nodes = [].slice.call((scope || document).querySelectorAll('.card, .reveal'))
      .filter(function (n) { return !n.__seen; });
    if (!nodes.length) return;

    nodes.forEach(function (n, i) {
      n.__seen = true;
      if (n.classList.contains('card')) n.style.setProperty('--from', DIRS[i % 3]);
    });

    if (REDUCED) return;

    var play = function (n) {
      if (n.__played) return;
      n.__played = true;
      n.classList.add('is-lit');
    };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          play(e.target);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      nodes.forEach(function (n) { io.observe(n); });
    }

    /* Native scroll fires even when rAF and IntersectionObserver are
       throttled, so it is the reliable trigger of the three. */
    var sweep = function () {
      var left = 0;
      nodes.forEach(function (n) {
        if (n.__played) return;
        var r = n.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) play(n);
        else left++;
      });
      if (!left) window.removeEventListener('scroll', sweep);
    };
    window.addEventListener('scroll', sweep, { passive: true });
    setTimeout(sweep, 200);
  }

  window.addEventListener('reworn:grid', function (e) { reveal(e.detail || document); });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { reveal(); });
  } else {
    reveal();
  }
})();
