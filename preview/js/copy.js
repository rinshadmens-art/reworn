/* ============================================================
   COPY — port of the text-animation reference (Copy.jsx).

   The React component wraps children and reveals them line by
   line on scroll. Here it is an attribute instead:

     <h2 data-copy>…</h2>              reveal on scroll
     <div data-copy-wrapper>…</div>    reveal each child
     data-copy-delay="0.5"             hold before starting
     data-copy-now                     play immediately, not on scroll

   Timing is the reference's: lines from y:100%, duration 1,
   stagger 0.1, power4.out, triggered at "top 75%", once.
   ============================================================ */
(function () {
  'use strict';

  if (!window.gsap || !window.SplitText) return;
  gsap.registerPlugin(SplitText, ScrollTrigger);

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function collect(container) {
    return container.hasAttribute('data-copy-wrapper')
      ? Array.prototype.slice.call(container.children)
      : [container];
  }

  function setup(container) {
    if (container.__copy) return;
    container.__copy = true;

    var lines = [];

    collect(container).forEach(function (element) {
      var split = SplitText.create(element, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line++',
        lineThreshold: 0.1
      });

      /* The reference moves a text-indent onto the first line so the mask
         doesn't clip it — same here. */
      var indent = window.getComputedStyle(element).textIndent;
      if (indent && indent !== '0px' && split.lines.length) {
        split.lines[0].style.paddingLeft = indent;
        element.style.textIndent = '0';
      }

      lines.push.apply(lines, split.lines);
    });

    if (!lines.length) return;

    var delay = parseFloat(container.getAttribute('data-copy-delay')) || 0;
    var props = {
      y: '0%',
      duration: 1,
      stagger: 0.1,
      ease: 'power4.out',
      delay: delay
    };

    if (REDUCED) { gsap.set(lines, { y: '0%' }); return; }

    gsap.set(lines, { y: '100%' });

    if (container.hasAttribute('data-copy-now')) {
      gsap.to(lines, props);
      return;
    }

    gsap.to(lines, Object.assign({}, props, {
      scrollTrigger: { trigger: container, start: 'top 75%', once: true }
    }));

    /* ScrollTrigger rides requestAnimationFrame, which stalls in a
       throttled tab — text that never un-hides is worse than text that
       never animates, so a real timer forces anything on screen open. */
    setTimeout(function () {
      var r = container.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) gsap.set(lines, { y: '0%' });
    }, 2600);
  }

  function scan(root) {
    var nodes = (root || document).querySelectorAll('[data-copy], [data-copy-wrapper]');
    Array.prototype.forEach.call(nodes, setup);
  }

  /* Fonts change line breaks, and SplitText measures lines — splitting
     before the webfont lands produces wrong line boxes. */
  function boot() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { scan(); });
      setTimeout(scan, 1200);          // fonts.ready can hang on some browsers
    } else {
      scan();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('reworn:grid', function (e) { scan(e.detail); });
  window.REWORN_COPY = { scan: scan };
})();
