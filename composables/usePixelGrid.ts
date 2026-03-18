import { scheduleRefresh } from "./useScrollManager";

interface FillOptions {
  /** Duration per square (default: 0.3) */
  duration?: number;
  /** Total stagger spread (default: 0.3) */
  stagger?: number;
  ease?: string;
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
 *   grid.getRows([0, 1])                   // get squares by row for custom timelines
 */
export function usePixelGrid() {
  const { $gsap: gsap } = useNuxtApp();

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
    const { duration = 0.3, stagger = 0.3, ease = "power1.inOut" } = opts;

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
    const { duration = 0.3, stagger = 0.3, ease = "power1.inOut" } = opts;

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
    setColor,
    setVisible,

    // Reactive state (read-only)
    isRegistered: readonly(_registered),
  };
}
