import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { defineNuxtPlugin } from "nuxt/app";

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return;

  // Create a Lenis instance for smooth scrolling
  // Cast to any to avoid typings mismatch between Lenis versions
  // (we only use the runtime API here)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lenis: any = new Lenis({
    smooth: true,
    duration: 1.2,
    // small lerp for a snappy but smooth feeling
    lerp: 0.075,
  } as any);

  // Integrate Lenis with ScrollTrigger via scrollerProxy
  // Use the window/document scrolling as the scroller target
  ScrollTrigger.scrollerProxy(window, {
    // `value` can be undefined when used as getter
    scrollTop(value?: number) {
      if (arguments.length && typeof value === "number") {
        // set scroll position via Lenis
        lenis.scrollTo(value);
      }
      // return page scroll position
      return window.scrollY;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    // determine pin type based on transform support
    pinType: document.body.style.transform ? "transform" : "fixed",
  });

  // RAF loop for Lenis; keep ScrollTrigger in sync
  const raf = (time: number) => {
    lenis.raf(time);
    // keep ScrollTrigger updated
    ScrollTrigger.update();
    requestAnimationFrame(raf);
  };

  requestAnimationFrame(raf);

  return {
    provide: { lenis },
  };
});
