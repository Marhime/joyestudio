<template>
  <div class="layout-lines grid-container" aria-hidden="true">
    <div class="layout-lines__grid grid">
      <div class="layout-lines__col" />
      <div class="layout-lines__col" />
      <div class="layout-lines__col" />
      <div class="layout-lines__col" />
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    color?: "black" | "white";
  }>(),
  { color: "white" },
);

const lineColor = computed(() => (props.color === "black" ? "black" : "white"));
</script>

<style scoped>
.layout-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: luminosity;
  /* visibility: hidden; */
}

.layout-lines__grid {
  height: 100%;
}

.layout-lines__col {
  border-right: 1px solid v-bind(lineColor);
  height: 100%;
  opacity: 0.35;
}

.layout-lines__col:first-child {
  border-left: 1px solid v-bind(lineColor);
  opacity: 0.35;
}
</style>
