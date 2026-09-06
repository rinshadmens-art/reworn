/* ============================================================
   HOVER GRID — port of the "HoverGrid" reference script.

   The animation is the reference's, line for line: directional
   clip-paths derived from data-dir, a random -10..10 percent nudge, a
   brightness(300%) flash settling to 100%, and the inner plate scaling
   1.5 -> 1. Five groups, fifteen authored positions, same as the
   reference — the routes come from catalog.js.
   ============================================================ */
(function () {
  'use strict';

  var root = document.querySelector('.hg');
  if (!root || !window.gsap) return;

  var D = window.REWORN || {};
  var M = D.motion || {};
  var groups = M.hoverGroups || [];
  if (!groups.length) return;

  /* The reference authors fifteen positions across five groups. Carrying
     only twelve, as this port did while there were three categories,
     silently dropped a fifth of its composition. */
  var POS = [
    ['pos-1', 'pos-2', 'pos-3'],
    ['pos-4', 'pos-5', 'pos-6'],
    ['pos-7', 'pos-8', 'pos-9'],
    ['pos-10', 'pos-11', 'pos-12'],
    ['pos-13', 'pos-14', 'pos-15']
  ];
  /* data-dir per position, exactly as the reference's markup declares it */
  var DIRS = [
    ['right', 'left', 'top'],
    ['bottom', 'right', 'right'],
    ['right', 'bottom', 'left'],
    ['left', 'right', 'right'],
    ['right', 'bottom', 'right']
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- build ---------- */
  var nav     = root.querySelector('.hg__works');
  var content = root.querySelector('.hg__content');
  var bg      = document.querySelector('.hg__bg');
  if (!nav || !content || !bg) return;

  nav.insertAdjacentHTML('beforeend', groups.map(function (g, i) {
    return '<a href="#hg-' + esc(g.key) + '" data-href="' + esc(g.href || 'collection.html') + '">' +
             '<span class="n">' + String(i + 1).padStart(2, '0') + '</span>' +
             '<span class="l">' + esc(g.label) + '</span>' +
             '<span class="c">' + esc(g.count) + '</span>' +
           '</a>';
  }).join(''));

  content.insertAdjacentHTML('beforeend', groups.map(function (g, i) {
    var pos = POS[i % POS.length], dir = DIRS[i % DIRS.length];
    return '<div class="hg__item" id="hg-' + esc(g.key) + '" data-bg="hgbg-' + esc(g.key) + '">' +
             '<h2 class="hg__item-title">' + esc(g.label) + '</h2>' +
             (g.shots || []).slice(0, 3).map(function (src, j) {
               return '<div class="hg__img ' + pos[j] + '" data-dir="' + dir[j] + '">' +
                        '<div class="hg__img-inner" style="background-image:url(' + esc(src) + ')"></div>' +
                      '</div>';
             }).join('') +
           '</div>';
  }).join(''));

  bg.insertAdjacentHTML('beforeend', groups.map(function (g) {
    return '<div id="hgbg-' + esc(g.key) + '" class="hg__bg-image" ' +
           'style="background-image:url(' + esc((g.shots || [])[0] || '') + ')"></div>';
  }).join(''));

  /* ---------- the reference's animation ---------- */
  var workLinks = [].slice.call(nav.querySelectorAll('a'));
  var title = root.querySelector('.hg__title-main');

  /* The reference fires after 30ms and runs at 0.95s. The duration is
     right; the trigger is not — 30ms means the panel flips every time the
     cursor crosses a row on its way somewhere else. Raised on the user's
     own note that the hovers "react too quickly and jump". */
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
     inside a setTimeout, where currentTarget is already null. */
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
      /* The reference only drops --current in each panel's own leave
         tween onComplete. Sweep the cursor down the list faster than
         0.8s and the panels stack: two sets of frames and two titles
         on screen at once, over each other. Measured 2 current.
         Only one route can be shown, so that is enforced here rather
         than left to whichever tween happens to finish first. */
      [].slice.call(content.querySelectorAll('.hg__item--current'))
        .forEach(function (el) {
          if (el !== contentElement) {
            el.classList.remove('hg__item--current');
            gsap.set(el, { zIndex: 0 });
          }
        });

      gsap.set(contentElement, { zIndex: 1 });
      contentElement.classList.add('hg__item--current');

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

    /* The reference fades [video, title]; we have no background video, so
       the standing headline is the only thing that has to get out of the
       way of the revealed panel. */
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
     must still take the visitor to that route. */
  workLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = a.dataset.href;
    });
  });
})();
