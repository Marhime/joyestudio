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

export interface SmileyExpressionOptions {
  /** Tween duration in seconds (default: 0.4). */
  duration?: number;
  /** GSAP ease (default: "back.out(1.6)"). */
  ease?: string;
  /**
   * When true (default), all other known shape keys fade to 0 in parallel
   * so the target expression replaces them. Set false for additive blending.
   */
  exclusive?: boolean;
}

export interface SmileyWinkOptions {
  /** How long the eye takes to close (seconds, default: 0.08). */
  closeDuration?: number;
  /** Time held shut at full close (seconds, default: 0.08). */
  holdDuration?: number;
  /** How long the eye takes to re-open (seconds, default: 0.2). */
  openDuration?: number;
}

/**
 * A facial accent anchored to the glance timeline. `at` is a semantic
 * anchor — 'pose' (the roll landing), 'hold' (0.2s into the moving hold),
 * 'return' (the instant the head starts back) — or a raw timeline position
 * in seconds. Semantic anchors are preferred: they stay correct when a
 * chained take skips the anticipation and lands early. Placed with
 * tl.call() inside the gesture, so accents pause with a hidden tab and die
 * with an interrupted gesture.
 */
export interface SmileyGlanceAccent {
  at: number | "pose" | "hold" | "return";
  fn: () => void;
}

export interface SmileyGlanceOptions {
  /** Vertical look component in degrees, positive = down (default: 0). */
  pitchDeg?: number;
  /**
   * Head-cock tilt in degrees (rotation.z offset). Defaults to
   * -yawDeg * 0.55 so the head tilts toward the side it looks at.
   */
  rollDeg?: number;
  /**
   * Moving-hold duration at the pose (seconds, default: 0.9).
   * Beat timing and eases are fixed — they are the character's signature;
   * randomize amplitude, side and hold only. Squash is derived from
   * gesture size.
   */
  holdDuration?: number;
  /** Facial accents anchored to timeline positions. */
  accents?: SmileyGlanceAccent[];
  /**
   * Per-take timeScale (default: random 0.94-1.06). Accents scale with it —
   * their positions are timeline-local.
   */
  tempo?: number;
}

/** Names of available shape-key expressions in the GLB. Extend as more are added. */
export type SmileyExpression = "shocked" | "happy" | "wink";

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

  /**
   * Tween a shape-key expression on the mouth mesh.
   *   setExpression('shocked')               → tween to fully shocked
   *   setExpression('shocked', 0)            → tween back to smile
   *   setExpression('shocked', 0.5, { duration: 0.6 })  → partial blend
   * No-ops if the GLB has no matching shape key.
   */
  setExpression: (
    name: SmileyExpression,
    value?: number,
    opts?: SmileyExpressionOptions,
  ) => Promise<void>;

  /**
   * Fire a rapid wink animation: snappy close → brief hold → smooth open.
   * Additive (doesn't disturb other expression states). Fire-and-forget;
   * the returned Promise resolves when the eye is fully reopened.
   */
  wink: (opts?: SmileyWinkOptions) => Promise<void>;

  /**
   * Side glance: turn the head toward a side (yaw in degrees, positive =
   * right), hold briefly, then settle back to neutral. Mouse tilt keeps
   * working on top during the glance.
   */
  glance: (yawDeg?: number, opts?: SmileyGlanceOptions) => Promise<void>;

  /** Access the Three.js camera for domRectToWorld calculations. */
  getCamera: () => any;

  /** Access the Three.js renderer for canvas size. */
  getRenderer: () => any;
}
