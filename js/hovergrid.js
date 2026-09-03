/* ============================================================
   HOVER GRID — port of the "HoverGrid" reference script.
   Directional clip-paths, brightness pop and inner-scale are
   the reference's; the categories come from catalog.js.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('.hg');
  if (!root || !window.gsap) return;

  var D = window.REWORN || {};
  var M = D.motion || {};
  var groups = M.hoverGroups || [];
  if (!groups.length) return;

  var POS = [
    ['pos-1', 'pos-2', 'pos-3'],
    ['pos-4', 'pos-5', 'pos-6'],
    ['pos-7', 'pos-8', 'pos-9'],
    ['pos-10', 'pos-11', 'pos-12']
  ];
  var DIRS = [
    ['right', 'left', 'top'],
    ['bottom', 'right', 'right'],
    ['right', 'bottom', 'left'],
    ['left', 'right', 'right']
  ];

  /* ---------- build ---------- */
  var nav     = root.querySelector('.hg__works');
  var content = root.querySelector('.hg__content');
  var bg      = document.querySelector('.hg__bg');

  nav.insertAdjacentHTML('beforeend', groups.map(function (g, i) {
    return '<a href="#hg-' + g.key + '" data-href="collection.html?c=' + g.key + '">' +
             '<span class="n">' + String(i + 1).padStart(2, '0') + '</span>' + g.label +
           '</a>';
  }).join(''));

  content.insertAdjacentHTML('beforeend', groups.map(function (g, i) {
    var pos = POS[i % POS.length], dir = DIRS[i % DIRS.length];
    return '<div class="hg__item" id="hg-' + g.key + '" data-bg="hgbg-' + g.key + '">' +
             '<h2 class="hg__item-title">' + g.label + '</h2>' +
             g.shots.slice(0, 3).map(function (src, j) {
               return '<div class="hg__img ' + pos[j] + '" data-dir="' + dir[j] + '">' +
                        '<div class="hg__img-inner" style="background-image:url(' + src + ')"></div>' +
                      '</div>';
             }).join('') +
           '</div>';
  }).join(''));

  bg.insertAdjacentHTML('beforeend', groups.map(function (g) {
    return '<div id="hgbg-' + g.key + '" class="hg__bg-image" ' +
           'style="background-image:url(' + (g.shots[0] || '') + ')"></div>';
  }).join(''));

  /* ---------- the reference's animation ---------- */
  var workLinks = [].slice.call(nav.querySelectorAll('a'));
  var title = root.querySelector('.hg__title-main');

  /* The reference fires after 30ms and runs at 0.95s. The duration is
     right; the trigger is not — 30ms means the panel flips every time the
     cursor crosses a row on its way elsewhere. */
  var INTENT = 110;
  var IN_DUR = 1.15;
  var OUT_DUR = 0.8;

  var getClipPath = function (imageElement) {
    var clipPathDirections = {
      right:  'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
      left:   'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)',
      top:    'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)',
      bottom: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)'
    };
    var imageDirection = imageElement.dataset.dir;
    return {
      from: clipPathDirections[imageDirection] || 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      to: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
    };
  };

  /* Takes the element, not the event: the reference reads event.target
     inside a setTimeout, and currentTarget is already null by then. */
  var toggleWork = function (link, isShowing) {
    var href = link.getAttribute('href');
    var contentElement = document.querySelector(href);
    if (!contentElement) return;

    var bgElement = document.getElementById(contentElement.dataset.bg);
    var contentTitle = contentElement.querySelector('.hg__item-title');
    var contentImages = [].slice.call(contentElement.querySelectorAll('.hg__img'));
    var contentInnerImages = [].slice.call(contentElement.querySelectorAll('.hg__img-inner'));

    if (link.tlEnter) link.tlEnter.kill();
    if (link.tlLeave) link.tlLeave.kill();

    if (isShowing) {
      gsap.set(contentElement, { zIndex: 1 });
      contentElement.classList.add('hg__item--current');
      /* the reveal drops a dark plate behind everything — invert the
         surrounding copy so it stays readable */
      document.body.classList.add('hg-active');

      link.tlEnter = gsap.timeline({ defaults: { duration: IN_DUR, ease: 'power4' } })
        .set(bgElement, { opacity: 1 })
        .fromTo(contentTitle, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }, 0)
        .fromTo(contentImages, {
          xPercent: function () { return gsap.utils.random(-10, 10); },
          yPercent: function () { return gsap.utils.random(-10, 10); },
          filter: 'brightness(300%)',
          clipPath: function (index, target) { return getClipPath(target).from; }
        }, {
          xPercent: 0,
          yPercent: 0,
          filter: 'brightness(100%)',
          clipPath: function (index, target) { return getClipPath(target).to; }
        }, 0)
        .fromTo(contentInnerImages, { scale: 1.5 }, { scale: 1 }, 0);
    } else {
      gsap.set(contentElement, { zIndex: 0 });

      link.tlLeave = gsap.timeline({
        defaults: { duration: OUT_DUR, ease: 'power3.inOut' },
        onComplete: function () {
          contentElement.classList.remove('hg__item--current');
          if (!document.querySelector('.hg__item--current')) {
            document.body.classList.remove('hg-active');
          }
        }
      })
        .set(bgElement, { opacity: 0 }, 0.05)
        .to(contentTitle, { opacity: 0 }, 0)
        .to(contentImages, {
          clipPath: function (index, target) { return getClipPath(target).from; }
        }, 0)
        .to(contentInnerImages, { scale: 1.5 }, 0);
    }
  };

  if (matchMedia('(hover: hover)').matches &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    workLinks.forEach(function (workLink) {
      var hoverTimer;
      workLink.addEventListener('mouseenter', function () {
        hoverTimer = setTimeout(function () { toggleWork(workLink, true); }, INTENT);
      });
      workLink.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimer);
        toggleWork(workLink, false);
      });
    });

    nav.addEventListener('mouseenter', function () {
      gsap.killTweensOf(title);
      gsap.to(title, { duration: 0.9, ease: 'power3.out', opacity: 0 });
    });
    nav.addEventListener('mouseleave', function () {
      gsap.killTweensOf(title);
      gsap.to(title, { duration: 0.9, ease: 'power2.inOut', opacity: 1 });
    });
  }

  /* The anchors exist so the hover reveal can target its panel; a click
     must still take the visitor to that category. */
  workLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = a.dataset.href;
    });
  });
})();
