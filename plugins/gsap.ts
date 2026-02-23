import { gsap } from "gsap";
import { GSDevTools } from "gsap/GSDevTools";
import { SplitText } from "gsap/SplitText";
import TextPlugin from "gsap/TextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import MorphSVGPlugin from "gsap/MorphSVGPlugin";

export default defineNuxtPlugin((nuxtApp) => {
  // Register commonly used GSAP plugins once
  gsap.registerPlugin(
    SplitText,
    TextPlugin,
    GSDevTools,
    ScrollTrigger,
    Flip,
    MorphSVGPlugin,
  );

  return {
    provide: {
      gsap,
      SplitText,
      GSDevTools,
      ScrollTrigger,
      Flip,
      MorphSVGPlugin,
    },
  };
});
