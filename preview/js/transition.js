/* ============================================================
   PAGE TRANSITION — the "default-transition" from the Barba
   reference, without Barba's SPA layer.

   The visual is theirs exactly: the outgoing page scales to 0.6
   and fades to 0.45 while its content lifts, and the incoming
   page clip-path reveals from inset(100% 0 0 0) at scale 0.6,
   then settles to 1. Duration 0.8, power3.inOut.

   Why not @barba/core: Barba swaps containers inside one
   document, so every page script would have to tear down and
   re-init on each navigation. Ours run three.js contexts, GSAP
   ScrollTriggers and a WebGL renderer — leaking one of those per
   navigation is exactly the lag this is meant to avoid. Real
   navigation keeps every page a clean document; the animation is
   split across the unload and the next load instead.
   ============================================================ */
(function () {
  'use strict';

  var shell = document.querySelector('.page-shell');
  if (!shell || !window.gsap) return;

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;

  var DUR = 0.8;
  var EASE = 'power3.inOut';

  /* ---------- enter ----------
     Deliberately CSS, not GSAP. If the animation ticker stalls — a
     throttled tab, low-power mode — a GSAP "from" state leaves the whole
     page clipped to nothing and the site looks broken. A CSS transition
     runs on the compositor, and the class that drives it is removed by an
     inline timeout in <head>, so the page opens even if every script
     after that fails to run. */
  function enter() {
    document.documentElement.classList.remove('is-entering');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enter);
  } else {
    enter();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.documentElement.classList.remove('is-entering');
      gsap.set(shell, { clearProps: 'all' });
    }
  });

  /* ---------- leave ---------- */
  var leaving = false;

  function samePage(url) {
    return url.pathname === location.pathname && url.search === location.search;
  }

  function internal(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var url;
    try { url = new URL(a.href, location.href); } catch (e) { return false; }
    if (url.origin !== location.origin) return false;
    if (!/\.html?$/.test(url.pathname) && url.pathname !== '/') return false;
    if (url.hash && samePage(url)) return false;   /* in-page anchor */
    return url;
  }

  document.addEventListener('click', function (e) {
    if (leaving) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    var a = e.target.closest && e.target.closest('a');
    var url = internal(a);
    if (!url) return;

    e.preventDefault();
    leaving = true;

    /* The overlay menu also transforms .page-shell. Clear that first or
       the two transforms fight and the page jumps. */
    gsap.set(shell, { y: 0, opacity: 1 });

    var content = shell.firstElementChild;
    var tl = gsap.timeline({
      defaults: { duration: DUR, ease: EASE },
      onComplete: function () { window.location.href = url.href; }
    });

    tl.to(shell, { scale: 0.6, transformOrigin: '50% 50%' })
      .to(shell, { opacity: 0.45, ease: 'power3' }, '<')
      .to(content, { yPercent: -10, ease: 'power3' }, '<');

    /* If the navigation is ever blocked, don't strand the page shrunken. */
    setTimeout(function () {
      if (leaving) { leaving = false; gsap.set(shell, { clearProps: 'all' }); }
    }, 4000);
  });
})();
