<!-- layouts/default.vue -->
<template>
  <div class="page-container">
    <Header theme="dark" />
    <!-- Contenu principal -->
    <div class="main-content">
      <main>
        <slot />

        <!--  <Typography /> -->

        <section class="about" data-theme="dark" style="background: black">
          <!-- Le header devient blanc automatiquement -->
        </section>

        <section data-theme="light" style="background: white">
          <!-- Le header devient noir automatiquement -->
        </section>
      </main>
      <!-- <footer class="footer"></footer> -->
    </div>
    <!-- <Cursor /> -->
    <div v-if="showGrid" class="grid-overlay">
      <div class="grid-overlay-inner">
        <div class="grid-overlay-col"></div>
        <div class="grid-overlay-col"></div>
        <div class="grid-overlay-col"></div>
        <div class="grid-overlay-col"></div>
      </div>
    </div>

    <!-- vertical bar center -->
    <div v-if="showGrid" class="vertical-bar-center"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from "vue";

const showGrid = ref(false);

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
}

footer {
  width: 100%;
  height: 100vh;
}

section {
  width: 100%;
  height: 200vh;
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
