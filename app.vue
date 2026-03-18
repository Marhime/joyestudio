<template>
  <NuxtLayout>
    <NuxtPage :transition="transition" />
  </NuxtLayout>
  <!-- PixelGrid at root stacking context — z-index 9999 unconstrained -->
  <PixelGridOverlay />
  <!-- PixelBlob3 at z-index 3000, above everything except critical UI
  -->
  <PixelBlob3 ref="pixelBlobRef" />
</template>

<script setup lang="ts">
import PixelGridOverlay from "~/components/layout/PixelGridOverlay.vue";
import type { PageEnterHook } from "~/composables/usePageTransition";
import type { SmileyAPI } from "./types/smiley";

const pixelBlobRef = ref<SmileyAPI | null>(null);
// Rend la sphère accessible depuis n'importe quel composant enfant
provide("pixelBlob", pixelBlobRef);

const { transition, isTransitioning, onPageEnter } = usePageTransition();
provide("isTransitioning", readonly(isTransitioning));
provide<PageEnterHook>("onPageEnter", onPageEnter);
</script>
