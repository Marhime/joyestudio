import { gsap } from "gsap";
import { GSDevTools } from "gsap/GSDevTools";
import { SplitText } from "gsap/SplitText";
import TextPlugin from "gsap/TextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default defineNuxtPlugin((nuxtApp) => {
  // Register commonly used GSAP plugins once
  gsap.registerPlugin(SplitText, TextPlugin, GSDevTools, ScrollTrigger);

  return {
    provide: { gsap, SplitText, GSDevTools, ScrollTrigger },
  };
});
