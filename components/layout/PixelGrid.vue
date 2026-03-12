<template>
  <div
    class="pixel-grid-wrapper"
    :style="{
      '--square-size': squareSize + 'px',
      '--cols': COLS,
    }"
    aria-hidden="true"
  >
    <!-- One row-strip per visible row -->
    <div v-for="row in visibleRows" :key="row" class="pixel-grid-row">
      <div
        v-for="col in COLS"
        :key="col"
        class="pixel-grid-cell"
        :class="getCellClass(col - 1, row - 1)"
        :style="getCellStyle(col - 1, row - 1)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { debounce } from "~/utils/debounce";

// ─── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    /** Which rows to show (1-indexed). e.g. [1, 2, 3, 7, 10] */
    rows?: number[];
    /**
     * Blocks to paint. col & row are 1-indexed.
     * size spans that many cells (like grid span).
     */
    blocks?: Array<{
      col: number;
      row: number;
      colSpan?: number;
      rowSpan?: number;
      color?: string;
    }>;
  }>(),
  {
    rows: () => [1, 2],
    blocks: () => [],
  },
);

// ─── Constants ─────────────────────────────────────────────────────────────────
const DESKTOP_COLS = 11;
const MOBILE_COLS = 6;
const MOBILE_BREAKPOINT = 768;

const COLS = computed(() =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
    ? MOBILE_COLS
    : DESKTOP_COLS,
);

// ─── Reactive square size (matches LayoutGridCss exactly) ─────────────────────
const squareSize = ref(0);

const updateSquareSize = () => {
  if (typeof window === "undefined") return;
  const cols =
    window.innerWidth < MOBILE_BREAKPOINT ? MOBILE_COLS : DESKTOP_COLS;
  squareSize.value = Math.ceil(window.innerWidth / cols);
};

const handleResize = debounce(updateSquareSize, 150);

onMounted(() => {
  updateSquareSize();
  window.addEventListener("resize", handleResize);
});
onUnmounted(() => window.removeEventListener("resize", handleResize));

// ─── Sorted unique rows to render ─────────────────────────────────────────────
const visibleRows = computed(() =>
  [...new Set(props.rows)].sort((a, b) => a - b),
);

// ─── Block lookup: "col-row" → block ──────────────────────────────────────────
const blockMap = computed(() => {
  const map = new Map<string, (typeof props.blocks)[0]>();
  for (const b of props.blocks) {
    map.set(`${b.col - 1}-${b.row - 1}`, b);
  }
  return map;
});

const getCellBlock = (col: number, row: number) =>
  blockMap.value.get(`${col}-${row}`) ?? null;

const getCellClass = (col: number, row: number) => {
  const b = getCellBlock(col, row);
  return b ? "pixel-grid-cell--filled" : "";
};

const getCellStyle = (col: number, row: number): Record<string, string> => {
  const b = getCellBlock(col, row);
  if (!b) return {};
  const style: Record<string, string> = {};
  if (b.color) style.backgroundColor = b.color;
  if (b.colSpan && b.colSpan > 1) style.gridColumn = `span ${b.colSpan}`;
  if (b.rowSpan && b.rowSpan > 1) style.gridRow = `span ${b.rowSpan}`;
  return style;
};
</script>

<style scoped>
/* 
  The wrapper stacks row-strips vertically.
  Each row is a 11-column grid of squareSize × squareSize cells.
  This matches LayoutGridCss / LayoutGrid canvas perfectly because
  squareSize = Math.ceil(innerWidth / 11).
*/
.pixel-grid-wrapper {
  width: 100%;
  pointer-events: none;
}

.pixel-grid-row {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--square-size));
  grid-template-rows: var(--square-size);
  width: calc(var(--square-size) * var(--cols));
  height: var(--square-size);
}

.pixel-grid-cell {
  width: var(--square-size);
  height: var(--square-size);
  box-sizing: border-box;
}

.pixel-grid-cell--filled {
  background-color: var(--color-blue);
}
</style>
