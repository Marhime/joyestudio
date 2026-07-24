<template>
  <NuxtLayout>
    <NuxtPage :transition="transition" />
  </NuxtLayout>
  <!-- PixelGrid at root stacking context — z-index 9999 unconstrained -->
  <PixelGridOverlay />
  <!-- PixelBlob3 at z-index 10000 — ABOVE the grid wall: the smiley stays
       visible and travels over it during page transitions -->
  <PixelBlob3 ref="pixelBlobRef" />
  <!-- Perf HUD: hidden by default. Toggle with ?perf=1 or Shift+P -->
  <PerfHud />
</template>

<script setup lang="ts">
import PixelGridOverlay from "~/components/layout/PixelGridOverlay.vue";
import PerfHud from "~/components/dev/PerfHud.vue";
import type { PageEnterHook } from "~/composables/usePageTransition";
import type { SmileyAPI } from "./types/smiley";

// shallowRef: the exposed API must not be deep-unwrapped (its `mode` is a
// Ref) — and a component-expose object has no business being deep-reactive.
const pixelBlobRef = shallowRef<SmileyAPI | null>(null);
// Rend la sphère accessible depuis n'importe quel composant enfant
provide("pixelBlob", pixelBlobRef);

// The blob ref seeds the transition's radial wall wavefront on the character
const { transition, isTransitioning, onPageEnter } =
  usePageTransition(pixelBlobRef);
provide("isTransitioning", readonly(isTransitioning));
provide<PageEnterHook>("onPageEnter", onPageEnter);

// The smiley leads every page transition: holds his ground above the
// rising wall, then comets from his departure point into the new page's
// [data-smiley-entry] as the wall blows open from it — one visible journey.
useSmileyTransitionActor(pixelBlobRef);
</script>
