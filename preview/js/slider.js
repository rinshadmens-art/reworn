/* ============================================================
   SLIDER — port of the "ripple-displacement-slider" reference.
   Shader, uniforms, ripple config and text choreography are the
   reference's; the slides are archive pieces from catalog.js.

   ES module: three.js only ships a module build, and the
   reference is written this way too.
   ============================================================ */
import * as THREE from '../assets/vendor/three.module.js';
import { vertexShader, fragmentShader } from './shaders.js';

const slider = document.querySelector('.slider');
if (slider && window.gsap) {
  const D = window.REWORN || {};
  const slides = (D.motion && D.motion.slides) || [];

  if (slides.length < 2) {
    slider.remove();
  } else {
    gsap.registerPlugin(SplitText);

    let currentIndex = 0;
    let isTransitioning = false;
    let rippleTween = null;

    const counter = slider.querySelector('.slider__count');
    const setCount = (i) => {
      if (counter) counter.textContent =
        String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    };

    function splitTitle(container) {
      const heading = container.querySelector('.slide-title h1');
      if (!heading) return null;
      return SplitText.create(heading, {
        type: 'words, chars', mask: 'chars', wordsClass: 'word', charsClass: 'char'
      });
    }

    function splitDescription(container) {
      const paragraphs = container.querySelectorAll('.slide-description p');
      const allLines = [];
      paragraphs.forEach((p) => {
        const split = SplitText.create(p, { type: 'lines', mask: 'lines', linesClass: 'line' });
        allLines.push(...split.lines);
      });
      return allLines;
    }

    function buildSlideContent(slide) {
      const el = document.createElement('div');
      el.className = 'slide-content';
      el.style.opacity = '0';
      el.innerHTML =
        '<div class="slide-title"><h1>' + slide.title + '</h1></div>' +
        '<div class="slide-description">' +
          '<p>' + slide.description + '</p>' +
          '<p class="slide-meta">' + slide.meta + '</p>' +
        '</div>';
      return el;
    }

    function animateTextOut(container) {
      const titleSplit = splitTitle(container);
      const lines = splitDescription(container);
      const tl = gsap.timeline();
      if (titleSplit) {
        tl.to(titleSplit.chars, { y: '-100%', duration: 0.6, stagger: 0.02, ease: 'power2.inOut' });
      }
      tl.to(lines, { y: '-100%', duration: 0.6, stagger: 0.02, ease: 'power2.inOut' }, 0.1);
      return tl;
    }

    function animateTextIn(container) {
      const titleSplit = splitTitle(container);
      const lines = splitDescription(container);
      const chars = titleSplit ? titleSplit.chars : [];
      gsap.set([chars, lines], { y: '100%' });
      gsap.set(container, { opacity: 1 });
      return gsap.timeline()
        .to(chars, { y: '0%', duration: 0.5, stagger: 0.02, ease: 'power2.inOut' })
        .to(lines, { y: '0%', duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 0.1);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    slider.prepend(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const textures = [];

    for (const slide of slides) {
      const texture = await new Promise((resolve) => textureLoader.load(slide.image, resolve));
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      textures.push(texture);
    }

    const rippleConfig = {
      waveFreq: 25.0,
      wavePow: 0.035,
      waveWidth: 0.5,
      falloff: 10.0,
      boostStrength: 0.5,
      crossfadeWidth: 0.05,
      duration: 3.0,
      endValue: 1.0,
      ease: 'power2.out'
    };

    const uniforms = {
      uTexCurrent: { value: textures[0] },
      uTexNext: { value: textures[1] },
      uProgress: { value: 0.0 },
      uResolution: { value: new THREE.Vector2() },
      /* our archive frames are portrait 1289x1600, not the reference's 1920x1280 */
      uImageRes: { value: new THREE.Vector2(1289, 1600) },
      uWaveFreq: { value: rippleConfig.waveFreq },
      uWavePow: { value: rippleConfig.wavePow },
      uWaveWidth: { value: rippleConfig.waveWidth },
      uFalloff: { value: rippleConfig.falloff },
      uBoostStrength: { value: rippleConfig.boostStrength },
      uCrossfadeWidth: { value: rippleConfig.crossfadeWidth },
      uMobile: { value: window.innerWidth <= 1000 ? 1.0 : 0.0 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms, transparent: true
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    scene.add(plane);

    function getMaxCornerDist() {
      const ratio = window.innerHeight / window.innerWidth;
      const cx = 0.5;
      const cy = 0.5 * ratio;
      return Math.sqrt(cx * cx + cy * cy);
    }

    function handleResize() {
      const width = slider.clientWidth;
      const height = slider.clientHeight;
      renderer.setSize(width, height);
      uniforms.uResolution.value.set(width, height);
      uniforms.uMobile.value = window.innerWidth <= 1000 ? 1.0 : 0.0;
      rippleConfig.endValue = getMaxCornerDist() + rippleConfig.waveWidth;
      rippleConfig.duration = window.innerWidth <= 1000 ? 1.5 : 3.0;
    }

    window.addEventListener('resize', handleResize);
    handleResize();
    setCount(0);

    const initialSlide = slider.querySelector('.slide-content');
    const initialTitle = splitTitle(initialSlide);
    const initialLines = splitDescription(initialSlide);

    if (initialTitle) {
      gsap.fromTo(initialTitle.chars, { y: '100%' },
        { y: '0%', duration: 0.8, stagger: 0.025, ease: 'power2.out' });
    }
    gsap.fromTo(initialLines, { y: '100%' },
      { y: '0%', duration: 0.8, stagger: 0.025, ease: 'power2.out', delay: 0.2 });

    /* This intro is a "from" animation behind a character mask, which is
       the one shape the rest of this project has learned not to trust: if
       the ticker stalls part-way — a throttled tab, a slow first paint —
       the chars are left mid-travel and the mask simply eats the title.
       Observed stuck at y:47px with everything else reporting healthy.

       A real timer outlives a stalled rAF, so after the intro should long
       since have finished, the text is put where it belongs. */
    setTimeout(function () {
      try {
        /* splitTitle and splitDescription hand back array-likes, not
           arrays — concat would nest a NodeList as a single item and the
           filter below would then throw on it, silently taking the whole
           failsafe down with it. A rescue that can fail is not a rescue. */
        var toArr = function (v) { return v ? Array.prototype.slice.call(v) : []; };
        var all = toArr(initialTitle && initialTitle.chars)
          .concat(toArr(initialLines))
          .filter(function (n) { return n && n.nodeType === 1 && n.parentNode; });
        if (!all.length) return;

        var stuck = all.some(function (n) {
          return Math.abs(n.getBoundingClientRect().top -
                          n.parentNode.getBoundingClientRect().top) > 1;
        });
        if (!stuck) return;

        /* Killing first is the whole trick. A throttled tween is not dead,
           it is crawling — set the value without killing and the tween's
           next tick puts it straight back where it was. */
        gsap.killTweensOf(all);
        gsap.set(all, { y: '0%' });
      } catch (e) { /* never let the failsafe be the thing that breaks */ }
    }, 2600);

    function transition() {
      if (isTransitioning) return;
      isTransitioning = true;

      if (rippleTween) {
        rippleTween.kill();
        uniforms.uProgress.value = 0.0;
        rippleTween = null;
      }

      const nextIndex = (currentIndex + 1) % slides.length;
      const currentSlide = slider.querySelector('.slide-content');

      const exitTimeline = animateTextOut(currentSlide);

      uniforms.uTexCurrent.value = textures[currentIndex];
      uniforms.uTexNext.value = textures[nextIndex];
      uniforms.uProgress.value = 0.0;
      setCount(nextIndex);

      let clickUnlocked = false;

      rippleTween = gsap.to(uniforms.uProgress, {
        value: rippleConfig.endValue,
        duration: rippleConfig.duration,
        ease: rippleConfig.ease,
        delay: 0.3,
        onUpdate() {
          if (!clickUnlocked && uniforms.uProgress.value > 0.7) {
            clickUnlocked = true;
            currentIndex = nextIndex;
            isTransitioning = false;
          }
        },
        onComplete() {
          uniforms.uTexCurrent.value = textures[currentIndex];
          uniforms.uProgress.value = 0.0;
          rippleTween = null;
          if (!clickUnlocked) {
            currentIndex = nextIndex;
            isTransitioning = false;
          }
        }
      });

      exitTimeline.then(() => {
        currentSlide.remove();
        const nextSlide = buildSlideContent(slides[nextIndex]);
        slider.appendChild(nextSlide);
        requestAnimationFrame(() => animateTextIn(nextSlide));
      });
    }

    slider.addEventListener('click', transition);
    /* the reference is click-only; a keyboard user would be stuck */
    slider.setAttribute('tabindex', '0');
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); transition(); }
    });

    /* Only render while the slider is actually on screen — a permanent
       rAF loop behind other sections costs battery for nothing. */
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      }, { rootMargin: '100px' }).observe(slider);
    }

    function render() {
      if (visible) renderer.render(scene, camera);
      requestAnimationFrame(render);
    }
    render();
  }
}
