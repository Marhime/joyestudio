<template>
  <section ref="sectionRef" class="about">
    <div class="grid-container">
      <div class="about__title">
        <p class="t2-body-accent font-como font-italic">
          <span>( Our</span><span class="align-end">approach )</span>
        </p>
      </div>
      <div class="about__wrapper">
        <h2 class="about__content t1-h2">
          <span class="about__content-line about__content-line--1">
            <span>At </span>
            <span class="font-italic font-como t2-h2">Joyestudio, </span>
            <span>we</span></span
          >
          <span class="about__content-line about__content-line--2"
            >believe every brand</span
          >
          <span class="about__content-line about__content-line--3">
            <span>deserves </span
            ><span hiye-face-placeholder class="face-placeholder"></span
            ><span>a digital</span>
          </span>
          <span class="icon"
            ><img src="~/assets/images/icons/right-arrow.svg" /></span
          ><span class="about__content-line--4">presence that feels</span>
          <span
            class="about__content-line about__content-line--5 font-italic font-como t2-h2"
            ><span class="icon-mobile"
              ><img src="~/assets/images/icons/right-arrow.svg"
            /></span>
            <span>as good as it looks</span></span
          >
        </h2>
      </div>
      <div class="text-container">
        <div class="text-wrapper">
          <p>
            <span>
              We help ambitious brands transform their ideas into digital
              products</span
            >
            that make sense, look sharp, and perform
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const { $gsap, $Flip } = useNuxtApp();

const sectionRef = ref(null);
const buttonWrapperRef = ref(null);

let ctx;

onMounted(() => {
  const hiyeFace = document.querySelector("[hiye-face]");
  const finalLeftContainer = document.querySelector("[hiye-face-placeholder]");

  let initialState;
  let finalState;

  const updatePositions = () => {
    initialState = finalLeftContainer?.getBoundingClientRect();
  };

  const createFlipAnimation = () => {
    // revalidate positions
    ctx?.revert();

    // set fixed when the context is active (avoids layout shifts before context)
    ctx = $gsap.context(() => {
      updatePositions();
      finalState = $Flip.getState(finalLeftContainer);

      const tlFlip = $gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top bottom",
          end: "top top",
          scrub: 1,
        },
      });

      const flipConfig = {
        ease: "none",
        duration: 1,
      };

      tlFlip.add($Flip.fit(hiyeFace, finalState, flipConfig), 0);

      const tlContent = $gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "40% bottom",
          end: "70% bottom",
          scrub: 1,
          // markers: true,
        },
      });

      // tlContent.from(".about__content-line span", {
      //   yPercent: 200,
      //   ease: "power2.in",
      // });
    });
  };

  const debouncedCreateFlipAnimation = debounce(() => {
    createFlipAnimation();
  }, 200);

  nextTick(() => {
    createFlipAnimation();
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
.about {
  position: relative;
  z-index: 1;
  padding-top: 10rem;
  padding-bottom: 6.6rem;
  @include respond-to("desktop") {
    padding-top: 30rem;
  }
  &__wrapper {
    .face-placeholder {
      width: 6rem;
      @include respond-to("desktop") {
        width: 13rem;
        height: 13rem;
      }
    }

    .icon {
      display: none;
      img {
        width: 100%;
        height: auto;
        display: block;
      }
      @include respond-to("desktop") {
        color: black;
        align-self: flex-end;
        display: block;
        width: 12.5rem;
        grid-column-start: 2;
        grid-column-end: 2;
      }
    }
  }

  .grid-container {
    position: relative;
  }

  &__title {
    text-transform: uppercase;
    @include grid;
    margin-bottom: 2.4rem;

    p {
      display: flex;
      flex-direction: column;
      grid-column-start: 2;
      line-height: 1;
      width: 40%;
    }
    .align-end {
      align-self: flex-end;
    }

    @include respond-to("desktop") {
      display: block;
      position: absolute;
      top: 0;
      left: var(--grid-margin);
      width: 18%;
      margin-bottom: 0;
    }
  }

  &__content {
    font-family: var(--font-inter);
    line-height: 1;
    align-items: center;
    color: var(--color-black);
    @include grid;

    .t2-h2 {
      line-height: 0.8;
    }

    &-line {
      line-height: 1;
      &--1 {
        grid-column-start: 2;
        grid-column-end: 5;
      }
      &--2 {
        grid-column-start: 1;
        grid-column-end: 5;
      }
      &--3 {
        grid-column-start: 1;
        grid-column-end: 5;
        display: flex;
        gap: 0.5rem;
      }
      &--4 {
        grid-column-start: 1;
        grid-column-end: 5;
      }
      &--5 {
        grid-column-start: 1;
        grid-column-end: 5;
        display: flex;
        align-items: center;
        gap: 1rem;
        img {
          width: 2.5rem;
        }
      }
    }

    @include respond-to("desktop") {
      &-line {
        &--1 {
          grid-column-start: 3;
          grid-column-end: 5;
        }
        &--2 {
          grid-column-start: 2;
          grid-column-end: 5;

          margin-left: -0.6rem;
        }
        &--3 {
          grid-column-start: 2;
          grid-column-end: 5;
          display: flex;
          gap: 4.5rem;

          margin-left: -0.3rem;
        }
        &--4 {
          grid-column-start: 3;
          grid-column-end: 5;
          margin-left: -0.6rem;
        }
        &--5 {
          grid-column-start: 3;
          grid-column-end: 5;
          margin-left: -0.3rem;
          display: block;
          .icon-mobile {
            display: none;
          }
        }
      }
    }
  }

  .text-container {
    @include grid;
    margin-top: 9.5rem;
    .text-wrapper {
      grid-column-start: 2;
      grid-column-end: 5;
      p {
        font-size: 1.1rem;
        text-transform: uppercase;
        @include font-inter;

        span {
          opacity: 0.3;
        }
      }
    }

    @include respond-to("desktop") {
      margin-top: 16.5rem;
      .text-wrapper {
        grid-column-start: 3;
        grid-column-end: 4;
        p {
          font-size: 2.4rem;
        }
      }
    }
  }
}
</style>
