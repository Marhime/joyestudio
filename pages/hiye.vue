<template>
  <div class="hiye">
    <ClientOnly>
      <PixelBlob3 />
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup></script>

<style scoped>
.hiye {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100vh;
}
</style>
