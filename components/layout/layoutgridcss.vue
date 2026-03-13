<template>
  <div class="grid-wrapper">
    <div ref="gridContainer" class="artistic-grid">
      <!-- Les carrés principaux -->
      <div
        v-for="index in totalSquares"
        :key="index"
        class="square"
        :ref="(el) => (squareRefs[index - 1] = el)"
      >
        <!-- Sous-grille de 4x4 à l'intérieur de chaque carré -->
        <div class="inner-grid">
          <div
            v-for="innerIndex in 16"
            :key="`${index}-${innerIndex}`"
            class="inner-square"
          />
        </div>
      </div>
      <LayoutLines color="white" />
    </div>

    <!-- Ligne verticale en absolute -->
  </div>
</template>

<script setup>
import { debounce } from "~/utils/debounce";
import { useGSAP } from "~/composables/useGSAP";

// ── GSAP ──────────────────────────────────────────────────────────────────────
// mm     : one matchMedia instance per component, auto-reverts on unmount
// BP     : breakpoint strings aligned with _mixins.scss
// scheduleRefresh : debounced ScrollTrigger.refresh() shared across all components
const { gsap, mm, BP, scheduleRefresh } = useGSAP();

const {
  init: initFlip,
  setInitialPositions,
  addToTimeline: addFlipToTimeline,
  reset: resetFlip,
} = useLogoFlip();

const gridContainer = ref(null);
const squareRefs = ref([]);
const totalSquares = ref(0);
const currentCols = ref(11);

// Configuration responsive — align MOBILE_BREAKPOINT with BP.desktop (901px)
const DESKTOP_COLS = 11;
const MOBILE_COLS = 12;
const MOBILE_BREAKPOINT = 901;

/**
 * Calculate how many squares needed to fill viewport
 */
const calculateGridSize = () => {
  if (!gridContainer.value) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Determine columns based on breakpoint
  const cols = w < MOBILE_BREAKPOINT ? MOBILE_COLS : DESKTOP_COLS;
  currentCols.value = cols;

  // Calculate square size (perfect squares)
  // Use Math.ceil to avoid subpixel gaps on mobile
  const squareSize = Math.ceil(w / cols);

  // Calculate rows needed to fill height (+ 1 row buffer)
  const rows = Math.ceil(h / squareSize) + 1;

  // Total squares needed
  const total = cols * rows;
  totalSquares.value = total;

  // Apply grid configuration with GSAP for smooth transitions
  gsap.set(gridContainer.value, {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridAutoRows: `${squareSize}px`,
  });

  console.log({
    viewport: { width: w, height: h },
    cols,
    rows,
    squareSize,
    totalSquares: total,
  });
};

/**
 * Setup event listeners on squares
 * Called after squares are mounted
 */
const setupEventListeners = () => {
  // squareRefs.value.forEach((square) => {
  //   if (!square) return;
  //   square.addEventListener("click", () => {
  //     square.classList.add("clicked");
  //     $gsap.to(square, {
  //       backgroundColor: "var(--color-white)",
  //       duration: 0.5,
  //     });
  //   });
  // });
  // const innerSquares = document.querySelectorAll(".inner-square");
  // innerSquares.forEach((inner) => {
  //   inner.addEventListener("click", (e) => {
  //     e.stopPropagation(); // Prevent click from bubbling to parent square
  //     inner.classList.add("clicked");
  //     $gsap.to(inner, {
  //       backgroundColor: "var(--color-white)",
  //       duration: 0.5,
  //     });
  //   });
  // });
};

// get first row of squares
const getFirstRowSquares = () => {
  const firstRowSquares = [];
  for (let i = 0; i < currentCols.value; i++) {
    if (squareRefs.value[i]) {
      firstRowSquares.push(squareRefs.value[i]);
    }
  }
  return firstRowSquares;
};

