import LocomotiveScroll from "locomotive-scroll";
import { defineNuxtPlugin } from "nuxt/app";

export default defineNuxtPlugin((nuxtApp) => {
  const { $gsap } = useNuxtApp();
  if (import.meta.client) {
    const locomotiveScroll = new LocomotiveScroll({
      //   autoStart: false,
      initCustomTicker: (render) => {
        $gsap.ticker.add(render);
      },
      destroyCustomTicker: (render) => {
        $gsap.ticker.remove(render);
      },
    });

    return {
      provide: { locomotiveScroll },
    };
  }
  return;
});
