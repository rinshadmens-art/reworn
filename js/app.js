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
    var list = (p.editorial || []).concat(p.photos || []);
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
    t.finished.then(done, done);
  }

  /* ---------- product cards ---------- */
  function card(p) {
    var im = imgs(p);
    var alt = im[1] || im[0];
    return '' +
      '<a class="card reveal" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        '<span class="card__media">' +
          (p.sold ? '<span class="card__flag card__flag--sold micro">Sold</span>' :
           p.tier === 'hero' ? '<span class="card__flag micro">Piece of the drop</span>' : '') +
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

  function renderGrid(el, items) {
    el.innerHTML = items.length ? items.map(card).join('') :
      '<p class="empty">Nothing in this category yet.</p>';
    observe(el.querySelectorAll('.reveal'));
  }

  /* ---------- home ---------- */
  var homeGrid = document.querySelector('[data-grid="home"]');
  if (homeGrid) {
    renderGrid(homeGrid, D.products.filter(function (p) { return p.tier === 'hero'; }));
  }

  /* ---------- collection ---------- */
  var colGrid = document.querySelector('[data-grid="collection"]');
  if (colGrid) {
    var params = new URLSearchParams(location.search);
    var active = params.get('c') || 'all';

    var draw = function () {
      renderGrid(colGrid, D.products.filter(function (p) {
        return active === 'all' || p.category === active;
      }));
      document.querySelectorAll('[data-filter]').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.filter === active);
      });
    };

    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        active = b.dataset.filter;
        history.replaceState(null, '', active === 'all' ? 'collection.html' : '?c=' + active);
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
    var rest = im.slice(1, 6).concat(p.proof || []);
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
        '<p class="pdp__price">' + inr(p.price_inr) + '</p>' +
        '<p class="pdp__story">' + esc(p.story) + '</p>' +

        '<div class="health">' +
          '<p class="micro">Product health · ' + health + '%</p>' +
          '<div class="health__bar"><div class="health__fill" style="width:' + health + '%"' +
            (health < 90 ? ' data-low="true"' : '') + '></div></div>' +
          '<p class="faint" style="font-size:var(--fs-small);margin-top:8px">' + esc(p.condition_note) + '</p>' +
        '</div>' +

        '<p class="micro faint" style="margin:-14px 0 22px">Tag photographs are unretouched originals.</p>' +
        '<table class="spec"><tbody>' +
          '<tr><th>Size</th><td>' + esc(p.size) + '</td></tr>' +
          '<tr><th>Material</th><td>' + esc(p.material) + '</td></tr>' +
          '<tr><th>Category</th><td>' + esc(p.category) + '</td></tr>' +
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

  /* ---------- scroll reveal ---------- */
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
  observe(document.querySelectorAll('.reveal'));
})();
