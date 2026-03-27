import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { defineNuxtPlugin } from "nuxt/app";
import { useRAFManager } from "~/composables/useRAFManager";

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return;

  const rafManager = useRAFManager();

  // Create a Lenis instance for smooth scrolling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lenis: any = new Lenis({
    smooth: true,
    duration: 1.2,
    // small lerp for a snappy but smooth feeling
    lerp: 0.075,
  } as any);

  // Integrate Lenis with ScrollTrigger via scrollerProxy
  ScrollTrigger.scrollerProxy(window, {
    scrollTop(value?: number) {
      if (arguments.length && typeof value === "number") {
        lenis.scrollTo(value);
      }
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
    pinType: document.body.style.transform ? "transform" : "fixed",
  });

  // Register Lenis in the unified RAF loop
  rafManager.register("lenis", (time: number) => {
    lenis.raf(time);
    ScrollTrigger.update();
  });

  return {
    provide: { lenis },
  };
});
