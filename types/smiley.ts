import type { Ref } from "vue";

/** Operational mode — only one can be active at a time. */
export type SmileyMode = "free" | "tracking" | "tweening" | "static";

export interface SmileyMoveOptions {
  duration?: number;
  ease?: string;
  /** Called when the tween fully completes. */
  onComplete?: () => void;
}

export interface SmileyAppearOptions {
  /** Drop distance in world units (default: 14). */
  dropOffset?: number;
  duration?: number;
  ease?: string;
  onComplete?: () => void;
}

/**
 * Public contract exposed by PixelBlob3 via defineExpose.
 * useSmiley.ts consumes this type — nothing else should import PixelBlob3 directly.
 */
export interface SmileyAPI {
  /** Current operational mode (reactive). */
  mode: Ref<SmileyMode>;

  /**
   * One-shot tween to a DOM element's position.
   * Reads getBoundingClientRect() once, converts to world space, tweens targetBase.
   * Returns a Promise that resolves when the tween completes.
   */
  moveTo: (el: HTMLElement, opts?: SmileyMoveOptions) => Promise<void>;

  /**
   * Per-frame DOM tracking (gsap.ticker).
   * Use for elements that move dynamically (e.g. logos during scroll animation).
   */
  track: (el: HTMLElement) => void;

  /**
   * Stop tracking or tweening — return to free mouse-follow mode.
   */
  release: () => void;

  /**
   * "Drop from above" entrance animation.
   * If el is provided, positions target at that element first.
   * Safe to call standalone or chained after moveTo.
   */
  appear: (el?: HTMLElement, opts?: SmileyAppearOptions) => Promise<void>;

  /**
   * Scale the smiley down to 0 (graceful hide).
   */
  hide: (
    opts?: Pick<SmileyMoveOptions, "duration" | "onComplete">,
  ) => Promise<void>;

  /** Set world-space position directly (for scroll-scrub animations). */
  setScrubPosition: (x: number, y: number, scale: number) => void;

  /** Exit scrub mode, return to free mouse-follow. */
  clearScrub: () => void;

  /** Access the Three.js camera for domRectToWorld calculations. */
  getCamera: () => any;

  /** Access the Three.js renderer for canvas size. */
  getRenderer: () => any;
}
