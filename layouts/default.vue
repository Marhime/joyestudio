<!-- layouts/default.vue -->
<template>
  <div class="page-container">
    <Header theme="dark" />
    <!-- Contenu principal -->
    <main class="main-content">
      <slot />
    </main>
    <!-- Sphère 3D — overlay fixe, commun à toutes les pages 
      <LayoutGridCss />
    <PixelBlob3 ref="pixelBlobRef" />-->
    <Footer />
  </div>
</template>

<script lang="ts" setup>
import { ref, provide, onMounted, onUnmounted } from "vue";
import Footer from "~/components/layout/Footer.vue";
import Header from "~/components/layout/Header.vue";

const showGrid = ref(false);
const pixelBlobRef = ref(null);

// Rend la sphère accessible depuis n'importe quel composant enfant
provide("pixelBlob", pixelBlobRef);

const toggleGrid = (e: KeyboardEvent) => {
  if (e.key === "g" || e.key === "G") {
    showGrid.value = !showGrid.value;
  }
};

onMounted(() => {
  window.addEventListener("keydown", toggleGrid);
});

onUnmounted(() => {
  window.removeEventListener("keydown", toggleGrid);
});
</script>

<style scoped>
.page-container {
  /* overflow-x: hidden; */
  width: 100vw;
  position: relative;
  z-index: 10;
  background-color: var(--color-white);
}

.vertical-bar-center {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 100%;
  background: black;
  z-index: 9999;
  pointer-events: none;
}
</style>
