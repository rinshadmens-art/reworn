/* ============================================================
   FOLDERS — port of the "hover" reference script.
   Rotations, easing and the disabled-sibling behaviour are the
   reference's; the tabs are built from the archive.
   ============================================================ */
(function () {
  'use strict';

  var host = document.querySelector('.folders');
  if (!host || !window.gsap) return;

  var D = window.REWORN || {};
  var M = D.motion || {};
  var groups = M.folderTabs || [];
  if (!groups.length) { host.remove(); return; }

  /* --- build: two tabs per row, as in the reference --- */
  var VARIANTS = ['variant-1', 'variant-2', 'variant-2', 'variant-3', 'variant-1', 'variant-2'];
  var rows = [];
  for (var i = 0; i < groups.length; i += 2) rows.push(groups.slice(i, i + 2));

  host.innerHTML = rows.map(function (row, r) {
    return '<div class="row">' + row.map(function (g, c) {
      var n = r * 2 + c;
      return '<a class="folder ' + VARIANTS[n % VARIANTS.length] + '" href="' + g.href + '">' +
               '<div class="folder-preview">' +
                 g.shots.slice(0, 3).map(function (src) {
                   return '<div class="folder-preview-img"><img src="' + src + '" alt=""></div>';
                 }).join('') +
               '</div>' +
               '<div class="folder-wrapper">' +
                 '<div class="folder-index"><p>' + String(n + 1).padStart(2, '0') + '</p></div>' +
                 '<div class="folder-name"><h1>' + g.label + '</h1></div>' +
               '</div>' +
             '</a>';
    }).join('') + '</div>';
  }).join('');

  var folders = [].slice.call(document.querySelectorAll('.folder'));
  var folderWrappers = [].slice.call(document.querySelectorAll('.folder-wrapper'));
  var previewImagesAll = [].slice.call(document.querySelectorAll('.folder-preview-img'));

  var isMobile = window.innerWidth < 1000;

  function setInitialPositions() {
    gsap.set(folderWrappers, { y: isMobile ? 0 : 25 });
    gsap.set(previewImagesAll, { y: '0%', rotation: 0 });
    folders.forEach(function (folder) { folder.classList.remove('disabled'); });
  }

  function handleEnter(folder, index) {
    if (isMobile) return;

    var images = folder.querySelectorAll('.folder-preview-img');

    folders.forEach(function (f) {
      if (f !== folder) f.classList.add('disabled');
    });

    gsap.to(folderWrappers[index], {
      y: 0, duration: 0.25, ease: 'back.out(1.7)'
    });

    images.forEach(function (img, i) {
      var rotation =
        i === 0 ? gsap.utils.random(-20, -10)
        : i === 1 ? gsap.utils.random(-10, 10)
        : gsap.utils.random(10, 20);

      gsap.to(img, {
        y: '-100%', rotation: rotation,
        duration: 0.25, ease: 'back.out(1.7)', delay: i * 0.025
      });
    });
  }

  function handleLeave(index) {
    if (isMobile) return;

    var images = folders[index].querySelectorAll('.folder-preview-img');
    folders.forEach(function (f) { f.classList.remove('disabled'); });

    gsap.to(folderWrappers[index], {
      y: 25, duration: 0.25, ease: 'back.out(1.7)'
    });

    images.forEach(function (img, i) {
      gsap.to(img, {
        y: '0%', rotation: 0,
        duration: 0.25, ease: 'back.out(1.7)', delay: i * 0.05
      });
    });
  }

  folders.forEach(function (folder, index) {
    folder.addEventListener('mouseenter', function () { handleEnter(folder, index); });
    folder.addEventListener('mouseleave', function () { handleLeave(index); });
  });

  window.addEventListener('resize', function () {
    var newIsMobile = window.innerWidth < 1000;
    if (newIsMobile !== isMobile) {
      isMobile = newIsMobile;
      setInitialPositions();
    }
  });

  setInitialPositions();
})();
