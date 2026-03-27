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

const lineColor = computed(() =>
  props.color === "black" ? "#C5CDCF" : "#F9F9F9",
);
</script>

<style lang="scss" scoped>
.layout-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: luminosity;
}

.layout-lines__grid {
  height: 100%;
}

.col-a {
  grid-column: 0 / 1;
}
.col-b {
  grid-column: 2 / 4;
}
.col-c {
  grid-column: 5 / 8;
}
.col-d {
  grid-column: 8 / 12;
}

/* Chaque div couvre exactement les colonnes pixel correspondantes */
@include respond-to("desktop") {
  .layout-lines {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    mix-blend-mode: luminosity;
    // visibility: hidden;
  }

  .layout-lines__grid {
    height: 100%;
  }
  .col-a {
    grid-column: 1 / 3;
    position: relative;
    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: var(--content-margin); /* 1 colonne pixel */
      border-right: 1px solid v-bind(lineColor);
      height: 100%;
      z-index: 20;
    }
  }
  .col-b {
    grid-column: 3 / 4;
  }
  .col-c {
    grid-column: 4 / 8;
  }
  .col-d {
    position: relative;
    grid-column: 8 / 12;
    &::after {
      content: "";
      position: absolute;
      top: 0;
      right: var(--content-margin); /* 1 colonne pixel */
      border-right: 1px solid v-bind(lineColor);
      height: 100%;
      z-index: 20;
    }
  }
}

.layout-lines__col {
  border-right: 1px solid v-bind(lineColor);
  height: 100%;
}

.col-a {
  border-left: 1px solid v-bind(lineColor);
}

.layout-lines__col,
.col-a {
  opacity: 0.15;
}

@include respond-to("desktop") {
  .layout-lines__col,
  .col-a {
    opacity: 0.35;
  }
}
</style>
