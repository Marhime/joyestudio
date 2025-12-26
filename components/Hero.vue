<template>
  <section data-theme="dark" ref="sectionRef" class="hero-section">
    <div class="grid-container">
      <div class="grid">
        <div class="hero-content col-start-4">
          <h1 class="t1-body">
            <span>We create things people love to use</span> - and businesses
            love to own
          </h1>
        </div>
      </div>
      <NuxtImg
        class="home-logo"
        src="/images/home-logo.svg"
        alt="Logo Joyes Studio"
        fill
      />
    </div>
    <PixelPattern :pattern="heroPattern" />
    <!-- <GirdLayer2 /> -->
  </section>
</template>

<script lang="ts" setup>
import { heroPattern } from "~/patterns/hero";
</script>
<style scoped>
.hero-section {
  position: relative;
  width: 100%;
  height: 100vh;
  background-color: var(--color-blue);
}

.grid-container {
  position: relative;
  width: 100%;
  height: 100%;
  padding-top: 226px;
}

.home-logo {
  position: absolute;
  width: 100%;
  left: 0;
  right: 0;
  top: 0;
  padding: inherit;
}

.hero-content {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
}

h1 {
  text-transform: uppercase;
  text-align: right;
  color: var(--color-white);
}

h1 span {
  opacity: 0.55;
}
</style>
