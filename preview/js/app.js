/* REWORN. — shared page logic. Reads window.REWORN from catalog.js. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var D = window.REWORN;
  if (!D) return;

  var inr = function (n) { return '₹' + n.toLocaleString('en-IN'); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  /* pick the best image: editorial first, real photo as fallback */
  function imgs(p) {
    /* Editorial only. This used to concat p.photos — assets/img/products/,
       Rinshad's own phone shots — as a fallback, and since every product has
       fewer than ten editorial frames the gallery reached straight into them.
       Thirty-five of his photographs were rendering because of this one line.
       build-catalog no longer emits the key at all; this is the second lock. */
    var list = (p.editorial || []);
    return list.length ? list : ['assets/img/brand/placeholder.jpg'];
  }

  function waLink(p) {
    var msg = 'Hi Rinshad — I saw the ' + p.brand + ' ' + p.name +
              ' (' + inr(p.price_inr) + ') on REWORN. Is it still available?';
    return D.brand.contact.whatsapp_link + '?text=' + encodeURIComponent(msg);
  }

  /* Run a DOM update inside a view transition when the browser supports it,
     and plainly when it doesn't. Never block the update on the animation. */
  function withTransition(update, after) {
    var done = function () { if (after) after(); };
    if (!document.startViewTransition ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update(); done(); return;
    }
    var t = document.startViewTransition(update);
    /* Clicking a second filter before the first transition settles aborts it,
       and an aborted .ready with nothing attached surfaces as an unhandled
       InvalidStateError. Only .finished was being caught. */
    /* A view transition exposes three promises and any of them can reject on
       its own — .ready when a second transition aborts this one, and
       .updateCallbackDone when the transition is skipped outright (navigating
       away mid-flight does it). Catching only one still surfaces the others
       as unhandled rejections in the console. */
    if (t.ready && t.ready.catch) t.ready.catch(function () {});
    if (t.updateCallbackDone && t.updateCallbackDone.catch) {
      t.updateCallbackDone.catch(function () {});
    }
    t.finished.then(done, done);
  }

  /* ---------- product cards ---------- */
  /* Categories are stored lowercase as filter keys; printed in a spec
     table beside "Polo Ralph Lauren" and "Linen (Made in India)", a bare
     "shirts" reads as a bug rather than as a value. */
  function cap(s) {
    return String(s || '').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  /* Where the piece came from, printed only where the archive actually knows.
     Seven of the twelve archive pieces have no recorded place; inventing a city
     for them would be the one thing this brand cannot afford to do. */
  function originOf(p) {
    var o = p.origin;
    if (!o || !o.place) return '';
    return o.era ? o.place + ', ' + o.era : o.place;
  }

  /* The anchor, for the nine brands the buyer already prices in their head.
     Absent retail_inr renders NOTHING — no element, no margin — so a piece
     without a verified figure simply never makes the claim. */
  function retailLine(p) {
    if (!p.retail_inr) return '';
    return '<p class="pdp__retail micro faint">Retails around ' +
           inr(p.retail_inr) + ' new</p>';
  }

  function flag(p) {
    return p.sold ? '<span class="card__flag card__flag--sold micro">Sold</span>' :
           p.tier === 'hero' ? '<span class="card__flag micro">Piece of the drop</span>' : '';
  }

  /* The collection grid's tile. It borrows the reference's DENSITY — four
     across, edge to edge, meta inside the cell — and none of its photography.
     The cut-out-on-a-grey-plate look was Louis Vuitton's component, not this
     archive's: every piece here was shot on a stool against a warm wall, and
     that IS the brand. Reusing .card__media means the hover swap between the
     two real frames comes back for free. */
  function tileCard(p) {
    var im = imgs(p);
    var alt = im[1] || im[0];
    return '' +
      '<a class="card card--tile reveal' + (p.sold ? ' is-sold' : '') +
        '" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        '<span class="card__media">' +
          flag(p) +
          '<img class="is-main" src="' + im[0] + '" alt="' +
            esc(p.brand + ' ' + p.name) + '" loading="lazy" decoding="async">' +
          '<img class="is-alt" src="' + alt + '" alt="" aria-hidden="true" loading="lazy">' +
        '</span>' +
        '<span class="card__meta">' +
          '<span class="card__brand micro faint">' + esc(p.brand) + '</span>' +
          '<span class="card__name">' + esc(p.name) + '</span>' +
          '<span class="card__price">' + inr(p.price_inr) + '</span>' +
          '<span class="card__health micro faint">Product health <b>' +
            p.condition + '%</b></span>' +
          '<span class="card__bar"><i style="width:' + p.condition + '%"' +
            (p.condition < 90 ? ' data-low="true"' : '') + '></i></span>' +
        '</span>' +
      '</a>';
  }

  function card(p) {
    var im = imgs(p);
    var alt = im[1] || im[0];
    return '' +
      '<a class="card reveal" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        '<span class="card__media">' +
          flag(p) +
          '<img class="is-main" src="' + im[0] + '" alt="' + esc(p.brand + ' ' + p.name) + '" loading="lazy">' +
          '<img class="is-alt" src="' + alt + '" alt="" aria-hidden="true" loading="lazy">' +
        '</span>' +
        '<span class="card__meta">' +
          '<span class="card__name">' +
            '<span class="card__brand micro faint">' + esc(p.brand) + '</span>' +
            esc(p.name) +
          '</span>' +
          '<span class="card__price">' + inr(p.price_inr) + '</span>' +
        '</span>' +
        '<span class="card__bar"><i style="width:' + p.condition + '%"></i></span>' +
      '</a>';
  }

  /* Full-bleed frames that interrupt the product rhythm, the way a lookbook
     page does in a printed catalogue. Fixed list, fixed order — placement has
     to be the same on every visit or the page stops feeling designed.

     The dark-room frames are all 1500x1862 (ratio 0.806, near enough 4:5 that
     they drop into a single cell uncropped); the two landscapes span two. */
  var BREAKS = [
    { src: 'assets/img/mood/hero-panel.jpg', span: 2, alt: 'The archive, shot warm' },
    { src: 'assets/img/editorial/onward-furcollar-20.jpg', span: 1, alt: 'Fur-collar coat, lit low' },
    { src: 'assets/img/mood/lineup-bw.jpg', span: 2, alt: 'The line-up' },
    { src: 'assets/img/editorial/lilang-trench-20.jpg', span: 1, alt: 'Trench, lit low' }
  ];

  /* One break per EVERY cards. Below MIN_FOR_BREAK the set is too short to
     interrupt — filter to Knitwear, get four pieces, and a single editorial
     cell would be a third of the page. */
  var EVERY = 8;
  var MIN_FOR_BREAK = 8;

  function breakCell(b) {
    return '<figure class="grid__break" style="--span:' + b.span + '">' +
             '<img src="' + esc(b.src) + '" alt="' + esc(b.alt) + '" loading="lazy" decoding="async">' +
           '</figure>';
  }

  function renderGrid(el, items, opts) {
    opts = opts || {};
    var build = opts.tile ? tileCard : card;

    if (!items.length) {
      el.innerHTML = '<p class="empty">Nothing in this category yet.</p>';
    } else {
      var out = [], bi = 0;
      items.forEach(function (p, i) {
        if (opts.breaks && i && i % EVERY === 0 && items.length >= MIN_FOR_BREAK) {
          out.push(breakCell(BREAKS[bi % BREAKS.length]));
          bi++;
        }
        out.push(build(p));
      });
      el.innerHTML = out.join('');
    }
    /* motion.js owns the reveal; tell it fresh cards exist. */
    window.dispatchEvent(new CustomEvent('reworn:grid', { detail: el }));
  }

  /* ---------- home ---------- */
  var homeGrid = document.querySelector('[data-grid="home"]');
  if (homeGrid) {
    /* Four, not all seven heroes. The index is a trailer, not the shop —
       seven cards is most of a browsing page's worth of decisions to make
       before anyone has been told what the archive is, and the row below
       ("Discover the selection") is what should carry them onward. */
    var n = parseInt(homeGrid.dataset.limit, 10) || 4;
    renderGrid(homeGrid, D.products.filter(function (p) { return p.tier === 'hero'; }).slice(0, n));
  }

  /* ---------- collection ---------- */
  var colGrid = document.querySelector('[data-grid="collection"]');
  if (colGrid) {
    /* Six routes, not three. motion.hoverGroups and the folder tabs have
       always linked to ?max=1500 and ?health=100, but this page only ever
       read ?c= — so two of the six tabs quietly landed on the unfiltered
       grid. Each route now owns its predicate and its query string. */
    var ROUTES = {
      all:       { q: null,          test: function () { return true; } },
      shirts:    { q: 'c=shirts',    test: function (p) { return p.category === 'shirts'; } },
      outerwear: { q: 'c=outerwear', test: function (p) { return p.category === 'outerwear'; } },
      knitwear:  { q: 'c=knitwear',  test: function (p) { return p.category === 'knitwear'; } },
      under1500: { q: 'max=1500',    test: function (p) { return p.price_inr <= 1500; } },
      full:      { q: 'health=100',  test: function (p) { return p.condition === 100; } }
    };

    var params = new URLSearchParams(location.search);
    var active =
      params.get('health') === '100' ? 'full' :
      params.get('max')    === '1500' ? 'under1500' :
      (ROUTES[params.get('c')] ? params.get('c') : 'all');

    var draw = function () {
      var route = ROUTES[active] || ROUTES.all;
      renderGrid(colGrid, D.products.filter(route.test), { tile: true, breaks: true });
      document.querySelectorAll('[data-filter]').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.filter === active);
      });
    };

    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!ROUTES[b.dataset.filter]) return;
        active = b.dataset.filter;
        var q = ROUTES[active].q;
        history.replaceState(null, '', q ? '?' + q : 'collection.html');
        withTransition(draw);
      });
    });

    /* density toggle: the grid re-lays out inside a view transition, so every
       tile animates from its old box to its new one instead of jumping. */
    var cols = localStorage.getItem('reworn-cols') || '4';
    colGrid.dataset.cols = cols;
    document.querySelectorAll('[data-cols]').forEach(function (b) {
      if (b.tagName !== 'BUTTON') return;
      b.classList.toggle('is-on', b.dataset.cols === cols);
      b.addEventListener('click', function () {
        cols = b.dataset.cols;
        localStorage.setItem('reworn-cols', cols);
        document.querySelectorAll('.density button').forEach(function (x) {
          x.classList.toggle('is-on', x.dataset.cols === cols);
        });
        withTransition(function () {
          colGrid.dataset.cols = cols;
          [].forEach.call(colGrid.children, function (c, i) {
            c.style.viewTransitionName = 'tile-' + i;
          });
        }, function () {
          [].forEach.call(colGrid.children, function (c) { c.style.viewTransitionName = ''; });
        });
      });
    });

    draw();
  }

  /* ---------- product page ---------- */
  var pdp = document.querySelector('[data-pdp]');
  if (pdp) {
    var id = new URLSearchParams(location.search).get('id');
    var p = D.products.filter(function (x) { return x.id === id; })[0] || D.products[0];
    var im = imgs(p);
    document.title = p.brand + ' ' + p.name + ' — REWORN.';

    // editorial frames, then the real tag photos as authenticity proof
    var idx = D.products.indexOf(p) + 1;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    /* Gallery rhythm: lead frame, then pairs, with one full-width plate every
       third position so the column never becomes a monotonous ladder. */
    /* Was slice(1, 6), which quietly dropped every frame past the sixth —
       including the two Rinshad specifically asked to see (the Lilang collar
       plate and the Nike flat-lay). A cap that hides the newest photography
       is worse than a long page, and this is an archive: more of the garment
       is the point. */
    /* No proof strip. p.proof is assets/img/products/ — the hand-held phone
       shots of care labels and hangers that Rinshad took himself, and he does
       not want his own photographs on the site. The brand claim that used to
       justify them ("tag photographs are unretouched originals") goes with
       them rather than standing over an empty promise. */
    var rest = im.slice(1, 10);
    var strip = rest.map(function (src, i) {
      var wide = (i % 3 === 2);
      return '<figure class="' + (wide ? 'is-wide' : '') + '">' +
             '<img src="' + src + '" alt="" loading="lazy"></figure>';
    }).join('');

    var health = p.condition;
    var outfit = (p.outfit && p.outfit.pieces || []).map(function (x) {
      return '<li><span>' + esc(x) + '</span></li>';
    }).join('');

    pdp.innerHTML = '' +
      '<div class="pdp__gallery">' +
        '<figure class="is-lead" data-scrub>' +
          im.slice(0, 4).map(function (src, i) {
            return '<img class="scrub' + (i ? '' : ' is-on') + '"' +
                   (i ? '' : ' style="view-transition-name:vt-hero"') +
                   ' src="' + src + '" alt="' + (i ? '' : esc(p.brand + ' ' + p.name)) + '"' +
                   (i ? ' loading="lazy"' : '') + '>';
          }).join('') +
          '<span class="scrub__hint micro">Drag to turn</span>' +
          '<span class="scrub__dots">' + im.slice(0, 4).map(function (_, i) {
            return '<i' + (i ? '' : ' class="is-on"') + '></i>';
          }).join('') + '</span>' +
        '</figure>' +
        (strip ? '<div class="pdp__strip">' + strip + '</div>' : '') +
      '</div>' +
      '<div class="pdp__panel">' +
        '<p class="pdp__idx mono">' + pad(idx) + ' <span class="dot">/</span> ' + pad(D.products.length) + '</p>' +
        '<p class="micro faint">' + esc(p.brand) + '</p>' +
        '<h1 class="pdp__title">' + esc(p.name) + '</h1>' +
        '<p class="pdp__price' + (p.retail_inr ? ' has-retail' : '') + '">' +
          inr(p.price_inr) + '</p>' +
        retailLine(p) +
        '<p class="pdp__story">' + esc(p.story) + '</p>' +

        '<div class="health">' +
          '<p class="micro">Product health · ' + health + '%</p>' +
          '<div class="health__bar"><div class="health__fill" style="width:' + health + '%"' +
            (health < 90 ? ' data-low="true"' : '') + '></div></div>' +
          '<p class="faint" style="font-size:var(--fs-small);margin-top:8px">' + esc(p.condition_note) + '</p>' +
        '</div>' +


        '<table class="spec"><tbody>' +
          '<tr><th>Size</th><td>' + esc(p.size) + '</td></tr>' +
          '<tr><th>Material</th><td>' + esc(p.material) + '</td></tr>' +
          '<tr><th>Category</th><td>' + esc(cap(p.category)) + '</td></tr>' +
          (originOf(p) ? '<tr><th>Origin</th><td>' + esc(originOf(p)) + '</td></tr>' : '') +
          '<tr><th>Pieces</th><td>1 of 1 — no restock</td></tr>' +
        '</tbody></table>' +

        (outfit ? '<div class="styled">' +
            '<p class="micro" style="margin-bottom:10px">How we\'d wear it · ' +
              esc(p.outfit.concept) + '</p><ul>' + outfit + '</ul></div>' : '') +

        '<div class="cta">' +
          '<a class="btn btn--solid" href="' + waLink(p) + '" target="_blank" rel="noopener">Ask for this on WhatsApp</a>' +
          '<a class="btn btn--ghost" href="mailto:' + D.brand.contact.email +
            '?subject=' + encodeURIComponent('REWORN — ' + p.brand + ' ' + p.name) + '">Email instead</a>' +
        '</div>' +
      '</div>';

    /* Turntable: the frame follows the pointer across the image, 1:1, so it
       feels like turning the garment rather than watching a slideshow. */
    var scrub = pdp.querySelector('[data-scrub]');
    if (scrub) {
      var shots = scrub.querySelectorAll('.scrub');
      var dots  = scrub.querySelectorAll('.scrub__dots i');
      var at = 0;
      var setFrame = function (i) {
        i = Math.max(0, Math.min(shots.length - 1, i));
        if (i === at) return;
        shots[at].classList.remove('is-on'); dots[at].classList.remove('is-on');
        shots[i].classList.add('is-on');     dots[i].classList.add('is-on');
        at = i;
      };
      var track = function (clientX) {
        var r = scrub.getBoundingClientRect();
        setFrame(Math.floor(((clientX - r.left) / r.width) * shots.length));
      };
      scrub.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse') track(e.clientX);
      });
      scrub.addEventListener('pointerdown', function (e) {
        scrub.setPointerCapture(e.pointerId);
        scrub.classList.add('is-dragging');
        track(e.clientX);
      });
      scrub.addEventListener('pointerup', function () { scrub.classList.remove('is-dragging'); });
      scrub.addEventListener('pointerleave', function () { setFrame(0); });
    }

    var more = document.querySelector('[data-grid="more"]');
    if (more) {
      renderGrid(more, D.products.filter(function (x) {
        return x.id !== p.id && x.category === p.category;
      }).slice(0, 4));
    }
  }

  /* ---------- page-to-page morph ----------
     The travelling image needs the same view-transition-name on both pages,
     and the name must be unique per document. So we tag it at click time and
     clear it when the user comes back (bfcache/back-forward). */
  var VT = 'supports' in CSS && CSS.supports('view-transition-name: a');
  function tagHero(el) {
    document.querySelectorAll('[style*="view-transition-name"]').forEach(function (n) {
      n.style.viewTransitionName = '';
    });
    if (el) el.style.viewTransitionName = 'vt-hero';
  }
  if (VT) {
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a.card');
      if (!a) return;
      tagHero(a.querySelector('.card__media img.is-main'));
    }, true);
    /* returning via back: drop the name so the grid renders normally */
    window.addEventListener('pageshow', function () { tagHero(null); });
  }

  /* ---------- nav state: light over hero, linen bar after ---------- */
  var nav = document.querySelector('.nav');
  var hero = document.querySelector('.hero');
  if (nav) {
    var syncNav = function () {
      var overHero = hero && window.scrollY < hero.offsetHeight - 90;
      nav.classList.toggle('nav--over', !!overHero);
      nav.classList.toggle('nav--solid', !overHero && window.scrollY > 24);
    };
    syncNav();
    window.addEventListener('scroll', syncNav, { passive: true });
    window.addEventListener('resize', syncNav);
  }

  /* ---------- scroll reveal ----------
     Kept only as the no-GSAP fallback. When motion.js boots it owns
     .reveal and .card, so this never runs. */
  function observe(nodes) {
    nodes = [].slice.call(nodes);
    var show = function (n, i) {
      n.style.transitionDelay = (Math.min(i, 5) * 55) + 'ms';
      n.classList.add('is-in');
    };
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(show);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        show(e.target, nodes.indexOf(e.target) % 6);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    nodes.forEach(function (n) { io.observe(n); });
    /* Anything already on screen reveals immediately — no waiting for a scroll
       that may never come on a short viewport. */
    requestAnimationFrame(function () {
      nodes.forEach(function (n, i) {
        var r = n.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) show(n, i);
      });
    });
    /* Hard failsafe. A class alone is not enough: if the transition stalls
       (throttled tab, backgrounded window, low-power mode) the element never
       reaches opacity 1 and the section renders blank. Force the final state
       inline and kill the transition so nothing can leave content invisible. */
    setTimeout(function () {
      nodes.forEach(function (n) {
        n.classList.add('is-in');
        if (getComputedStyle(n).opacity !== '1') {
          n.style.transition = 'none';
          n.style.opacity = '1';
          n.style.transform = 'none';
        }
      });
    }, 1600);
  }
  if (!window.gsap) observe(document.querySelectorAll('.reveal'));
})();