const getRows = (rowNumbers) => {
  const rows = [];
  rowNumbers.forEach((rowNum) => {
    const rowSquares = [];
    for (
      let i = rowNum * currentCols.value;
      i < (rowNum + 1) * currentCols.value;
      i++
    ) {
      if (squareRefs.value[i]) {
        rowSquares.push(squareRefs.value[i]);
      }
    }
    rows.push(rowSquares);
  });
  return rows;
};

const getAllSquaresWithoutSome = (excludeIndices) => {
  return squareRefs.value.filter((_, index) => !excludeIndices.includes(index));
};

// animation keyframes
const setupAnimations = () => {
  if (!gridContainer.value) return;

  const layoutLines = gridContainer.value.querySelector(".layout-lines");

  // ── Reset previous state ───────────────────────────────────────────────────
  // mm.revert() kills all previously enrolled ScrollTriggers + tweens from this
  // component, then re-registers fresh mm.add() conditions below.
  // Critical on grid resize: old triggers reference stale DOM nodes.
  mm.revert();

  // Shared ScrollTrigger config — same scroll window for both breakpoints.
  // invalidateOnRefresh recalculates start/end after scheduleRefresh().
  const stConfig = {
    trigger: gridContainer.value,
    start: "top top",
    end: "50% top",
    scrub: 1,
    invalidateOnRefresh: true,
  };

  // ── Desktop: logo Flip + targeted pixel fade + header color transitions ────
  // Element selection happens INSIDE mm.add so indices use the correct col count
  // (11 cols) regardless of when the callback fires after a resize.
  // mm.add auto-reverts ALL gsap state created inside when leaving BP.desktop.
  mm.add(BP.desktop, () => {
    const firstRow = getRows([0]);
    const row = firstRow[0];

    // Desktop grid layout (11 cols):
    //   col 0         → menu / nav area square
    //   col 5         → square behind the hero logo
    //   cols 8, 9, 10 → squares behind the header CTA button
    const menuSquare = row[0];
    const logoSquares = [row[5]];
    const buttonSquares = [
      row[row.length - 1],
      row[row.length - 2],
      row[row.length - 3],
    ];
    const specialSquares = [...logoSquares, ...buttonSquares];
    const allExceptSpecial = getAllSquaresWithoutSome(
      specialSquares.map((sq) => squareRefs.value.indexOf(sq)),
    );

    // setInitialPositions captured here so Flip reads fresh viewport coordinates
    // after any resize recalculation.
    setInitialPositions();

    const tl = gsap.timeline({
      scrollTrigger: stConfig,
      defaults: { ease: "power1.inOut" },
    });

    // Logo Flip kicks off at t=0 in sync with the first pixel batch
    addFlipToTimeline(tl, 0);

    tl
      // 1. All non-special squares dissolve with random stagger
      .to(allExceptSpecial, {
        autoAlpha: 0,
        duration: 0.5,
        stagger: { from: "random", amount: 1.5 },
      })
      // 2. Menu square fades last (delayed to t=2 so nav stays visible longer)
      .to(menuSquare, { autoAlpha: 0, duration: 0.5 }, 2)
      // 3. Hero CTA button wrapper fades with the menu square
      .to(".button-wrapper", { autoAlpha: 0, duration: 0.5 }, "<")
      // 4. Logo squares behind hero fade from center outward
      .to(
        logoSquares,
        {
          autoAlpha: 0,
          duration: 0.5,
          stagger: { from: "center", amount: 1.5 },
        },
        "<",
      )
      // 5. Hero logo SVGs transition to black (destination color in header)
      .to(
        ["[hero-logo-left]", "[hero-logo-right]"],
        {
          color: "var(--color-black)",
          duration: 0.5,
        },
        "<",
      )
      .to(layoutLines, { autoAlpha: 0, duration: 0.5 }, "<") // Lines fade with logo squares
      // 6. Button area squares dissolve
      .to(buttonSquares, { autoAlpha: 0, duration: 0.5 }, "<")
      // 7. Header button styles transition into their final state
      .to(".header .button__bg", { backgroundColor: "var(--color-blue)" }, "<")
      .to(".header .button__label", { color: "var(--color-blue)" }, "<")
      .to(
        [".header .button__icon", ".header .button__label-secondary"],
        { color: "var(--color-white)" },
        "<",
      )
      // 8. Header logo SVGs become black
      .to(
        ["[header-logo-left]", "[header-logo-right]"],
        {
          color: "var(--color-black)",
          duration: 0.5,
        },
        "<",
      );

    // Return fn: add non-GSAP cleanup here (event listeners, Three.js, etc.)
    return () => {};
  });

  // ── Mobile: full pixel dissolve — no Flip, no header coupling ─────────────
  // On mobile the header is a separate overlay and the button-wrapper sits
  // inline in the hero flow, not positioned over the grid. We dissolve all
  // squares uniformly — no per-zone targeting needed.
  mm.add(BP.mobile, () => {
    const firstRow = getRows([0]);
    const row = firstRow[0];

    // Mobile grid layout (6 cols):
    //   All squares dissolve at the same rate — no designated menu/button zones.
    //   Logo squares fade slightly later to keep orientation visible longer.
    const logoSquares = [row[Math.floor(row.length / 2)]]; // center col
    const allOtherSquares = getAllSquaresWithoutSome(
      logoSquares.map((sq) => squareRefs.value.indexOf(sq)),
    );

    const tl = gsap.timeline({
      scrollTrigger: stConfig,
      defaults: { ease: "power1.inOut" },
    });

    tl
      // 1. All non-logo squares dissolve with random stagger
      .to(allOtherSquares, {
        autoAlpha: 0,
        duration: 0.5,
        stagger: { from: "random", amount: 1.8 },
      })
      // 2. Center logo square fades last
      .to(logoSquares, { autoAlpha: 0, duration: 0.5 }, "-=0.2");

    return () => {};
  });

  // Single debounced refresh — collapses with calls from Hero, Services, etc.
  scheduleRefresh();
};

