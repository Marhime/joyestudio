import type { Ref, TransitionProps } from "vue";
import type { SmileyAPI } from "~/types/smiley";

/**
 * Callback type for page entrance animations.
 * Inject in any page with:
 *   const onPageEnter = inject<PageEnterHook>("onPageEnter")!
 */
export type PageEnterHook = (cb: () => void) => void;

/**
 * GSAP pixel-grid page transition — Nuxt 4 correct pattern.
 *
 * <NuxtPage :transition="transition" /> passes the object to Vue's internal
 * <Transition>, which calls JS hooks and awaits done() before swapping pages.
 * This is the only reliable way to block navigation until GSAP completes.
 *
 * Lifecycle (A → B):
 *   onBeforeLeave  → Lenis stops
 *   onLeave        → kill STs → fill() covers screen → scrollTo(0) → done()
 *   onBeforeEnter  → page B mounts behind grid
 *   onEnter        → nextTick×2 (child onMounted + their gsap.set run)
 *                  → dissolve() reveals page → done()
 *   onAfterEnter   → Lenis resumes → ST.refresh → onPageEnter callback fires
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PAGE ENTRANCE ANIMATION PATTERN
 * ─────────────────────────────────────────────────────────────────────────────
 * Use this in every page component (inside onMounted → nextTick):
 *
 *   const onPageEnter = inject<PageEnterHook>("onPageEnter")!
 *   const { gsap, mm, BP, scheduleRefresh } = useGSAP()
 *
 *   onMounted(() => {
 *     nextTick(() => {
 *       // ① Set hidden initial states inside mm.add while grid covers screen
 *       mm.add(BP.desktop, () => {
 *         gsap.set(titleRef.value, { autoAlpha: 0, yPercent: 8 })
 *         return () => {}
 *       })
 *       scheduleRefresh()
 *
 *       // ② Register entrance timeline — fires after dissolve + ST.refresh
 *       //    On first load (no active transition), fires on next animation frame.
 *       onPageEnter(() => {
 *         gsap.timeline()
 *           .to(titleRef.value, { autoAlpha: 1, yPercent: 0, duration: 0.9, ease: "power3.out" })
 *       })
 *     })
 *   })
 */
export function usePageTransition(smiley?: Ref<SmileyAPI | null>) {
  // Singleton composable called from app.vue — not a component setup, so useGSAP()
  // is not appropriate. Direct nuxtApp access is correct for fire-and-forget ST calls.
  const nuxtApp = useNuxtApp();
  const ScrollTrigger = nuxtApp.$ScrollTrigger as any;
  const { emit } = useAnimationBus();
  const grid = usePixelGrid();
  const router = useRouter();

  const isTransitioning = ref(false);

  const viewportCenter = () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  // One-shot callback registered by the incoming page.
  // Fired in onAfterEnter — after dissolve, Lenis resume, and ST.refresh.
  const afterEnterCb = ref<(() => void) | null>(null);

  // Capture the LEAVING page's color so fill() uses the inverse.
  // router.beforeEach fires before Vue's <Transition>, so `from` is still the old page.
  const pendingColor = ref("var(--color-blue)");

  router.beforeEach((_to, from) => {
    const fromColor = (from.meta.pageColor as string) ?? "var(--color-white)";
    // Inverse: white → blue, anything else (blue, rose, …) → white
    pendingColor.value =
      fromColor === "var(--color-white)"
        ? "var(--color-blue)"
        : "var(--color-white)";
  });

  /**
   * Register a one-shot callback that fires after the transition completes.
   * Provided via app.vue — inject in pages with:
   *   const onPageEnter = inject<PageEnterHook>("onPageEnter")!
   */
  const onPageEnter: PageEnterHook = (cb) => {
    if (isTransitioning.value) {
      // Store it — onAfterEnter will call it after dissolve + ST.refresh
      afterEnterCb.value = cb;
    } else {
      // First load: no transition active, fire after next paint
      requestAnimationFrame(() => cb());
    }
  };

  const transition: TransitionProps = {
    css: false,
    mode: "out-in",

    onBeforeLeave() {
      isTransitioning.value = true;
      (nuxtApp.$lenis as any)?.stop?.();
      emit("page:beforeLeave", {});
    },

    async onLeave(_el: Element, done: () => void) {
      emit("page:leave", {});

      // Kill active ScrollTriggers (hero scrub etc.) before fill
      ScrollTrigger?.getAll?.()?.forEach((st: any) => st.kill(false));

      // The wall RADIATES from the smiley: it appears at his departure
      // point and crystallizes outward from UNDER him — he holds his
      // ground above it (his canvas out-z-indexes the grid), visibly the
      // epicenter of the wall, never buried by it.
      const seed = smiley?.value?.getScreenPosition() ?? viewportCenter();
      await grid.fillRadial(pendingColor.value, seed);

      // Scroll to top while screen is covered
      (nuxtApp.$lenis as any)?.scrollTo?.(0, { immediate: true });
      window.scrollTo(0, 0);

      done(); // Vue removes old page, mounts new page behind the grid
      emit("page:afterLeave", {});
    },

    onBeforeEnter() {
      emit("page:beforeEnter", {});
    },

    async onEnter(_el: Element, done: () => void) {
      // 1st nextTick: new page onMounted hooks run
      // 2nd nextTick: inner nextTick callbacks inside onMounted run
      //   (these set initial gsap states: autoAlpha:0, xPercent:-12, etc.)
      await nextTick();
      await nextTick();

      emit("page:enter", {});

      // The wall BLOWS OPEN from the entry anchor — the landing zone
      // clears first, so the smiley's comet (launched on the same beat,
      // flying OVER the wall from his departure point) recondenses on a
      // clean background while the wave sweeps to the edges.
      const entry = document.querySelector<HTMLElement>("[data-smiley-entry]");
      let seed = viewportCenter();
      if (entry) {
        const r = entry.getBoundingClientRect();
        if (r.width > 4 && r.height > 4) {
          seed = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      await grid.dissolveRadial(seed);

      done();
    },

    onAfterEnter() {
      isTransitioning.value = false;
      (nuxtApp.$lenis as any)?.start?.();
      ScrollTrigger?.refresh?.();
      emit("page:afterEnter", {});

      // Fire the page's entrance callback now that:
      // – grid is gone (dissolve complete)
      // – Lenis is running
      // – ScrollTrigger is refreshed
      const cb = afterEnterCb.value;
      afterEnterCb.value = null;
      cb?.();
    },
  };

  return { transition, isTransitioning, onPageEnter };
}
