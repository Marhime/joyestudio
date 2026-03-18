import type { Ref } from "vue";
import { scheduleRefresh } from "./useScrollManager";

/**
 * Context provided to each breakpoint callback in useSectionReveal.
 * All DOM selection should happen inside the callback — not outside.
 */
export interface RevealContext {
  gsap: any;
  ScrollTrigger: any;
  SplitText: any;
  /** The section element (from the template ref). */
  el: HTMLElement;
  /** Emit an event on the global animation bus. */
  emit: (event: string, ...args: unknown[]) => void;
}

interface SectionRevealOptions {
  /**
   * Section name for automatic animation bus events.
   * When set, emits `section:<name>:enter` and `section:<name>:leave`
   * as the section scrolls in / out of view.
   */
  name?: string;

  /** Desktop animation setup (>= 901px). */
  desktop: (ctx: RevealContext) => (() => void) | void;

  /** Mobile animation setup (<= 900px). */
  mobile?: (ctx: RevealContext) => (() => void) | void;

  /** Reduced motion fallback. Defaults to clearProps on the section. */
  reducedMotion?: (ctx: RevealContext) => (() => void) | void;
}

/**
 * Section animation composable — reduces mm.add boilerplate.
 *
 * Handles:
 *   - onMounted + nextTick timing
 *   - mm.add for desktop / mobile / reducedMotion
 *   - Optional section:enter / section:leave bus events
 *   - scheduleRefresh after setup
 *   - Full cleanup on unmount (mm.revert + gsap.context)
 *
 * Usage:
 *   const sectionRef = useTemplateRef<HTMLElement>('section')
 *
 *   useSectionReveal(sectionRef, {
 *     name: 'about',
 *     desktop: (ctx) => {
 *       ctx.gsap.set('.card', { autoAlpha: 0, yPercent: 15 })
 *       ctx.gsap.to('.card', {
 *         autoAlpha: 1, yPercent: 0, stagger: 0.08,
 *         scrollTrigger: { trigger: ctx.el, start: 'top 80%', invalidateOnRefresh: true },
 *       })
 *     },
 *     mobile: (ctx) => {
 *       // Simpler animation for mobile
 *     },
 *   })
 *
 * Or with presets:
 *   import { fadeUp } from '~/animations/presets'
 *
 *   useSectionReveal(sectionRef, {
 *     name: 'about',
 *     desktop: (ctx) => fadeUp(ctx, { children: '.card' }),
 *   })
 *
 * For complex entrance animations (like Hero) that don't follow this pattern,
 * use useGSAP() directly with the manual mm.add workflow.
 */
export function useSectionReveal(
  triggerRef: Ref<HTMLElement | null | undefined>,
  options: SectionRevealOptions,
) {
  const { gsap, ScrollTrigger, SplitText, mm, BP } = useGSAP();
  const { emit } = useAnimationBus();

  let sectionCtx: any = null;

  onMounted(() => {
    nextTick(() => {
      const el = triggerRef.value;
      if (!el) return;

      const makeCtx = (): RevealContext => ({
        gsap,
        ScrollTrigger,
        SplitText,
        el,
        emit,
      });

      // ── Section visibility events (breakpoint-independent) ──────────────
      if (options.name) {
        const name = options.name;
        sectionCtx = gsap.context(() => {
          ScrollTrigger.create({
            trigger: el,
            start: "top 80%",
            end: "bottom 20%",
            invalidateOnRefresh: true,
            onEnter: () => emit(`section:${name}:enter`, el),
            onLeave: () => emit(`section:${name}:leave`, el),
            onEnterBack: () => emit(`section:${name}:enter`, el),
            onLeaveBack: () => emit(`section:${name}:leave`, el),
          });
        }, el);
      }

      // ── Desktop ─────────────────────────────────────────────────────────
      mm.add(BP.desktop, () => options.desktop(makeCtx()) || (() => {}));

      // ── Mobile ──────────────────────────────────────────────────────────
      if (options.mobile) {
        mm.add(BP.mobile, () => options.mobile!(makeCtx()) || (() => {}));
      }

      // ── Reduced motion ──────────────────────────────────────────────────
      mm.add(BP.reducedMotion, () => {
        if (options.reducedMotion) {
          return options.reducedMotion(makeCtx()) || (() => {});
        }
        // Default: make everything visible immediately
        gsap.set(el, { clearProps: "all" });
        return () => {};
      });

      scheduleRefresh();
    });
  });

  onUnmounted(() => {
    sectionCtx?.revert();
  });
}
