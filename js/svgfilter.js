/* ============================================================
   SVG ON-SCROLL FILTER — port of the "OnScrollFilter" reference
   (index.js + item.js).

   Each pane: Flip the two title halves from centre-stage into
   the layout, while an SVG mask circle grows from r=0 to its
   data-value-final through a feTurbulence displacement filter,
   and the image scales and brightens. All scrubbed on scroll.
   ============================================================ */
(function () {
  'use strict';

  var host = document.querySelector('.sf-section');
  if (!host || !window.gsap) return;

  var D = window.REWORN || {};
  var M = D.motion || {};
  var panes = M.svgPanes || [];
  if (!panes.length) { host.remove(); return; }

  gsap.registerPlugin(ScrollTrigger, Flip);

  /* Each pane needs its own filter and mask ids, or every SVG on the
     page resolves to the first one. */
  host.innerHTML = panes.map(function (p, i) {
    var n = i + 1;
    return '' +
    '<div class="sf">' +
      '<div class="sf__content">' +
        '<div class="sf__title-wrap">' +
          '<span class="sf__title sf__title--up">' + p.titleUp + '</span>' +
          '<span class="sf__title sf__title--down">' + p.titleDown + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="sf__content sf__content--layout">' +
        '<svg class="sf__img sf__img--' + n + '" viewBox="0 0 ' + p.w + ' ' + p.h + '" ' +
             'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
             'width="' + p.w + '" height="' + p.h + '">' +
          '<defs>' +
            '<filter id="sfNoise' + n + '">' +
              '<feTurbulence type="fractalNoise" baseFrequency="' + p.freq +
                '" numOctaves="' + p.octaves + '" result="noise" />' +
              '<feDisplacementMap in="SourceGraphic" in2="noise" scale="' + p.scale +
                '" xChannelSelector="R" yChannelSelector="G" />' +
            '</filter>' +
            '<mask id="sfMask' + n + '">' +
              '<circle cx="50%" cy="50%" r="0" data-value-final="' + p.final +
                '" fill="white" class="sf__mask" style="filter:url(#sfNoise' + n + ')" />' +
            '</mask>' +
          '</defs>' +
          '<image xlink:href="' + p.src + '" href="' + p.src + '" width="' + p.w +
            '" height="' + p.h + '" mask="url(#sfMask' + n + ')" ' +
            'preserveAspectRatio="xMidYMid slice" />' +
        '</svg>' +
        '<p class="sf__text">' + p.text +
          ' — <a href="product.html?id=' + p.id + '">see the piece</a></p>' +
      '</div>' +
    '</div>';
  }).join('');

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(host.querySelectorAll('.sf'), function (el) {
    var titleWrap = el.querySelector('.sf__title-wrap');
    var titleUp   = titleWrap.querySelector('.sf__title--up');
    var titleDown = titleWrap.querySelector('.sf__title--down');
    var content   = el.querySelectorAll('.sf__content');
    var svg       = el.querySelector('.sf__img');
    var mask      = svg.querySelector('.sf__mask');
    var image     = svg.querySelector('image');

    if (REDUCED) {
      /* no scrub: show the plate fully open, titles in their final slots */
      mask.setAttribute('r', mask.dataset.valueFinal);
      content[1].prepend(titleUp, titleDown);
      return;
    }

    var flipstate = Flip.getState([titleUp, titleDown]);
    content[1].prepend(titleUp, titleDown);

    var flip = Flip.from(flipstate, { ease: 'none', simple: true })
      .fromTo(mask,
        { attr: { r: mask.getAttribute('r') } },
        { ease: 'none', attr: { r: mask.dataset.valueFinal } }, 0)
      .fromTo(image,
        { transformOrigin: '50% 50%', filter: 'brightness(100%)' },
        { ease: 'none', scale: 1.2, filter: 'brightness(118%)' }, 0);

    ScrollTrigger.create({
      trigger: titleWrap,
      ease: 'none',
      start: 'clamp(top bottom-=10%)',
      /* the reference uses +=40%; a longer window makes the mask open
         gradually rather than snapping past in a flick of the wheel */
      end: '+=60%',
      scrub: 1.2,
      animation: flip
    });
  });
})();

/* ScrollTrigger measures positions once. Every image that loads after
   that shifts the page and leaves the triggers pointing at the wrong
   scroll offsets — which is why the mask appeared already open. */
(function () {
  if (!window.ScrollTrigger) return;
  var refresh = function () { ScrollTrigger.refresh(); };
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  setTimeout(refresh, 1500);
  setTimeout(refresh, 3500);
})();
