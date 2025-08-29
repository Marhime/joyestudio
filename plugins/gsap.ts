import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import TextPlugin from "gsap/TextPlugin";

export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(SplitText, TextPlugin);

  return {
    provide: { gsap, SplitText },
  };
});
