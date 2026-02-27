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
    </div>

    <!-- Ligne verticale en absolute -->
    <div ref="verticalLine" class="vertical-line" />
    <div ref="verticalLine1" class="vertical-line" />
    <div ref="verticalLine2" class="vertical-line" />
  </div>
</template>

<script setup>
import { debounce } from "~/utils/debounce";

const { $gsap } = useNuxtApp();
const {
  init: initFlip,
  setInitialPositions,
  addToTimeline: addFlipToTimeline,
  reset: resetFlip,
} = useLogoFlip();

const gridContainer = ref(null);
const verticalLine = ref(null);
const verticalLine1 = ref(null);
const verticalLine2 = ref(null);
const squareRefs = ref([]);
const totalSquares = ref(0);
const currentCols = ref(11);

// Configuration responsive
const DESKTOP_COLS = 11;
const MOBILE_COLS = 6;
const MOBILE_BREAKPOINT = 768;

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
  const squareSize = w / cols;

  // Calculate rows needed to fill height (+ 1 row buffer)
  const rows = Math.ceil(h / squareSize) + 1;

  // Total squares needed
  const total = cols * rows;
  totalSquares.value = total;

  // Apply grid configuration with GSAP for smooth transitions
  $gsap.set(gridContainer.value, {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridAutoRows: `${squareSize}px`,
  });

  // Position vertical line at column 4 (right edge of column 3)
  if (verticalLine.value) {
    const linePosition = squareSize * 2; // After 3 columns
    $gsap.set(verticalLine.value, {
      left: `${linePosition}px`,
    });
  }
  if (verticalLine1.value) {
    const linePosition = squareSize * 3; // After 6 columns
    $gsap.set(verticalLine1.value, {
      left: `${linePosition}px`,
    });
  }
  if (verticalLine2.value) {
    const linePosition = squareSize * 7; // After 9 columns
    $gsap.set(verticalLine2.value, {
      left: `${linePosition}px`,
    });
  }

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
  const innerSquares = document.querySelectorAll(".inner-square");
  innerSquares.forEach((inner) => {
    inner.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent click from bubbling to parent square
      inner.classList.add("clicked");
      $gsap.to(inner, {
        backgroundColor: "var(--color-white)",
        duration: 0.5,
      });
    });
  });
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
const animateChangeColor = () => {
  const root = document.documentElement;
  const firstRow = getRows([0]);
  const firstAndSecondRow = getRows([0, 1]);

  const menuSquares = firstRow[0][0]; // First 8 squares of the first two rows (menu area)

  const logoSquares = [firstRow[0][5]]; // Just the squares behind the logo (columns 4-7 of the first row)

  const buttonSquares = [
    firstRow[0][firstRow[0].length - 1], // Last column of the first row
    firstRow[0][firstRow[0].length - 2],
    firstRow[0][firstRow[0].length - 3],
  ]; // First 4 columns of the first two rows

  const logoAndButtonSquares = [...logoSquares, ...buttonSquares];

  const allExceptLogoAndButtonSquares = getAllSquaresWithoutSome(
    logoAndButtonSquares.map((sq) => squareRefs.value.indexOf(sq)),
  );

  console.log("Animating squares:", {
    firstRow,
    firstRowLength: firstRow[0].length,
    firstAndSecondRow,
    logoSquares,
    allExceptLogoAndButtonSquares,
  });

  // Prépare les logos hero en position fixe et capture la destination (header)
  setInitialPositions();

  const tl = $gsap.timeline({
    scrollTrigger: {
      trigger: gridContainer.value,
      start: "top top",
      end: "50% top",
      scrub: true,
      markers: true,
    },
    defaults: { ease: "power1.inOut" },
  });

  // Logo flip : démarre en même temps que allExceptLogoAndButtonSquares
  addFlipToTimeline(tl, 0);

  tl.to(allExceptLogoAndButtonSquares, {
    backgroundColor: "var(--color-white)",
    duration: 0.5,
    stagger: {
      from: "random",
      amount: 1.5,
    },
  })
    .to(
      menuSquares,
      {
        backgroundColor: "var(--color-white)",
        duration: 0.5,
      },
      1.5,
    )

    .to(
      ".button-wrapper",
      {
        autoAlpha: 0,
        duration: 0.5,
      },
      "<",
    )

    .to(
      logoSquares,
      {
        backgroundColor: "var(--color-white)",
        duration: 0.5,
        stagger: {
          from: "center",
          amount: 1.5,
        },
      },
      "<",
    )

    .to(
      ["[hero-logo-left]", "[hero-logo-right]"],
      {
        color: "var(--color-black)",
        duration: 0.5,
      },
      "<",
    )

    .to(
      buttonSquares,
      {
        backgroundColor: "var(--color-white)",
        duration: 0.5,
      },
      "<",
    )
    .to(
      ".header .button__bg",
      {
        backgroundColor: "var(--color-blue)",
      },
      "<",
    )
    .to(
      ".header .button__label",
      {
        color: "var(--color-blue)",
      },
      "<",
    )
    .to(
      ".header .button__icon",
      {
        color: "var(--color-white)",
      },
      "<",
    )

    .to(
      ["[header-logo-left]", "[header-logo-right]"],
      {
        color: "var(--color-black)",
        duration: 0.5,
      },
      "<",
    );
};

// Debounced resize handler
const handleResize = debounce(() => {
  resetFlip(); // Nettoie les états Flip avant de recalculer
  calculateGridSize();
  console.log("First row squares:", getFirstRowSquares());
}, 150);

// Watch for changes in totalSquares to setup listeners when DOM is ready
watch(totalSquares, async () => {
  await nextTick(); // Wait for DOM to update
  setupEventListeners();
  initFlip(); // Sélectionne les éléments logo dans le DOM
  animateChangeColor();
});

onMounted(() => {
  calculateGridSize();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
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
  background-color: rgb(249, 249, 249, 0.5);
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
