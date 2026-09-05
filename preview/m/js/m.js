/* ============================================================
   REWORN. — mobile.

   One file, no dependencies. The desktop site loads GSAP, ScrollTrigger,
   Flip, SplitText, three.js and popmotion; none of that is here, because
   none of it earns its weight on a phone. Scroll-snap and a single
   IntersectionObserver do the work.

   Shares only window.REWORN from ../js/catalog.js, so products and
   prices can never drift between the two sites.
   ============================================================ */
(function () {
  'use strict';

  var D = window.REWORN || {};
  var P = D.products || [];
  var M = D.motion || {};

  /* ---------- helpers, carried over from site/js/app.js ----------
     These encode brand rules, not desktop layout: the wording of the
     WhatsApp message, how a rupee price is written, and the fact that
     category keys are stored lowercase but must never be printed that
     way. Kept identical so the two sites say the same things. */

  function inr(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

  function cap(s) {
    return String(s || '').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function waLink(p) {
    var msg = 'Hi Rinshad — I saw the ' + p.brand + ' ' + p.name +
              ' (' + inr(p.price_inr) + ') on REWORN. Is it still available?';
    return (D.brand && D.brand.contact && D.brand.contact.whatsapp_link) +
           '?text=' + encodeURIComponent(msg);
  }

  /* Catalog paths are written relative to site/, but these pages live in
     site/m/ — so every one of them needs to climb a level first. Without
     this the browser resolves them against /m/ and each image 404s.
     One helper, used by everything that renders a src. */
  function rel(src) {
    if (!src) return '';
    if (/^(https?:)?\/\//.test(src) || src.charAt(0) === '/') return src;
    return '../' + src;
  }

  /* Mobile-weight image, with the desktop path as a fallback so a missing
     mobile build degrades to a heavy image rather than a broken one. */
  function card(p) {
    return rel((p.m && p.m.card) || (p.editorial || p.photos || [])[0] || '');
  }
  function gallery(p) {
    var g = (p.m && p.m.gallery) || [];
    if (!g.length) g = (p.editorial || p.photos || []).slice(0, 6);
    return g.map(rel);
  }

  function byId(id) { return P.filter(function (p) { return p.id === id; })[0]; }
  function param(k) { return new URLSearchParams(location.search).get(k); }

  /* ---------- shared chrome ---------- */

  /* The first tiles are in the opening viewport, so they load eagerly —
     lazy-loading something already on screen just delays the largest
     paint. Everything past the fold stays lazy. */
  /* Where the piece came from, printed only where the archive knows. Seven
     of the archive pieces have no recorded place; inventing a city for them
     is the one thing this brand cannot afford. Mirrors app.js. */
  function originOf(p) {
    var o = p.origin;
    if (!o || !o.place) return '';
    return o.era ? o.place + ', ' + o.era : o.place;
  }

  /* Silent until catalog.json carries a verified figure. */
  function retailLine(p) {
    if (!p.retail_inr) return '';
    return '<p class="m-pdp__retail m-micro">Retails around ' + inr(p.retail_inr) + ' new</p>';
  }

  function tile(p, i) {
    var eager = i != null && i < 4;
    return '<a class="m-in" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
      '<img src="' + esc(card(p)) + '" alt="' + esc(p.brand + ' ' + p.name) +
        '" decoding="async"' +
        (eager ? ' fetchpriority="high"' : ' loading="lazy"') + '>' +
      '<span class="m-meta">' +
        '<span class="m-meta__brand m-micro">' + esc(p.brand) + '</span>' +
        '<span class="m-meta__row">' +
          '<span class="m-meta__name">' + esc(p.name) + '</span>' +
          '<span class="m-meta__price">' + inr(p.price_inr) + '</span>' +
        '</span>' +
        /* The condition score is the fact that most decides whether someone
           trusts a second-hand garment. On the phone it was not on the card
           at all. */
        '<span class="m-meta__health m-micro">Product health <b>' +
          esc(p.condition) + '%</b></span>' +
        '<span class="m-meta__bar"><i style="width:' + Number(p.condition) + '%"' +
          (p.condition < 90 ? ' data-low="true"' : '') + '></i></span>' +
      '</span></a>';
  }

  function askBar(p) {
    var el = document.querySelector('.m-ask');
    if (!el) return;
    if (p) {
      el.href = waLink(p);
      el.innerHTML = 'Ask about this piece';
    } else {
      var wa = (D.brand && D.brand.contact && D.brand.contact.whatsapp_link) || '#';
      el.href = wa;
      el.innerHTML = 'Ask on WhatsApp';
    }
  }

  /* The bar earns its hairline once something scrolls under it, and gets out
     of the way entirely while you are travelling down.

     Same reasoning as the desktop band: a phone screen is short, the bar and
     the WhatsApp strip already own the top and bottom of it, and returning
     from a product restores the scroll to the middle of a card — which put
     the bar over the photograph and left its caption stranded underneath.
     Retreating on the way down gives the garment the whole screen. */
  function stickyBar() {
    var bar = document.querySelector('.m-bar');
    if (!bar) return;
    var lastY = window.scrollY;
    var HIDE_AFTER = 180;   /* never retract inside the first screen */
    var DEADZONE = 8;       /* ignore momentum jitter and rubber-banding */

    var sync = function () {
      var y = window.scrollY;
      bar.classList.toggle('is-stuck', y > 8);
      var dy = y - lastY;
      if (Math.abs(dy) < DEADZONE) return;
      lastY = y;
      /* iOS rubber-banding reports negative scrollY at the top; never hide there. */
      bar.classList.toggle('is-away', dy > 0 && y > HIDE_AFTER);
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  /* ---------- reveal ----------
     Resting state is visible; this only adds a class that plays a
     keyframe with no fill-mode. If it never runs, nothing is hidden. */
  function reveal() {
    var nodes = [].slice.call(document.querySelectorAll('.m-in'));
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window) ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ---------- dots for a scroll-snap rail ---------- */
  function dots(rail, host) {
    if (!rail || !host) return;
    var items = rail.children.length;
    if (items < 2) return;
    host.innerHTML = new Array(items).fill('<i></i>').join('');
    var marks = host.children;
    var sync = function () {
      var i = Math.round(rail.scrollLeft / rail.clientWidth);
      for (var k = 0; k < marks.length; k++) {
        marks[k].classList.toggle('is-on', k === i);
      }
    };
    sync();
    rail.addEventListener('scroll', sync, { passive: true });
  }

  /* ---------- home ---------- */
  function home() {
    var heroImg = document.querySelector('.m-hero__img');
    var amb = M.heroAmbientM || M.heroAmbient;
    if (heroImg && amb) {
      heroImg.style.backgroundImage = 'url("' + rel(amb) + '")';
    }

    var rail = document.querySelector('[data-rail]');
    if (rail) {
      var heroes = P.filter(function (p) { return p.tier === 'hero'; }).slice(0, 6);
      rail.innerHTML = heroes.map(function (p, i) {
        return '<div class="m-rail__item">' + tile(p, i) + '</div>';
      }).join('');
    }
    askBar(null);
  }

  /* ---------- collection ---------- */
  function collection() {
    var grid = document.querySelector('[data-grid]');
    var chips = document.querySelector('[data-chips]');
    if (!grid) return;

    /* the same five routes the desktop hover grid uses, so the two sites
       offer the same ways in */
    var routes = [{ key: 'all', label: 'Everything' }].concat(
      (M.hoverGroups || []).map(function (g) { return { key: g.key, label: g.label }; }));

    var match = function (p, key) {
      if (key === 'all') return true;
      if (key === 'under1500') return p.price_inr <= 1500;
      if (key === 'full') return (p.condition || 0) >= 95;
      return p.category === key;
    };

    var active = param('c') || 'all';

    var draw = function () {
      var list = P.filter(function (p) { return match(p, active); });
      grid.innerHTML = list.length
        ? list.map(function (p, i) { return tile(p, i); }).join('')
        : '<p class="m-p">Nothing here yet.</p>';
      if (chips) {
        [].slice.call(chips.children).forEach(function (b) {
          b.classList.toggle('is-on', b.dataset.key === active);
        });
      }
      reveal();
    };

    if (chips) {
      chips.innerHTML = routes.map(function (r) {
        return '<button class="m-chip" data-key="' + esc(r.key) + '">' +
               esc(r.label) + '</button>';
      }).join('');
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('.m-chip');
        if (!b) return;
        active = b.dataset.key;
        history.replaceState(null, '', active === 'all' ? 'collection.html' : '?c=' + active);
        draw();
      });
    }
    draw();
    askBar(null);
  }

  /* ---------- product ---------- */
  function product() {
    var host = document.querySelector('[data-pdp]');
    if (!host) return;
    var p = byId(param('id')) || P[0];
    if (!p) return;

    document.title = p.brand + ' ' + p.name + ' — REWORN.';

    var frames = gallery(p);
    host.innerHTML =
      '<div class="m-gal" data-gal>' +
        frames.map(function (src, i) {
          return '<img src="' + esc(src) + '" alt="' + esc(p.brand + ' ' + p.name) +
                 '"' + (i ? ' loading="lazy"' : '') + ' decoding="async">';
        }).join('') +
      '</div>' +
      '<div class="m-dots" data-dots></div>' +

      '<div class="m-pdp__head">' +
        '<p class="m-micro m-meta__brand">' + esc(p.brand) + '</p>' +
        '<h1 class="m-pdp__name">' + esc(p.name) + '</h1>' +
        '<p class="m-pdp__price' + (p.retail_inr ? ' has-retail' : '') + '">' +
          inr(p.price_inr) + '</p>' +
        retailLine(p) +
        '<p class="m-pdp__story">' + esc(p.story || '') + '</p>' +
      '</div>' +

      '<div class="m-health">' +
        '<p class="m-micro">Product health &middot; ' + esc(p.condition) + '%</p>' +
        '<div class="m-health__bar"><i style="width:' + Number(p.condition) + '%"' +
          (p.condition < 90 ? ' data-low="true"' : '') + '></i></div>' +
        (p.condition_note ? '<p class="m-health__note">' + esc(p.condition_note) + '</p>' : '') +
      '</div>' +

      '<table class="m-spec">' +
        '<tr><th>Size</th><td>' + esc(p.size) + '</td></tr>' +
        '<tr><th>Material</th><td>' + esc(p.material) + '</td></tr>' +
        '<tr><th>Category</th><td>' + esc(cap(p.category)) + '</td></tr>' +
        (originOf(p) ? '<tr><th>Origin</th><td>' + esc(originOf(p)) + '</td></tr>' : '') +
        '<tr><th>Pieces</th><td>1 of 1 &mdash; no restock</td></tr>' +
      '</table>';

    dots(host.querySelector('[data-gal]'), host.querySelector('[data-dots]'));

    var more = document.querySelector('[data-more]');
    if (more) {
      var rest = P.filter(function (x) {
        return x.id !== p.id && x.category === p.category;
      }).slice(0, 4);
      more.innerHTML = rest.map(function (p) { return tile(p); }).join('');
    }
    askBar(p);
  }

  /* ---------- boot ---------- */
  function init() {
    stickyBar();
    var page = document.body.dataset.page;
    if (page === 'home') home();
    else if (page === 'collection') collection();
    else if (page === 'product') product();
    else askBar(null);
    reveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
