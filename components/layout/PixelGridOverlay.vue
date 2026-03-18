<template>
  <div ref="overlayRef" class="pixel-grid-overlay">
    <div ref="gridContainer" class="pixel-grid">
      <div
        v-for="index in totalSquares"
        :key="index"
        class="pixel-grid__square"
        :ref="(el) => setSquareRef(index - 1, el)"
      >
        <div v-if="showInnerGrid" class="pixel-grid__inner">
          <div
            v-for="innerIndex in 16"
            :key="`${index}-${innerIndex}`"
            class="pixel-grid__inner-cell"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { debounce } from "~/utils/debounce";
import { useGSAP } from "~/composables/useGSAP";

// ── Props ──────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    /** Show 4×4 inner sub-grid inside each square (default: false). */
    showInnerGrid?: boolean;
  }>(),
  {
    showInnerGrid: false,
  },
);

// ── GSAP & Grid API ────────────────────────────────────────────────────────────
const { gsap } = useGSAP();
const grid = usePixelGrid();
const { emit } = useAnimationBus();

// ── State ──────────────────────────────────────────────────────────────────────
const gridContainer = ref<HTMLElement | null>(null);
const overlayRef = ref<HTMLElement | null>(null);
const squareRefs = ref<(Element | null)[]>([]);
const totalSquares = ref(0);
const currentCols = ref(11);

const DESKTOP_COLS = 11;
const MOBILE_COLS = 12;
const MOBILE_BREAKPOINT = 901;

function setSquareRef(index: number, el: any) {
  squareRefs.value[index] = el as Element | null;
}

// ── Grid calculation ───────────────────────────────────────────────────────────
function calculateGridSize() {
  if (!gridContainer.value) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  const cols = w < MOBILE_BREAKPOINT ? MOBILE_COLS : DESKTOP_COLS;
  currentCols.value = cols;

  const squareSize = Math.ceil(w / cols);
  const rows = Math.ceil(h / squareSize) + 1;
  const total = cols * rows;

  totalSquares.value = total;

  gsap.set(gridContainer.value, {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridAutoRows: `${squareSize}px`,
  });

  grid.updateCols(cols);
}

// ── Resize ─────────────────────────────────────────────────────────────────────
const handleResize = debounce(() => {
  calculateGridSize();
  emit("grid:resize");
}, 150);

// ── Register squares after DOM update ─────────────────────────────────────────
watch(totalSquares, async () => {
  await nextTick();
  const validSquares = squareRefs.value.filter(Boolean) as Element[];
  // Squares start fully transparent — color is set by fill() just before animating
  gsap.set(validSquares, { autoAlpha: 0 });
  grid.updateSquares(validSquares);
});

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(() => {
  calculateGridSize();
  window.addEventListener("resize", handleResize);

  nextTick(() => {
    if (gridContainer.value && overlayRef.value) {
      const validSquares = squareRefs.value.filter(Boolean) as Element[];

      // Overlay container hidden by default — shown only during transitions
      gsap.set(overlayRef.value, { autoAlpha: 0 });
      gsap.set(validSquares, { autoAlpha: 0 });

      grid.register(
        gridContainer.value,
        overlayRef.value,
        validSquares,
        currentCols.value,
      );
    }
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

defineExpose({ gridContainer, squareRefs, totalSquares, currentCols });
</script>

<style scoped>
.pixel-grid-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  pointer-events: none;
  z-index: 9999;
}

.pixel-grid {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: grid;
}

.pixel-grid__square {
  background-color: transparent;
  box-sizing: border-box;
  position: relative;
}

.pixel-grid__inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 0;
  opacity: 0.3;
}

.pixel-grid__inner-cell {
  box-sizing: border-box;
}
</style>
