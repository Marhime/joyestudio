<template>
  <section class="services">
    <div class="service service--1">
      <p>hello</p>
    </div>
    <div class="service service--2">
      <p>HOW</p>
    </div>
    <div class="service service--3">
      <p>ARE</p>
    </div>
    <div class="service service--4">
      <p>YOU</p>
    </div>
  </section>
</template>

<script setup>
const { $gsap, $ScrollTrigger } = useNuxtApp();
let ctx;

onMounted(() => {
  const services = $gsap.utils.toArray(".service");
  console.log(services);

  const createPinAnimation = () => {
    ctx?.revert();

    ctx = $gsap.context(() => {
      services.forEach((service, index) => {
        console.log(service);
        if (index === services.length - 1) return;
        $ScrollTrigger.create({
          trigger: service,
          start: "bottom bottom",
          end: "bottom top",
          markers: true,
          scrub: true,
          pin: true,
          pinSpacing: false,
        });
      });
    });
  };

  const debouncedCreateFlipAnimation = debounce(() => {
    createPinAnimation();
  }, 200);

  nextTick(() => {
    createPinAnimation();
  });

  window.addEventListener("resize", () => {
    debouncedCreateFlipAnimation();
  });
});

onUnmounted(() => {
  ctx?.revert();
});
</script>

<style lang="scss" scoped>
.services {
  position: relative;
  z-index: 2;
}
.service {
  height: 100vh;
  position: relative;

  &--1 {
    background-color: var(--color-grey);
  }
  &--2 {
    background-color: var(--color-blue);
  }
  &--3 {
    background-color: var(--color-pink);
  }
  &--4 {
    background-color: var(--color-blue);
  }
}
</style>
