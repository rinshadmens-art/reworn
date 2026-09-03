/* ============================================================
   MENU — port of the "Navigation menus" reference script.
   ============================================================ */
(function () {
  'use strict';

  var menuToggleBtn = document.querySelector('.menu-toggle-btn');
  if (!menuToggleBtn || !window.gsap) return;

  gsap.registerPlugin(CustomEase, SplitText);
  CustomEase.create('hop', '.87,0,.13,1');

  var lockScroll = function (lock) {
    document.documentElement.classList.toggle('no-scroll', lock);
    document.body.classList.toggle('no-scroll', lock);
  };

  /* --- SplitText setup --- */
  var textContainers = document.querySelectorAll('.menu-col');
  var splitTextByContainer = [];

  textContainers.forEach(function (container) {
    var textElements = container.querySelectorAll('a, p');
    var containerSplits = [];

    textElements.forEach(function (el) {
      var split = SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line'
      });
      containerSplits.push(split);
      gsap.set(split.lines, { y: '-110%' });
    });

    splitTextByContainer.push(containerSplits);
  });

  var container            = document.querySelector('.page-shell');
  var menuOverlay          = document.querySelector('.menu-overlay');
  var menuOverlayContainer = document.querySelector('.menu-overlay-content');
  var menuMediaWrapper     = document.querySelector('.menu-media-wrapper');
  var copyContainers       = document.querySelectorAll('.menu-col');
  var menuToggleLabel      = document.querySelector('.menu-toggle-label p');
  var hamburgerIcon        = document.querySelector('.menu-hamburger-icon');

  var isMenuOpen = false;
  var isAnimating = false;

  function resetLines() {
    splitTextByContainer.forEach(function (containerSplits) {
      var lines = containerSplits.reduce(function (a, s) { return a.concat(s.lines); }, []);
      gsap.set(lines, { y: '-110%' });
    });
  }

  function toggleMenu() {
    if (isAnimating) return;

    if (!isMenuOpen) {
      isAnimating = true;
      lockScroll(true);
      document.body.classList.add('menu-open');

      var tl = gsap.timeline();

      tl.to(menuToggleLabel, { y: '-110%', duration: 1, ease: 'hop' }, '<')
        .to(container, { y: '100svh', duration: 1, ease: 'hop' }, '<')
        .to(menuOverlay, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          duration: 1, ease: 'hop'
        }, '<')
        .to(menuOverlayContainer, { yPercent: 0, duration: 1, ease: 'hop' }, '<')
        .to(menuMediaWrapper, {
          opacity: 1, duration: 0.75, ease: 'power2.out', delay: 0.5
        }, '<');

      splitTextByContainer.forEach(function (containerSplits) {
        var lines = containerSplits.reduce(function (a, s) { return a.concat(s.lines); }, []);
        tl.to(lines, { y: '0%', duration: 2, ease: 'hop', stagger: -0.075 }, -0.15);
      });

      if (hamburgerIcon) hamburgerIcon.classList.add('active');
      menuToggleBtn.setAttribute('aria-expanded', 'true');

      tl.call(function () { isAnimating = false; });
      isMenuOpen = true;

    } else {
      isAnimating = true;
      if (hamburgerIcon) hamburgerIcon.classList.remove('active');
      menuToggleBtn.setAttribute('aria-expanded', 'false');

      var tl2 = gsap.timeline();

      tl2.to(container, { y: '0svh', duration: 1, ease: 'hop' })
        .to(menuOverlay, {
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
          duration: 1, ease: 'hop'
        }, '<')
        .to(menuOverlayContainer, { yPercent: -50, duration: 1, ease: 'hop' }, '<')
        .to(menuToggleLabel, { y: '0%', duration: 1, ease: 'hop' }, '<')
        .to(copyContainers, { opacity: 0.25, duration: 1, ease: 'hop' }, '<');

      tl2.call(function () {
        resetLines();
        gsap.set(copyContainers, { opacity: 1 });
        gsap.set(menuMediaWrapper, { opacity: 0 });
        document.body.classList.remove('menu-open');
        lockScroll(false);
        isAnimating = false;
      });

      isMenuOpen = false;
    }
  }

  menuToggleBtn.addEventListener('click', toggleMenu);

  /* A fullscreen overlay with no keyboard exit is a trap. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen) { isAnimating = false; toggleMenu(); }
  });

  /* If a timeline ever stalls mid-open, never leave the page scroll-locked
     behind an overlay the visitor cannot see or dismiss. */
  setInterval(function () {
    if (!isMenuOpen && document.documentElement.classList.contains('no-scroll') && !isAnimating) {
      lockScroll(false);
    }
  }, 2000);
})();

/* The index hero owns the wordmark in the top-left corner; the bar's mark
   fades in only once that hero has scrolled away. */
(function () {
  if (!document.body.classList.contains('is-home')) return;

  /* The hero's corner stack is position:fixed, so "hidden" cannot be left
     to a CSS transition. In a throttled or backgrounded tab the transition
     simply stops advancing, and the pile sits frozen part-way — measured
     at opacity 0.52 — on top of the archive grid.

     Same lesson as the rAF failsafes elsewhere in this project: a real
     timer keeps running when the compositor does not. The fade is a
     nicety; .stack-retired is the guarantee behind it. */
  var retire = null;
  var wasScrolled = null;

  var mark = function () {
    var past = window.scrollY > window.innerHeight * 0.75;
    if (past === wasScrolled) return;
    wasScrolled = past;

    document.body.classList.toggle('scrolled', past);

    clearTimeout(retire);
    if (past) {
      retire = setTimeout(function () {
        document.body.classList.add('stack-retired');
      }, 520);
    } else {
      document.body.classList.remove('stack-retired');
    }
  };

  mark();
  window.addEventListener('scroll', mark, { passive: true });
})();
