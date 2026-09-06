/* ============================================================
   SPOTLIGHT — port of the "Scroll Animation 47" reference script.

   The two-phase maths is the reference's, line for line: phase one
   raises the cards from y:200% to y:-50% on staggered offsets with a
   cubic ease-out; phase two carries each to its own corner while
   unwinding its initial rotation. Only the inputs are ours.

   Three deliberate departures, each commented where it happens:
     - the pin is 3.6 screens, not 6
     - the cards are built from catalog.js, not hardcoded
     - below 1000px and under reduced motion it does not pin at all
   ============================================================ */
(function () {
  'use strict';

  var stage = document.querySelector('.spot-stage');
  if (!stage || !window.gsap) return;

  var D = window.REWORN || {};
  var M = D.motion || {};
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  gsap.registerPlugin(ScrollTrigger);

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                          .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- build the four cards from the archive ---------- */
  var holder = stage.querySelector('.spot-imgs');
  var shots  = (M.spotlight || []).slice(0, 4);
  if (!holder || shots.length < 4) return;

  holder.innerHTML = shots.map(function (s, i) {
    /* only the frames that carry a product id are stock; the rest are
       mood and must not be captioned as though they were for sale */
    var cap = s.id
      ? '<figcaption><span>' + esc(s.brand || '') + '</span>' +
        '<span class="stock">In archive</span></figcaption>'
      : '';
    /* A cut-out has to be CONTAINed — cover would crop the garment back
       out of its own frame, which is the thing this is fixing. Mood
       frames still cover, because filling the card is their whole job. */
    var fit = s.fit === 'contain' ? ' class="is-contain"' : '';
    return '<figure class="spot-img' + (s.fit === 'contain' ? ' spot-img--cut' : '') + '">' +
             '<img' + fit + ' src="' + esc(s.src) + '" alt="' + esc(s.alt) + '" loading="lazy" decoding="async">' +
             cap +
           '</figure>';
  }).join('');

  var imgs = [].slice.call(holder.querySelectorAll('.spot-img'));

  /* ---------- the static fallback ----------
     Pinning six screens on a phone is how you get someone to close the
     tab. Below 1000px, and whenever motion is reduced, the section is
     simply a heading and a grid — no pin, nothing that can trap scroll. */
  if (REDUCED || !matchMedia('(min-width: 1000px)').matches) {
    stage.classList.add('is-static');
    imgs.forEach(function (n) { n.classList.add('is-settled'); });
    return;
  }

  /* The reference's own numbers, pushed ~15% further out. Its corners were
     tuned against a 50%-wide headline; ours is a longer sentence, and at
     the reference's distances the cards sat on the ends of lines 1 and 3.
     The statement is the payoff of the whole section — it does not get to
     be half-covered by the thing that was hiding it. */
  var FINAL = [[-158, -156], [56, -150], [-176, 56], [42, 50]];
  var ROT   = [5, -3, 3.5, -1];
  var P1    = [0, 0.1, 0.2, 0.3];
  var P2    = [0.5, 0.55, 0.6, 0.65];

  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };

  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    /* The reference holds the pin for six viewport heights. That is a
       long time to stop a shopper from reaching the stock, and the
       choreography reads identically compressed — the eases are
       normalised to progress, not to distance. */
    end: function () { return '+=' + window.innerHeight * 3.6; },
    pin: true,
    pinSpacing: true,
    scrub: 1,
    invalidateOnRefresh: true,
    onUpdate: function (self) {
      var progress = self.progress;

      imgs.forEach(function (img, index) {
        var initialRotation = ROT[index];
        var phase1Start = P1[index];
        var phase1End = Math.min(phase1Start + (0.45 - phase1Start) * 0.9, 0.45);

        var x = -50, y, rotation;

        if (progress < phase1Start) {
          y = 200;
          rotation = initialRotation;
        } else if (progress <= 0.45) {
          var p1;
          if (progress >= phase1End) p1 = 1;
          else p1 = easeOutCubic((progress - phase1Start) / (phase1End - phase1Start));
          y = 200 - p1 * 250;
          rotation = initialRotation;
        } else {
          y = -50;
          rotation = initialRotation;
        }

        var phase2Start = P2[index];
        var phase2End = Math.min(phase2Start + (0.95 - phase2Start) * 0.9, 0.95);
        var finalX = FINAL[index][0];
        var finalY = FINAL[index][1];

        if (progress >= phase2Start && progress <= 0.95) {
          var p2;
          if (progress >= phase2End) p2 = 1;
          else p2 = easeOutCubic((progress - phase2Start) / (phase2End - phase2Start));
          x = -50 + (finalX + 50) * p2;
          y = -50 + (finalY + 50) * p2;
          rotation = initialRotation * (1 - p2);
        } else if (progress > 0.95) {
          x = finalX;
          y = finalY;
          rotation = 0;
        }

        img.style.transform =
          'translate(' + x + '%, ' + y + '%) rotate(' + rotation + 'deg)';

        /* Captions belong to a card that has arrived. Showing them while
           it is still rising turns the label into a smear — but once it
           has arrived it keeps them, including out at the corners, where
           naming the piece is the only thing making it shoppable. */
        img.classList.toggle('is-settled', progress > phase1End);
      });
    }
  });

  /* The pin measures against layout, and layout is not final until the
     fonts have swapped and the lazy frames have taken their boxes. */
  var refresh = function () { ScrollTrigger.refresh(); };
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  setTimeout(refresh, 600);
  setTimeout(refresh, 1800);
})();
