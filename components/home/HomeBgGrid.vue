<template>
  <div ref="overlayRef" class="home-bg-grid" aria-hidden="true">
    <div ref="gridContainer" class="home-bg-grid__inner">
      <div
        v-for="index in totalSquares"
        :key="index"
        class="home-bg-grid__square"
        :ref="(el) => setSquareRef(index - 1, el)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { debounce } from "~/utils/debounce";
import { useGSAP } from "~/composables/useGSAP";

// useGSAP() is called in <script setup> — lifecycle hooks are correctly registered
const { gsap } = useGSAP();

// ── State (component-local, NOT a singleton) ───────────────────────────────────
const gridContainer = ref<HTMLElement | null>(null);
const squareRefs = ref<(Element | null)[]>([]);
const squaresArr = ref<Element[]>([]);
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

  totalSquares.value = cols * rows;

  gsap.set(gridContainer.value, {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridAutoRows: `${squareSize}px`,
  });
}

// ── Rebuild + fill squares after every DOM update (mount + resize) ─────────────
// flush:'post' guarantees template refs (:ref on v-for) are populated
watch(
  totalSquares,
  () => {
    nextTick(() => {
      const valid = squareRefs.value.filter(Boolean) as Element[];
      squaresArr.value = valid;
      // Start fully filled in blue — this IS the hero section background
      gsap.set(valid, { autoAlpha: 1, backgroundColor: "var(--color-blue)" });
    });
  },
  { flush: "post" },
);

// ── Resize ─────────────────────────────────────────────────────────────────────
const handleResize = debounce(() => {
  calculateGridSize();
}, 150);

// ── Lifecycle ──────────────────────────────────────────────────────────────────
onMounted(() => {
  calculateGridSize();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

// ── Exposed API — read by Hero.vue to pass into setupHeroGridDissolve ──────────
defineExpose({
  getGridData: () => ({
    squares: squaresArr.value,
    cols: currentCols.value,
    container: gridContainer.value,
  }),
});
</script>

<style scoped>
.home-bg-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.home-bg-grid__inner {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: grid;
}

.home-bg-grid__square {
  box-sizing: border-box;
}
</style>
