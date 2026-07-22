import { inject, computed } from "vue";
import type { Ref } from "vue";
import {
  canTriggerSmileyAction,
  markSmileyAction,
  beginSmileyGesture,
  endSmileyGesture,
} from "./useSmileyCooldown";
import type {
  SmileyAPI,
  SmileyMode,
  SmileyMoveOptions,
  SmileyAppearOptions,
  SmileyExpression,
  SmileyExpressionOptions,
  SmileyWinkOptions,
  SmileyGlanceOptions,
  SmileyGlanceAccent,
} from "~/types/smiley";

/**
 * Provides a clean, typed interface to the global smiley sphere (PixelBlob3).
 *
 * The sphere lives as a fixed overlay in layouts/default.vue and is shared
 * across all pages and components. This composable abstracts the inject pattern
 * so nothing else needs to know about PixelBlob3 directly.
 *
 * Usage (in any component or page):
 *   const smiley = useSmiley()
 *   smiley.moveTo(el)
 *   smiley.appear()
 *
 * All methods no-op gracefully during SSR or before the sphere is mounted.
 */
export function useSmiley() {
  // Provided by layouts/default.vue — ref to the exposed PixelBlob3 API
  const blobRef = inject<Ref<SmileyAPI | null>>("pixelBlob");

  // Lazy accessor — reads blobRef.value at call time, safe post-mount
  const api = (): SmileyAPI | null | undefined => blobRef?.value;

  return {
    /**
     * Reactive mode — useful to drive UI or guard animations conditionally.
     * e.g. watch(smiley.mode, ...) or v-if="smiley.mode.value !== 'tweening'"
     */
    mode: computed<SmileyMode>(() => api()?.mode.value ?? "free"),

    /**
     * One-shot tween to a DOM element's world position.
     * Best for static placeholders (prefooter, /contact).
     * Returns a Promise — chainable with .then() or await.
     */
    moveTo: (el: HTMLElement, opts?: SmileyMoveOptions): Promise<void> =>
      api()?.moveTo(el, opts) ?? Promise.resolve(),

    /**
     * Per-frame DOM tracking via gsap.ticker.
     * Best for elements that move during their own animation (logos, scroll).
     */
    track: (el: HTMLElement): void => {
      api()?.track(el);
    },

    /**
     * Stop tracking/tweening → return to free mouse-follow mode.
     */
    release: (): void => {
      api()?.release();
    },

    /**
     * "Drop from above" entrance animation.
     * Pass a target element to first position the smiley at that element.
     * Safe to call standalone or after moveTo().
     */
    appear: (el?: HTMLElement, opts?: SmileyAppearOptions): Promise<void> =>
      api()?.appear(el, opts) ?? Promise.resolve(),

    /**
     * Graceful scale-to-zero hide.
     */
    hide: (
      opts?: Pick<SmileyMoveOptions, "duration" | "onComplete">,
    ): Promise<void> => api()?.hide(opts) ?? Promise.resolve(),

    /**
     * Set world-space position directly — for scroll-scrub animations.
     * GSAP tween calls this in onUpdate.
     */
    setScrubPosition: (x: number, y: number, scale: number): void => {
      api()?.setScrubPosition(x, y, scale);
    },

    /**
     * Exit scrub mode, return to free mouse-follow.
     */
    clearScrub: (): void => {
      api()?.clearScrub();
    },

    /**
     * Tween a facial expression on the mouth via shape-key influence.
     *   smiley.setExpression('shocked')        → tween fully shocked
     *   smiley.setExpression('shocked', 0)     → tween back to smile
     * Returns a Promise — chainable with .then() or await.
     */
    setExpression: (
      name: SmileyExpression,
      value?: number,
      opts?: SmileyExpressionOptions,
    ): Promise<void> =>
      api()?.setExpression(name, value, opts) ?? Promise.resolve(),

    /**
     * Fire a rapid wink animation (snappy close → brief hold → smooth open).
     *   smiley.wink()                           → default quick wink
     *   smiley.wink({ holdDuration: 0.3 })      → slower, more emphasized
     */
    wink: (opts?: SmileyWinkOptions): Promise<void> =>
      api()?.wink(opts) ?? Promise.resolve(),

    /**
     * Side glance — turn the head toward a side (yaw in degrees, positive =
     * right), hold, then settle back to neutral.
     *   smiley.glance(22)                     → look right
     *   smiley.glance(-20, { pitchDeg: -5 })  → look left, slightly up
     */
    glance: (yawDeg?: number, opts?: SmileyGlanceOptions): Promise<void> =>
      api()?.glance(yawDeg, opts) ?? Promise.resolve(),

    /**
     * UI acknowledgment: the smiley glances toward the given element —
     * "I see what you're about to do". Direct feedback is NEVER
     * cooldown-gated: successive hovers chain, each retargeting the look
     * from the current pose (the anticipation is skipped on chained takes).
     * Only the wink accent stays cooldown-rare so sweeps don't wink-spam.
     *   <li @mouseenter="smiley.notice($event.currentTarget)">
     */
    notice: (el: HTMLElement): void => {
      const a = api();
      if (!a) return;
      const r = el.getBoundingClientRect();
      const side = r.left + r.width / 2 < window.innerWidth / 2 ? -1 : 1;
      const above = r.top + r.height / 2 < window.innerHeight / 2;
      const accents: SmileyGlanceAccent[] = canTriggerSmileyAction()
        ? [{ at: "pose", fn: () => a.wink() }]
        : [];
      markSmileyAction(); // push ambient gestures away from the interaction
      beginSmileyGesture();
      a.glance(side * 12, {
        pitchDeg: above ? -6 : 4,
        holdDuration: 0.5,
        accents,
      }).finally(endSmileyGesture);
    },

    /** Access the Three.js camera for domRectToWorld calculations. */
    getCamera: () => api()?.getCamera() ?? null,

    /** Access the Three.js renderer for canvas size. */
    getRenderer: () => api()?.getRenderer() ?? null,
  };
}
