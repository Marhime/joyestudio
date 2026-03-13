<template>
  <section ref="sectionRef">
    <div class="services__title-container grid-container">
      <h2 class="t2-body-accent font-como font-italic">(SERVICES)</h2>
      <LayoutLines color="black" />
    </div>
    <div class="services">
      <div class="service service--1">
        <div class="service__container grid-container">
          <div class="grid-template">
            <p class="t1-body-accent service__number">01</p>
            <p class="t1-h3 service__title">Web & Mobile</p>
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
        <LayoutLines color="white" />
      </div>
      <div class="service service--2">
        <div class="service__container grid-container">
          <div class="grid-template">
            <p class="t1-body-accent service__number">02</p>
            <p class="t1-h3 service__title">Brand strategy</p>
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
        <LayoutLines color="black" />
      </div>
      <div class="service service--3">
        <div class="service__container grid-container">
          <div class="grid-template">
            <p class="t1-body-accent service__number">03</p>
            <p class="t1-h3 service__title">Strategy & Content</p>
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
        <LayoutLines color="black" />
      </div>
    </div>
  </section>
</template>

<script setup>
const { $gsap } = useNuxtApp();
const sectionRef = ref(null);
let ctx;
let resizeHandler;

onMounted(() => {
  const createPinAnimation = () => {
    ctx?.revert();

    ctx = $gsap.context(() => {
      const services = $gsap.utils.toArray(".service", sectionRef.value);

      // Measure each card's header height (title row + paddingTop)
      const headerHeights = services.map(
        (s) =>
          s.querySelector(".grid-template").offsetHeight +
          parseFloat(getComputedStyle(s).paddingTop),
      );

      const titleContainer = sectionRef.value.querySelector(
        ".services__title-container",
      );
      const servicesWrapper = sectionRef.value.querySelector(".services");

      // build a sequential timeline: each card slides up to its stacked position
      const tl = $gsap.timeline({
        defaults: { ease: "none", duration: 1 },
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top top",
          end: () => `+=${cardHeight * 2}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          // pinSpacing: false,
        },
      });

      const cardHeight = window.innerHeight - headerHeights[0] * 2; // assuming all cards have the same height

      services.forEach((service, i) => {
        // sum of header heights of all cards above this one
        const cumulativeHeaders = headerHeights
          .slice(0, i)
          .reduce((acc, h) => acc + h, 0);

        $gsap.set(service, { height: cardHeight });

        if (i === 0) {
          tl.to(servicesWrapper, {
            y: () => -titleContainer.offsetHeight,
          });
          tl.to(
            titleContainer,
            {
              y: () => -titleContainer.offsetHeight,
            },
            "<",
          );
          return;
        } // first card stays fixed at top

        if (i === 1) {
          // card 2 slides up sequentially after the title block
          tl.to(
            service,
            {
              yPercent: () => -100 + (cumulativeHeaders / cardHeight) * 100,
            },
            "<",
          );
          return;
        }

        if (i === 2) {
          // card 3 starts before card 2 finishes → overlap effect
          tl.to(
            service,
            {
              yPercent: () => -200 + (cumulativeHeaders / cardHeight) * 100,
            },
            "<+0.4", // start 0.5s before previous animation ends
          );

          return;
        }
      });
    });
  };

  const debouncedCreatePinAnimation = debounce(createPinAnimation, 200);

  nextTick(createPinAnimation);

  resizeHandler = () => debouncedCreatePinAnimation();
  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  ctx?.revert();
  window.removeEventListener("resize", resizeHandler);
});
</script>

<style lang="scss" scoped>
section {
  position: relative;
}
.services {
  position: relative;
  z-index: 5;
  height: 100svh;

  @include respond-to("desktop") {
    padding-bottom: 4rem;
  }

  &__title-container {
    display: flex;
    align-items: center;
    padding-block: 2.5rem;
    padding-inline: var(--content-margin);
    position: relative;
    z-index: 1;
    h2 {
      color: var(--color-black);
    }

    @include respond-to("desktop") {
      padding-top: 10rem;
      padding-bottom: 5rem;
    }
  }
}
.service {
  padding-block: 4rem;
  position: relative;

  &--1 {
    background-color: var(--color-pink);
    z-index: 1;
  }
  &--2 {
    background-color: var(--color-grey);
    z-index: 2;
  }
  &--3 {
    background-color: var(--color-white);
    z-index: 3;
  }

  &__number {
    grid-column: 2 / 4;
    font-weight: 400;
    align-items: start;

    @include respond-to("desktop") {
      padding-left: var(--content-margin);
      grid-column: 1 / 2;
    }
  }

  &__title {
    grid-column: 4 / 12;
    font-family: var(--font-cormorant);

    @include respond-to("desktop") {
      grid-column: 2 / 8;
      padding-left: var(--content-margin);
    }
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

  &__container {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    z-index: 1;
  }

  &__timeline {
    grid-column: 8 / 12;
    display: flex;
    flex-direction: column;
    align-items: end;
    justify-content: space-between;
    padding-top: 5rem;
    padding-right: var(--content-margin);
    color: var(--color-black);

    &--title {
      opacity: 0.3;
      align-self: flex-start;
    }
  }

  &__content {
    height: 100%;
    margin-top: 2rem;
    &--text--1 {
      grid-column: 4 / 12;
      align-self: flex-end;

      @include respond-to("desktop") {
        padding-left: var(--content-margin);
        grid-column: 1 / 3;
      }
    }
    &--text--2 {
      grid-column: 4 / 8;
      display: flex;
      align-self: flex-end;
      gap: 3rem;

      @include respond-to("desktop") {
        grid-column: 4 / 8;
      }

      ul {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    }
    &--image {
      grid-column: 2 / 12;
      display: flex;
      height: 100%;
      margin-top: 4.5rem;
      img {
        object-fit: cover;
      }

      @include respond-to("desktop") {
        grid-column: 8 / 12;
        justify-content: flex-end;
        margin-top: 0;
        padding-right: var(--content-margin);
      }
    }
  }
}

.grid-template {
  @include grid;
}
</style>
