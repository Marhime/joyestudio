<template>
  <div class="grid-wrapper">
    <canvas ref="canvas" class="grid-canvas" />
  </div>
</template>

<script setup>
import { debounce } from "~/utils/debounce";

const { $gsap } = useNuxtApp();

const canvas = ref(null);
const ctx = ref(null);
const gridData = ref({
  cols: 11,
  rows: 0,
  squareSize: 0,
  squares: [], // Array of square objects with opacity for animations
});

// Configuration responsive
const DESKTOP_COLS = 11;
const MOBILE_COLS = 6;
const MOBILE_BREAKPOINT = 768;

/**
 * Initialize canvas and setup grid
 */
const setupCanvas = () => {
  if (!canvas.value) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Set canvas size
  canvas.value.width = w;
  canvas.value.height = h;

  // Get context
  ctx.value = canvas.value.getContext("2d");

  // Determine columns based on breakpoint
  const cols = w < MOBILE_BREAKPOINT ? MOBILE_COLS : DESKTOP_COLS;
  const squareSize = w / cols;
  const rows = Math.ceil(h / squareSize) + 1;

  // Create squares data
  const squares = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      squares.push({
        x: col * squareSize,
        y: row * squareSize,
        size: squareSize,
        opacity: 1,
        col,
        row,
      });
    }
  }

  gridData.value = { cols, rows, squareSize, squares };

  console.log({
    viewport: { width: w, height: h },
    cols,
    rows,
    squareSize,
    totalSquares: squares.length,
  });

  // Initial draw
  draw();
};

/**
 * Draw grid on canvas
 */
const draw = () => {
  if (!ctx.value || !canvas.value) return;

  const c = ctx.value;
  const { squares, squareSize, cols } = gridData.value;

  // Clear canvas
  c.clearRect(0, 0, canvas.value.width, canvas.value.height);

  // Draw main squares
  squares.forEach((square) => {
    c.globalAlpha = square.opacity;
    c.fillStyle = "rgb(113, 191, 246)";
    c.fillRect(square.x, square.y, square.size, square.size);

    // Draw border
    c.globalAlpha = 1;
    c.strokeStyle = "rgba(0, 0, 0, 0.1)";
    c.lineWidth = 1;
    c.strokeRect(square.x, square.y, square.size, square.size);

    // Draw inner grid (4x4)
    const innerSize = square.size / 4;
    c.globalAlpha = 0.3;
    c.strokeStyle = "rgba(0, 0, 0, 0.05)";
    for (let i = 0; i <= 4; i++) {
      // Vertical lines
      c.beginPath();
      c.moveTo(square.x + i * innerSize, square.y);
      c.lineTo(square.x + i * innerSize, square.y + square.size);
      c.stroke();
      // Horizontal lines
      c.beginPath();
      c.moveTo(square.x, square.y + i * innerSize);
      c.lineTo(square.x + square.size, square.y + i * innerSize);
      c.stroke();
    }
  });

  // Draw vertical lines
  c.globalAlpha = 1;
  c.strokeStyle = "rgba(0, 0, 0, 0.2)";
  c.lineWidth = 2;

  [2, 3, 7].forEach((colIndex) => {
    const x = colIndex * squareSize;
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, canvas.value.height);
    c.stroke();
  });

  c.globalAlpha = 1;
};

/**
 * Handle canvas click - find which square was clicked
 */
const handleCanvasClick = (event) => {
  const rect = canvas.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const { squares, squareSize } = gridData.value;

  // Find clicked square
  const col = Math.floor(x / squareSize);
  const row = Math.floor(y / squareSize);
  const index = row * gridData.value.cols + col;
  const square = squares[index];

  if (square) {
    // Animate with GSAP
    $gsap.to(square, {
      opacity: 0,
      duration: 0.5,
      onUpdate: draw,
      onComplete: () => {
        $gsap.set(square, { opacity: 1 });
        draw();
      },
    });
  }
};

// Debounced resize handler
const handleResize = debounce(() => {
  setupCanvas();
}, 150);

onMounted(() => {
  setupCanvas();
  window.addEventListener("resize", handleResize);
  canvas.value?.addEventListener("click", handleCanvasClick);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  canvas.value?.removeEventListener("click", handleCanvasClick);
});

// Expose grid data and draw function for external animations
defineExpose({
  gridData,
  draw,
});
</script>

<style scoped>
.grid-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  min-height: 100vh;
  z-index: 20;
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
