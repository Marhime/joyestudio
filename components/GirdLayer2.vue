<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

const brushSize = ref(1);
const selectedColor = ref("#000000");
const blocks = ref({});
const showGrid = ref(true);
const isDrawing = ref(false);
const eraserMode = ref(false);
const gridCols = ref(20);
const gridRows = ref(20);

const colors = [
  "#000000",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
];

const totalPixels = computed(() => gridCols.value * gridRows.value);

const calculateGrid = () => {
  if (typeof window !== "undefined") {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Calculer pour avoir environ 20-30 colonnes selon la taille d'écran
    if (vw < 640) {
      gridCols.value = 12;
      gridRows.value = Math.floor((vh / vw) * 12);
    } else if (vw < 1024) {
      gridCols.value = 20;
      gridRows.value = Math.floor((vh / vw) * 20);
    } else {
      gridCols.value = 30;
      gridRows.value = Math.floor((vh / vw) * 30);
    }
  }
};

const getBlockKey = (row, col, size) => {
  return `${row}-${col}-${size}`;
};

const getRowCol = (index) => {
  const row = Math.floor(index / gridCols.value);
  const col = index % gridCols.value;
  return { row, col };
};

const addBlock = (index) => {
  const { row, col } = getRowCol(index - 1);
  const size = brushSize.value;

  if (col + size > gridCols.value || row + size > gridRows.value) {
    return;
  }

  if (eraserMode.value) {
    const newBlocks = { ...blocks.value };
    Object.keys(newBlocks).forEach((key) => {
      const block = newBlocks[key];
      const blockEndCol = block.col + block.size;
      const blockEndRow = block.row + block.size;
      const clickEndCol = col + size;
      const clickEndRow = row + size;

      if (
        block.col < clickEndCol &&
        blockEndCol > col &&
        block.row < clickEndRow &&
        blockEndRow > row
      ) {
        delete newBlocks[key];
      }
    });
    blocks.value = newBlocks;
  } else {
    const key = getBlockKey(row, col, size);
    const newBlocks = { ...blocks.value };

    Object.keys(newBlocks).forEach((existingKey) => {
      const block = newBlocks[existingKey];
      const blockEndCol = block.col + block.size;
      const blockEndRow = block.row + block.size;
      const newEndCol = col + size;
      const newEndRow = row + size;

      if (
        block.col < newEndCol &&
        blockEndCol > col &&
        block.row < newEndRow &&
        blockEndRow > row
      ) {
        delete newBlocks[existingKey];
      }
    });

    newBlocks[key] = {
      row,
      col,
      size,
      color: selectedColor.value,
    };

    blocks.value = newBlocks;
  }
};

const handleMouseDown = (index) => {
  isDrawing.value = true;
  addBlock(index);
};

const handleMouseEnter = (index) => {
  if (isDrawing.value) {
    addBlock(index);
  }
};

const clearGrid = () => {
  blocks.value = {};
};

const exportPattern = () => {
  const pattern = Object.values(blocks.value).map((block) => ({
    row: block.row,
    col: block.col,
    size: block.size,
    color: block.color,
  }));
  console.log("Pattern:", JSON.stringify(pattern, null, 2));
  alert(`Pattern exporté dans la console! (${pattern.length} blocs)`);
};

onMounted(() => {
  calculateGrid();

  if (typeof window !== "undefined") {
    window.addEventListener("resize", calculateGrid);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", calculateGrid);
  }
});
</script>

<template>
  <div class="pixel-grid-container">
    <div class="control-panel">
      <div class="control-group">
        <label class="control-label">Grille responsive</label>
        <p class="info-text">XS (1x1), S (2x2), M (3x3), L (4x4)</p>
      </div>

      <div class="control-group">
        <label class="control-label">Taille du pinceau</label>
        <div class="button-group">
          <button
            @click="brushSize = 1"
            :class="['btn', { active: brushSize === 1 }]"
          >
            XS
          </button>
          <button
            @click="brushSize = 2"
            :class="['btn', { active: brushSize === 2 }]"
          >
            S
          </button>
          <button
            @click="brushSize = 3"
            :class="['btn', { active: brushSize === 3 }]"
          >
            M
          </button>
          <button
            @click="brushSize = 4"
            :class="['btn', { active: brushSize === 4 }]"
          >
            L
          </button>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label">Couleur</label>
        <div class="color-grid">
          <button
            v-for="color in colors"
            :key="color"
            @click="selectedColor = color"
            :class="['color-btn', { active: selectedColor === color }]"
            :style="{ backgroundColor: color }"
          />
        </div>
      </div>

      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="showGrid" />
          Afficher la grille
        </label>
      </div>

      <div class="control-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="eraserMode" />
          Mode gomme
        </label>
      </div>

      <div class="control-group">
        <p class="stats">
          Grille: {{ gridCols }} x {{ gridRows }}<br />
          Blocs: {{ Object.keys(blocks).length }}
        </p>
      </div>

      <div class="button-group-vertical">
        <button @click="clearGrid" class="btn-action btn-clear">
          Effacer tout
        </button>
        <button @click="exportPattern" class="btn-action btn-export">
          Exporter pattern
        </button>
      </div>
    </div>

    <section
      class="pixel-grid"
      :style="{
        gridTemplateColumns: 'repeat(' + gridCols + ', 1fr)',
        gridTemplateRows: 'repeat(' + gridRows + ', 1fr)',
      }"
      @mouseup="isDrawing = false"
      @mouseleave="isDrawing = false"
    >
      <div
        v-for="i in totalPixels"
        :key="'bg-' + i"
        class="pixel-bg"
        :class="{ 'show-border': showGrid }"
        @mousedown="handleMouseDown(i)"
        @mouseenter="handleMouseEnter(i)"
      />

      <div
        v-for="(block, key) in blocks"
        :key="key"
        class="pixel-block"
        :style="{
          gridColumn: block.col + 1 + ' / span ' + block.size,
          gridRow: block.row + 1 + ' / span ' + block.size,
          backgroundColor: block.color,
        }"
      />
    </section>
  </div>
</template>

<style scoped>
.pixel-grid-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 1000;
}
.control-panel {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 250px;
}
.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.control-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}
.info-text {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}
.button-group {
  display: flex;
  gap: 0.5rem;
}
.btn {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  background-color: #e5e7eb;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  flex: 1;
}
.btn:hover {
  background-color: #d1d5db;
}
.btn.active {
  background-color: #3b82f6;
  color: white;
}
.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}
.color-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  border: 2px solid #d1d5db;
  cursor: pointer;
  transition: all 0.2s;
}
.color-btn:hover {
  transform: scale(1.05);
}
.color-btn.active {
  border-color: #3b82f6;
  transform: scale(1.1);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}
.checkbox-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}
.stats {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}
.button-group-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.btn-action {
  padding: 0.625rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-clear {
  background-color: #ef4444;
  color: white;
}
.btn-clear:hover {
  background-color: #dc2626;
}
.btn-export {
  background-color: #10b981;
  color: white;
}
.btn-export:hover {
  background-color: #059669;
}
.pixel-grid {
  display: grid;
  height: 100vh;
  width: 100vw;
  gap: 0;
  user-select: none;
  position: relative;
}
.pixel-bg {
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.pixel-bg.show-border {
  border: 1px solid #e5e7eb;
}
.pixel-block {
  pointer-events: none;
}
.pixel-bg:hover {
  background-color: rgba(59, 130, 246, 0.1);
}
</style>
