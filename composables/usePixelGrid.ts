import { scheduleRefresh } from "./useScrollManager";

interface FillOptions {
  /** Duration per square (default: 0.3) */
  duration?: number;
  /** Total stagger spread (default: 0.3) */
  stagger?: number;
  ease?: string;
}

/** A point in viewport CSS px — the seed of a radial wavefront. */
export interface GridOrigin {
  x: number;
  y: number;
}

interface RadialOptions {
  /** Duration per square (default: 0.24 fill / 0.26 dissolve) */
  duration?: number;
  /** Wavefront spread — total delay from seed to farthest cell (default: 0.75 / 0.9) */
  amount?: number;
  /** Per-square ease */
  ease?: string;
  /** Wavefront shaping exponent: >1 decelerates outward, <1 accelerates */
  wave?: number;
  /** Beat before the first square moves (default: 0) — lets a cause read first */
  delay?: number;
}

interface DissolveOptions {
  /** Duration per square (default: 0.3) */
  duration?: number;
  /** Total stagger spread (default: 0.3) */
  stagger?: number;
  ease?: string;
}

// ── Module-level singleton state ──────────────────────────────────────────────
const _overlay = ref<HTMLElement | null>(null);
const _container = ref<HTMLElement | null>(null);
const _squares = ref<Element[]>([]);
const _cols = ref(11);
const _registered = ref(false);

/**
 * Singleton composable controlling the layout-level PixelGrid.
 *
 * The PixelGrid component calls `register()` on mount to hand over its DOM refs.
 * Every other consumer (page transitions, hero dissolve) accesses the same
 * shared state through this composable.
 *
 * Usage:
 *   const grid = usePixelGrid()
 *   await grid.fill('var(--color-blue)')   // pixels appear with random stagger
 *   await grid.dissolve()                  // pixels disappear with random stagger
 *   grid.getRows("random")                   // get squares by row for custom timelines
 */
