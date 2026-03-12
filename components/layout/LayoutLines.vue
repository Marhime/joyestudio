<template>
  <div class="layout-lines" aria-hidden="true">
    <div class="layout-lines__grid grid">
      <!-- Div 1 : couvre pixel cols 1-2  (border-left=pixel 1, border-right=pixel 2) -->
      <div class="layout-lines__col col-a" />
      <!-- Div 2 : couvre pixel col  3    (border-right=pixel 3) -->
      <div class="layout-lines__col col-b" />
      <!-- Div 3 : couvre pixel cols 4-7  (border-right=pixel 7) -->
      <div class="layout-lines__col col-c" />
      <!-- Div 4 : couvre pixel cols 8-11 (border-right=pixel 11) -->
      <div class="layout-lines__col col-d" />
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
}

.layout-lines__grid {
  height: 100%;
}

/* Chaque div couvre exactement les colonnes pixel correspondantes */
.col-a {
  grid-column: 1 / 3;
}
.col-b {
  grid-column: 3 / 4;
}
.col-c {
  grid-column: 4 / 8;
}
.col-d {
  grid-column: 8 / 12;
}

.layout-lines__col {
  border-right: 1px solid v-bind(lineColor);
  height: 100%;
  opacity: 0.35;
}

.col-a {
  border-left: 1px solid v-bind(lineColor);
  opacity: 0.35;
}
</style>
