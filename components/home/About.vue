<template>
  <section ref="sectionRef" class="about">
    <div class="grid-container">
      <div class="about__title">
        <h2 class="t2-body-accent font-como font-italic">
          <span>( Our</span><span class="align-end">approach )</span>
        </h2>
      </div>
      <div class="about__wrapper">
        <h3 class="about__content t1-h2">
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
          <span class="icon"><RightArrow /></span
          ><span class="about__content-line--4">presence that feels</span>
          <span
            class="about__content-line about__content-line--5 font-italic font-como t2-h2"
            ><span class="icon-mobile"><RightArrow /></span>
            <span>as good as it looks</span></span
          >
        </h3>
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
    <LayoutLines color="black" />
  </section>
</template>

<script setup>
import RightArrow from "../icons/RightArrow.vue";

const { gsap, Flip, mm, BP, scheduleRefresh } = useGSAP();

const sectionRef = useTemplateRef("sectionRef");

// Sphère 3D fournie par le layout default via provide/inject
const pixelBlob = inject("pixelBlob");

let resizeHandler;

const setupAnimations = () => {
  mm.revert();

  mm.add(BP.desktop, () => {
    const hiyeFace = document.querySelector("[hiye-face]");
    const finalLeftContainer = document.querySelector(
      "[hiye-face-placeholder]",
    );
    if (!hiyeFace || !finalLeftContainer || !sectionRef.value) return;

    const finalState = Flip.getState(finalLeftContainer);

    const tlFlip = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top bottom",
        end: "top top",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    tlFlip.add(
      Flip.fit(hiyeFace, finalState, { ease: "none", duration: 1 }),
      0,
    );

    return () => {};
  });

  mm.add(BP.mobile, () => {
    const hiyeFace = document.querySelector("[hiye-face]");
    const finalLeftContainer = document.querySelector(
      "[hiye-face-placeholder]",
    );
    if (!hiyeFace || !finalLeftContainer || !sectionRef.value) return;

    const finalState = Flip.getState(finalLeftContainer);

    const tlFlip = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top bottom",
        end: "top top",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    tlFlip.add(
      Flip.fit(hiyeFace, finalState, { ease: "none", duration: 1 }),
      0,
    );

    return () => {};
  });

  mm.add(BP.reducedMotion, () => {
    gsap.set("[hiye-face]", { clearProps: "all" });
    return () => {};
  });

  scheduleRefresh();
};

onMounted(() => {
  nextTick(() => {
    setupAnimations();

    // Tracking temps réel — la sphère 3D suit l'élément hiye-face
    const hiyeFaceEl = document.querySelector("[hiye-face]");
    if (hiyeFaceEl) {
      pixelBlob?.value?.startTracking(hiyeFaceEl);
    }
  });

  resizeHandler = debounce(() => {
    setupAnimations();
    const hiyeFaceEl = document.querySelector("[hiye-face]");
    if (hiyeFaceEl) pixelBlob?.value?.startTracking(hiyeFaceEl);
  }, 200);

  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
});
</script>

<style lang="scss" scoped>
.about {
  position: relative;
  padding-bottom: 6.6rem;
  z-index: 0;
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
      svg {
        width: 100%;
        height: auto;
        display: block;
        color: var(--color-black);
      }
      @include respond-to("desktop") {
        display: block;
        align-self: flex-end;
        width: 12.5rem;
        grid-column-start: 3;
        grid-column-end: 4;
      }
    }
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

    @include respond-to("desktop") {
      display: block;
      position: absolute;
      top: 0;
      left: var(--content-margin);
      width: 18%;
      margin-bottom: 0;
    }
  }

  &__content {
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
        grid-column-start: 4;
        grid-column-end: -1;
      }
      &--2 {
        grid-column-start: 2;
        grid-column-end: -1;
      }
      &--3 {
        grid-column-start: 2;
        grid-column-end: -1;
        display: flex;
        gap: 0.5rem;
      }
      &--4 {
        grid-column-start: 2;
        grid-column-end: -1;
      }
      &--5 {
        grid-column-start: 2;
        grid-column-end: -1;
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
          grid-column-start: 4;
          grid-column-end: 11;
        }
        &--2 {
          grid-column-start: 3;
          grid-column-end: 11;

          margin-left: -0.6rem;
        }
        &--3 {
          grid-column-start: 3;
          grid-column-end: 11;
          display: flex;
          gap: 4.5rem;

          margin-left: -0.3rem;
        }
        &--4 {
          grid-column-start: 4;
          grid-column-end: 11;
          margin-left: -0.6rem;
        }
        &--5 {
          grid-column-start: 3;
          grid-column-end: 11;
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
      grid-column-start: 4;
      grid-column-end: 11;
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
        grid-column-start: 4;
        grid-column-end: 8;
        p {
          font-size: 2.4rem;
        }
      }
    }
  }
}
</style>
