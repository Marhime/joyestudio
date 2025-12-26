<script setup>
defineProps({
  pattern: Array,
  gridSize: {
    type: Number,
    default: 30,
  },
  pixelSize: {
    type: Number,
    default: 44,
  },
});
</script>

<template>
  <div class="pixel-wrapper">
    <div
      class="pixel-grid"
      :style="{
        width: `${gridSize * pixelSize}px`,
        height: `${gridSize * pixelSize}px`,
        gridTemplateColumns: `repeat(${gridSize}, ${pixelSize}px)`,
        gridTemplateRows: `repeat(${gridSize}, ${pixelSize}px)`,
      }"
    >
      <div
        v-for="(block, i) in pattern"
        :key="i"
        class="pixel-block"
        :style="{
          gridColumn: `${block.col + 1} / span ${block.size}`,
          gridRow: `${block.row + 1} / span ${block.size}`,
          backgroundColor: block.color,
        }"
      />
    </div>
  </div>
</template>
<style scoped>
.pixel-wrapper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
}

.pixel-grid {
  display: grid;
}
</style>