// Debounced resize handler.
// Always rebuilds animations after resize so Flip re-captures fresh viewport
// coordinates — even when totalSquares doesn't change (same rows × cols).
const handleResize = debounce(async () => {
  resetFlip();
  calculateGridSize();
  await nextTick(); // wait for any DOM updates triggered by calculateGridSize
  initFlip();
  setupAnimations();
}, 150);

// Watch for changes in totalSquares to setup listeners when DOM is ready
watch(totalSquares, async () => {
  await nextTick(); // Wait for DOM to update
  setupEventListeners();
  initFlip(); // Sélectionne les éléments logo dans le DOM
  setupAnimations();
});

onMounted(() => {
  window.scrollTo(0, 0); // Assure que la page démarre en haut
  calculateGridSize();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  // mm.revert() is handled automatically by useGSAP's onUnmounted
});

// Expose refs for animations
defineExpose({
  squareRefs,
  gridContainer,
});
</script>

<style scoped>
.grid-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  min-height: 100vh;
  /* background-color: var(--color-blue); */
  overflow: hidden;
  pointer-events: none;
}

.artistic-grid {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: grid;
  /* Grid properties set dynamically via GSAP */
}

.square {
  background-color: var(--color-blue);
  opacity: 1;
  box-sizing: border-box;
  position: relative;
}

/* Ligne verticale en absolute */
.vertical-line {
  position: absolute;
  top: 0;
  height: 100%;
  width: 1px;
  background-color: var(--color-white);
  /* background-color: rgba(197, 205, 207, 0.5); */
  pointer-events: none;
  z-index: 10;
}

/* Sous-grille à l'intérieur de chaque carré */
.inner-grid {
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

.inner-square {
  /* border: 1px solid rgba(0, 0, 0, 0.05); */
  box-sizing: border-box;
}
</style>
