<template>
  <div class="home">
    <Hero />
    <About />
    <Services />
    <GameSection />
    <Contact />
  </div>
</template>

<script lang="ts" setup>
import About from "~/components/home/About.vue";
import Contact from "~/components/home/Contact.vue";
import Hero from "~/components/home/Hero.vue";
import GameSection from "~/components/home/GameSection.vue";
import Services from "~/components/home/Services.vue";
// PageEnterHook is provided by app.vue — Hero.vue consumes it directly via inject.
// index.vue doesn't need to forward it; Hero is a descendant and inject() traverses
// the full provider chain automatically.

definePageMeta({
  pageColor: "var(--color-blue)",
});
</script>

<style>
.placeholder {
  width: 100%;
  height: 100vh;
  background-color: #f0f0f0;
}
</style>
