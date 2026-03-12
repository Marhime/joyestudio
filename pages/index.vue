<template>
  <Hero />
  <About />
  <div class="placeholder"></div>
</template>

<script lang="ts" setup>
import About from "~/components/home/About.vue";
import Contact from "~/components/home/Contact.vue";
import Hero from "~/components/home/Hero.vue";
import OurProjects from "~/components/home/OurProjects.vue";
import OurTeam from "~/components/home/OurTeam.vue";
import Services from "~/components/home/Services.vue";
</script>

<style>
.placeholder {
  width: 100%;
  height: 100vh;
  background-color: #f0f0f0;
}
</style>