export function usePixelGrid() {
  // Lazy accessor — usePixelGrid is a singleton called from non-component contexts
  // (page transitions), so it can't use useGSAP(). Direct gsap access is correct here
  // since we only fire one-shot tweens (no MatchMedia / ScrollTrigger cleanup needed).
  const gsap = useNuxtApp().$gsap as any;

  /** Called by PixelGridOverlay.vue on mount to register DOM handles. */
  function register(
    container: HTMLElement,
    overlay: HTMLElement,
    squares: Element[],
    cols: number,
  ) {
    _overlay.value = overlay;
    _container.value = container;
    _squares.value = squares;
    _cols.value = cols;
    _registered.value = true;
  }

  /** Update column count after resize (called by PixelGrid). */
  function updateCols(cols: number) {
    _cols.value = cols;
  }

  /** Update squares ref after DOM re-render (called by PixelGrid). */
  function updateSquares(squares: Element[]) {
    _squares.value = squares;
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  function getContainer() {
    return _container.value;
  }

  function getSquares() {
    return _squares.value;
  }

  function getCols() {
    return _cols.value;
  }

  /** Return squares grouped by row indices (0-based). */
  function getRows(rowNumbers: number[]): Element[][] {
    const cols = _cols.value;
    const squares = _squares.value;
    return rowNumbers.map((rowNum) => {
      const rowSquares: Element[] = [];
      for (let i = rowNum * cols; i < (rowNum + 1) * cols; i++) {
        const sq = squares[i];
        if (sq) rowSquares.push(sq);
      }
      return rowSquares;
    });
  }

  /** Return all squares except those at the given indices. */
  function getAllSquaresExcept(excludeIndices: number[]): Element[] {
    return _squares.value.filter((_, i) => !excludeIndices.includes(i));
  }

  /** Get the index of a square in the flat array. */
  function indexOf(sq: Element): number {
    return _squares.value.indexOf(sq);
  }

  // ── Animations ────────────────────────────────────────────────────────────

  /**
   * Fill the grid: set color, then animate all squares visible.
   * Stagger from random for a pixelated wipe-in effect.
   */
  function fill(color: string, opts: FillOptions = {}): Promise<void> {
    const { duration = 0.3, stagger = 1, ease = "expo.in" } = opts;

    // If _squares was cleared (e.g. after HMR), re-acquire from DOM
    if (!_squares.value.length) {
      const fromDom = Array.from(
        document.querySelectorAll(".pixel-grid__square"),
      ) as Element[];
      if (fromDom.length) {
        _squares.value = fromDom;
        _registered.value = true;
      }
    }

    const squares = _squares.value;
    if (!squares.length) return Promise.resolve();

    // Show the overlay container, then set squares transparent with target color
    if (_overlay.value) gsap.set(_overlay.value, { autoAlpha: 1 });
    gsap.set(squares, { backgroundColor: color, autoAlpha: 0 });

    return new Promise((resolve) => {
      gsap.to(squares, {
        autoAlpha: 1,
        duration,
        ease,
        overwrite: true,
        stagger: { from: "random", amount: stagger },
        onComplete: resolve,
      });
    });
  }

  /**
   * Dissolve the grid: animate all squares invisible.
   * Stagger from random for a pixelated wipe-out effect.
   */
  function dissolve(opts: DissolveOptions = {}): Promise<void> {
    const { duration = 0.3, stagger = 1, ease = "expo.out" } = opts;

    // Same DOM fallback as fill() — handles HMR state reset
    if (!_squares.value.length) {
      const fromDom = Array.from(
        document.querySelectorAll(".pixel-grid__square"),
      ) as Element[];
      if (fromDom.length) {
        _squares.value = fromDom;
        _registered.value = true;
      }
    }

    const squares = _squares.value;
    if (!squares.length) return Promise.resolve();

    return new Promise((resolve) => {
      gsap.to(squares, {
        autoAlpha: 0,
        duration,
        ease,
        overwrite: true,
        stagger: { from: "random", amount: stagger },
        onComplete: () => {
          // Hide the overlay container — grid is invisible until the next transition
          if (_overlay.value) gsap.set(_overlay.value, { autoAlpha: 0 });
          resolve();
        },
      });
    });
  }

  // ── Radial wavefront ──────────────────────────────────────────────────────
  // ONE law for both directions: every square's delay is proportional to its
  // distance from a seed point (the smiley's position on leave, the entry
  // anchor on enter) — the character CAUSES the wall, the wall obeys him.
  // Distances are min-max normalized so an off-screen seed still produces a
  // full 0→1 wavefront instead of dead air + a simultaneous pop.

  /** Per-square delays ∝ normalized distance from `origin` (viewport px). */
  function radialDelays(origin: GridOrigin, amount: number, wave: number) {
    const squares = _squares.value;
    const cols = _cols.value;
    const cell = window.innerWidth / cols;
    const sx = origin.x / cell;
    const sy = origin.y / cell;
    const dists = squares.map((_, i) => {
      const c = (i % cols) + 0.5;
      const r = Math.floor(i / cols) + 0.5;
      return Math.hypot(c - sx, r - sy);
    });
    const min = Math.min(...dists);
    const span = Math.max(...dists) - min || 1;
    return dists.map(
      (d) => amount * Math.pow((d - min) / span, wave),
    );
  }

  /** Re-acquire squares from the DOM after HMR wiped module state. */
  function ensureSquares(): Element[] {
    if (!_squares.value.length) {
      const fromDom = Array.from(
        document.querySelectorAll(".pixel-grid__square"),
      ) as Element[];
      if (fromDom.length) {
        _squares.value = fromDom;
        _registered.value = true;
      }
    }
    return _squares.value;
  }

  /**
   * Fill the grid as a shockwave RADIATING from `origin` — the blocks
   * nearest the seed land first, the wave decelerates as it spreads
   * (energy dissipating).
   */
  function fillRadial(
    color: string,
    origin: GridOrigin,
    opts: RadialOptions = {},
  ): Promise<void> {
    const {
      duration = 0.24,
      amount = 0.75,
      ease = "power2.in",
      wave = 1.25,
      delay = 0,
    } = opts;
    const squares = ensureSquares();
    if (!squares.length) return Promise.resolve();

    if (_overlay.value) gsap.set(_overlay.value, { autoAlpha: 1 });
    gsap.set(squares, { backgroundColor: color, autoAlpha: 0 });

    const delays = radialDelays(origin, amount, wave);
    return new Promise((resolve) => {
      gsap.to(squares, {
        autoAlpha: 1,
        duration,
        ease,
        overwrite: true,
        stagger: (i: number) => delay + (delays[i] ?? 0),
        onComplete: resolve,
      });
    });
  }

  /**
   * Dissolve the grid as a wave BLOWING OPEN from `origin` — the blocks
   * nearest the seed clear first (the landing zone opens for the arriving
   * swarm), the release accelerates outward.
   */
  function dissolveRadial(
    origin: GridOrigin,
    opts: RadialOptions = {},
  ): Promise<void> {
    const { duration = 0.26, amount = 0.9, ease = "expo.out", wave = 0.85 } =
      opts;
    const squares = ensureSquares();
    if (!squares.length) return Promise.resolve();

    const delays = radialDelays(origin, amount, wave);
    return new Promise((resolve) => {
      gsap.to(squares, {
        autoAlpha: 0,
        duration,
        ease,
        overwrite: true,
        stagger: (i: number) => delays[i],
        onComplete: () => {
          if (_overlay.value) gsap.set(_overlay.value, { autoAlpha: 0 });
          resolve();
        },
      });
    });
  }

  /** Instantly set color on all squares (no animation). */
  function setColor(color: string) {
    gsap.set(_squares.value, { backgroundColor: color });
  }

  /** Instantly show or hide all squares (no animation). */
  function setVisible(visible: boolean) {
    gsap.set(_squares.value, { autoAlpha: visible ? 1 : 0 });
  }

  return {
    // Registration (PixelGrid.vue only)
    register,
    updateCols,
    updateSquares,

    // Queries (hero dissolve, custom timelines)
    getContainer,
    getSquares,
    getCols,
    getRows,
    getAllSquaresExcept,
    indexOf,

    // Animations (page transition, section transitions)
    fill,
    dissolve,
    fillRadial,
    dissolveRadial,
    setColor,
    setVisible,

    // Reactive state (read-only)
    isRegistered: readonly(_registered),
  };
}
