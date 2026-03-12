import { ScrollTrigger } from "gsap/ScrollTrigger";
import { debounce } from "~/utils/debounce";

/**
 * Single debounced ScrollTrigger.refresh() shared across the entire app.
 *
 * Why: multiple components calling refresh() on mount (or after resize)
 * would trigger N full recalculations in the same frame. This collapses all
 * calls within 80 ms into one single refresh — regardless of how many
 * components are mounted simultaneously.
 *
 * Usage:  import { scheduleRefresh } from '~/composables/useScrollManager'
 *         scheduleRefresh() // anywhere, anytime
 */
export const scheduleRefresh = debounce(() => {
  ScrollTrigger.refresh();
}, 80);
