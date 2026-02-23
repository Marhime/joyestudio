<!-- pages/typography-demo.vue -->
<template>
  <div>
    <!-- Section avec Type 1 -->
    <section data-theme="white" class="section type-1">
      <div class="grid-container">
        <div class="grid">
          <div class="col-span-4">
            <h1>Type 1 - Headline 1</h1>
            <p class="subtitle">345px → 135px avec tracking -5%</p>
          </div>

          <div class="col-span-2">
            <h2>Headline 2</h2>
            <p class="body-accent">Body text accent - 24px</p>
            <p>
              Body text normal qui scale de 18px à 11px. Lorem ipsum dolor sit
              amet consectetur adipiscing elit.
            </p>
          </div>

          <div class="col-span-2">
            <h3>Headline 3</h3>
            <h4>Headline 4</h4>
            <p>
              Texte qui s'adapte parfaitement sur tous les écrans grâce au
              système de clamp.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section avec Type 2 -->
    <section data-theme="dark" class="section type-2">
      <div class="grid-container">
        <div class="grid">
          <div class="col-span-4">
            <h1>Type 2 - Headline 1</h1>
            <p class="subtitle">435px → 187px avec tracking -5%</p>
          </div>

          <div class="col-start-2 col-span-3">
            <h2>Headline 2 - Type 2</h2>
            <p class="body-accent">Body text accent plus compact</p>
            <p>Typography système fluide et performant pour sites Awwwards.</p>
          </div>

          <div class="col-span-2">
            <h3>Headline 3</h3>
            <h4>Headline 4</h4>
          </div>
        </div>
      </div>
    </section>

    <!-- Section de contrôle (dev only) -->
    <section data-theme="white" class="section controls">
      <div class="grid-container">
        <div class="grid">
          <div class="col-span-4">
            <h3 class="t1-h3">Contrôles de typographie</h3>
            <div class="control-panel">
              <button @click="tweakH1(10)">+ H1</button>
              <button @click="tweakH1(-10)">- H1</button>
              <button @click="scaleAll(1.1)">Scale +10%</button>
              <button @click="scaleAll(0.9)">Scale -10%</button>
              <button @click="reset">Reset</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { setCustomTypography, scaleTypography, resetTypography, configs } =
  useTypography();

const tweakH1 = (delta: number) => {
  const current = configs.type1.h1.size;
  setCustomTypography("type1", "h1", {
    mobile: { size: current.mobile + delta },
    desktop: { size: current.desktop + delta },
  });
};

const scaleAll = (scale: number) => {
  scaleTypography(scale);
};

const reset = () => {
  resetTypography();
  scaleTypography(1);
};
</script>

<style scoped>
.section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 120px 0;
}

.subtitle {
  opacity: 0.6;
  margin-top: 20px;
}

/* Espacements entre éléments */
.type-1 h1 + .subtitle,
.type-2 h1 + .subtitle {
  margin-top: 16px;
}

.type-1 h2,
.type-2 h2 {
  margin-bottom: 24px;
}

.type-1 h3,
.type-2 h3 {
  margin-bottom: 16px;
}

.type-1 h4,
.type-2 h4 {
  margin: 16px 0;
}

.type-1 p,
.type-2 p {
  margin-bottom: 16px;
}

.type-1 .body-accent,
.type-2 .body-accent {
  margin: 20px 0;
}

/* Controls panel */
.controls {
  background: #f5f5f5;
  min-height: 50vh;
}

.control-panel {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.control-panel button {
  padding: 12px 24px;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.control-panel button:hover {
  opacity: 0.8;
}

/* Responsive grid adjustments */
@media (max-width: 768px) {
  .section {
    padding: 80px 0;
  }

  .col-span-2 {
    grid-column: span 3;
    margin-bottom: 40px;
  }

  .col-start-2 {
    grid-column-start: 1;
  }
}
</style>
