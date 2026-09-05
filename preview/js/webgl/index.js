/* ============================================================
   STICKY IMAGE — port of the "StickyImageEffect" reference.

   Showcase / GLManager / Grab / reach / Slides / Cursor are the
   reference's own modules, untouched apart from three import
   paths and PlaneBufferGeometry -> PlaneGeometry (removed in
   three r150). This entry point feeds them the archive.
   ============================================================ */
import { Showcase } from "./Showcase.js?v=1788623513";
import { Slides } from "./Slides.js?v=1788623513";
import { Cursor } from "./Cursor.js?v=1788623513";

const container = document.getElementById("gl-app");
const cursorEl = document.querySelector(".cursor");

if (container && cursorEl) {
  const D = window.REWORN || {};
  const data = (D.motion && D.motion.sticky) || [];

  /* WebGL on a phone with a drag interaction fights the browser's own
     scroll and drains battery; the markup falls back to a plain list. */
  const capable = window.WebGLRenderingContext &&
    matchMedia("(min-width: 1000px)").matches &&
    matchMedia("(hover: hover)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!data.length || !capable) {
    container.closest(".gl-section")?.classList.add("gl-section--fallback");
  } else {
    const cursor = new Cursor(cursorEl);
    const slides = new Slides(data);
    const showcase = new Showcase(data, {
      onActiveIndexChange: (activeIndex) => slides.onActiveIndexChange(activeIndex),
      onIndexChange: (index) => slides.onMove(index),
      onZoomOutStart: () => { cursor.enter(); slides.appear(); },
      onZoomOutFinish: () => {},
      onFullscreenStart: ({ activeIndex }) => { cursor.leave(); slides.disperse(activeIndex); },
      onFullscreenFinish: () => {}
    });

    showcase.mount(container);
    slides.mount(container);
    showcase.render();

    window.addEventListener("resize", () => showcase.onResize());
    window.addEventListener("mousemove", (ev) => showcase.onMouseMove(ev));

    /* Each slide's "Read more" should reach the actual piece. */
    container.querySelectorAll(".slide").forEach((slide, i) => {
      const link = slide.querySelector(".slide-more");
      if (link && data[i]) link.href = "product.html?id=" + data[i].id;
    });
  }
}
