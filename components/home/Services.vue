<template>
  <section class="services">
    <div class="services"></div>
    <div class="service service--1">
      <div class="service__container grid-container">
        <div class="grid-template">
          <div class="service__title">
            <p class="t1-body-accent">01</p>
            <p class="t1-h3">Web & Mobile</p>
          </div>
          <div class="service__timeline t1-body">
            <p class="service__timeline--title">Timeline</p>
            <p>5-6 weeks</p>
          </div>
        </div>
        <div class="service__content grid-template t1-body">
          <p class="service__content--text--1">
            We craft content strategies and narratives that connect with your
            audience and drive engagement through storytelling, design, and
            data-driven insights.
          </p>
          <div class="service__content--text--2">
            <p>Includes</p>
            <ul>
              <li>UX/UI design</li>
              <li>Web development</li>
              <li>Mobile development</li>
            </ul>
          </div>
          <div class="service__content--image">
            <NuxtImg
              src="/images/services/web-mobile.png"
              alt="Web & Mobile"
              width="600"
              height="400"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="service service--2">
      <div class="service__container grid-container">
        <div class="grid-template">
          <div class="service__title">
            <p class="t1-body-accent">02</p>
            <p class="t1-h3">Brand strategy</p>
          </div>
          <div class="service__timeline t1-body">
            <p class="service__timeline--title">Timeline</p>
            <p>3-4 weeks</p>
          </div>
        </div>
        <div class="service__content grid-template t1-body">
          <p class="service__content--text--1">
            We craft content strategies and narratives that connect with your
            audience and drive engagement through storytelling, design, and
            data-driven insights.
          </p>
          <div class="service__content--text--2">
            <p>Includes</p>
            <ul>
              <li>UX/UI design</li>
              <li>Web development</li>
              <li>Mobile development</li>
            </ul>
          </div>
          <div class="service__content--image">
            <NuxtImg
              src="/images/services/web-mobile.png"
              alt="Web & Mobile"
              width="600"
              height="400"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="service service--3">
      <div class="service__container grid-container">
        <div class="grid-template">
          <div class="service__title">
            <p class="t1-body-accent">03</p>
            <p class="t1-h3">Strategy & Content</p>
          </div>
          <div class="service__timeline t1-body">
            <p class="service__timeline--title">Timeline</p>
            <p>3-4 weeks</p>
          </div>
        </div>
        <div class="service__content grid-template t1-body">
          <p class="service__content--text--1">
            We craft content strategies and narratives that connect with your
            audience and drive engagement through storytelling, design, and
            data-driven insights.
          </p>
          <div class="service__content--text--2">
            <p>Includes</p>
            <ul>
              <li>UX/UI design</li>
              <li>Web development</li>
              <li>Mobile development</li>
            </ul>
          </div>
          <div class="service__content--image">
            <NuxtImg
              src="/images/services/web-mobile.png"
              alt="Web & Mobile"
              width="600"
              height="400"
            />
          </div>
        </div>
      </div>
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
        if (index === 0) {
          $ScrollTrigger.create({
            trigger: service,
            start: "bottom bottom",
            end: "bottom top",
            // markers: true,
            scrub: true,
            pin: ".caca",
            pinSpacing: false,
          });
        } else {
          $ScrollTrigger.create({
            trigger: service,
            start: "bottom bottom",
            end: "bottom top",
            // markers: true,
            scrub: true,
            pin: true,
            pinSpacing: false,
          });
        }
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
  height: 100svh;
  position: relative;

  &--1 {
    background-color: var(--color-pink);
  }
  &--2 {
    background-color: var(--color-grey);
  }
  &--3 {
    background-color: var(--color-white);
  }

  &__title {
    grid-column-start: 1;
    grid-column-end: 4;
    font-weight: 400;
    display: flex;
    align-items: start;
    gap: 8rem;
    padding-top: 4rem;
  }

  .t1-h3 {
    font-weight: 400;
    line-height: 0.77;
    font-family: var(--font-cormorant);
  }

  .t1-body-accent {
    font-family: var(--font-cormorant);
    font-style: italic;
    line-height: 1;
  }

  &__timeline {
    grid-column-start: 4;
    grid-column-end: 5;
    display: flex;
    flex-direction: column;
    align-items: end;
    justify-content: space-between;
    padding-top: 5rem;
    color: var(--color-black);

    &--title {
      opacity: 0.3;
      align-self: flex-start;
    }
  }

  &__content {
    margin-top: 2rem;
    &--text--1 {
      padding-top: 45rem;
      grid-column-start: 1;
      grid-column-end: 2;
    }
    &--text--2 {
      padding-top: 45rem;
      grid-column-start: 3;
      grid-column-end: 4;
      display: flex;
      gap: 3rem;

      ul {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    }
    &--image {
      grid-column-start: 4;
      grid-column-end: 5;
      display: flex;
      height: 100%;
      img {
        object-fit: cover;
      }
    }
  }
}

.grid-template {
  display: grid;
  grid-template-columns: repeat(var(--columns), 1fr);
  grid-template-rows: repeat(var(--rows), 1fr);
  gap: var(--grid-gap);
}

@include respond-to("desktop") {
  .grid-template {
    display: grid;
    grid-template-columns: repeat(var(--columns), 1fr);
    grid-template-rows: repeat(var(--rows), 1fr);
    gap: var(--grid-gap);
  }
}
</style>
