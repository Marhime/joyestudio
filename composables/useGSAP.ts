import { scheduleRefresh } from "./useScrollManager";

/**
 * Breakpoints mirroring assets/scss/utilities/_mixins.scss.
 * Use as keys for mm.add() so breakpoint logic lives in one place.
 */
export const BP = {
  mobile: "(max-width: 900px)",
  desktop: "(min-width: 901px)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
  touch: "(hover: none) and (pointer: coarse)",
} as const;

/**
 * Component-scoped GSAP helper.
 *
 * Returns a gsap.matchMedia() instance (`mm`) tied to the component lifecycle.
 * GSAP automatically reverts all animations inside mm.add() callbacks when:
 *   - the breakpoint no longer matches (e.g. window resize desktop → mobile)
 *   - the component is unmounted
 *
 * No manual ScrollTrigger.refresh() needed in components — use scheduleRefresh()
 * which debounces across all concurrent component mounts into a single call.
 *
 * Usage in a component:
 *   const { gsap, mm, BP, scheduleRefresh } = useGSAP()
 *   onMounted(() => {
 *     nextTick(() => {
 *       mm.add(BP.desktop, () => { ... gsap animations ... })
 *       mm.add(BP.mobile,  () => { ... gsap animations ... })
 *       scheduleRefresh()
 *     })
 *   })
 */
export function useGSAP() {
  const { $gsap, $ScrollTrigger, $Flip } = useNuxtApp();

  // One matchMedia instance per component — GSAP owns the cleanup
  const mm = $gsap.matchMedia();

  onUnmounted(() => mm.revert());

  return {
    gsap: $gsap,
    ScrollTrigger: $ScrollTrigger,
    Flip: $Flip,
    mm,
    BP,
    scheduleRefresh,
  };
}
