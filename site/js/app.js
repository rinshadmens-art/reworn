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
        draw();
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

    var strip = im.slice(1, 7).map(function (src) {
      return '<figure><img src="' + src + '" alt="" loading="lazy"></figure>';
    }).join('');

    var health = p.condition;
    var outfit = (p.outfit && p.outfit.pieces || []).map(function (x) {
      return '<li><span>' + esc(x) + '</span></li>';
    }).join('');

    pdp.innerHTML = '' +
      '<div class="pdp__gallery">' +
        '<figure class="is-lead"><img src="' + im[0] + '" alt="' + esc(p.brand + ' ' + p.name) + '"></figure>' +
        (strip ? '<div class="pdp__strip">' + strip + '</div>' : '') +
      '</div>' +
      '<div class="pdp__panel">' +
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

    var more = document.querySelector('[data-grid="more"]');
    if (more) {
      renderGrid(more, D.products.filter(function (x) {
        return x.id !== p.id && x.category === p.category;
      }).slice(0, 4));
    }
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
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    nodes.forEach(function (n) { io.observe(n); });
    /* failsafe: nothing stays invisible, whatever the browser does */
    setTimeout(function () {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
    }, 2500);
  }
  observe(document.querySelectorAll('.reveal'));
})();
