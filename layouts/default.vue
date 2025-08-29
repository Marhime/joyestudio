<!-- layouts/default.vue -->
<template>
  <div class="page-container">
    <!-- Contenu principal -->
    <div class="main-content">
      <main>
        <slot />
      </main>
      <!-- <footer class="footer"></footer> -->
    </div>
    <!-- <Cursor /> -->
  </div>
</template>

<script setup></script>

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
</style>
