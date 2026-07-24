<template>
  <section ref="sectionRef">
    <div class="services__title-container grid-container">
      <h2 class="t2-body-accent font-como font-italic">(SERVICES)</h2>
      <LayoutLines color="black" />
    </div>
    <div class="services">
      <div class="services__stage">
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
                We craft content strategies and narratives that connect with
                your audience and drive engagement through storytelling, design,
                and data-driven insights.
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
                We craft content strategies and narratives that connect with
                your audience and drive engagement through storytelling, design,
                and data-driven insights.
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
                We craft content strategies and narratives that connect with
                your audience and drive engagement through storytelling, design,
                and data-driven insights.
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
    </div>
  </section>
</template>

<script setup>
const { gsap, SplitText, mm, BP, scheduleRefresh } = useGSAP();
const sectionRef = useTemplateRef("sectionRef");
let resizeHandler;

const setupAnimations = () => {
  mm.revert();

  // One context for every breakpoint — the sticky-stage effect is the
  // same on mobile and desktop; only reduced motion opts out
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const services = gsap.utils.toArray(".service", sectionRef.value);
    if (!services.length) return;

    const headerHeights = services.map(
      (s) =>
        s.querySelector(".grid-template").offsetHeight +
        parseFloat(getComputedStyle(s).paddingTop) +
        8,
    );

    const servicesWrapper = sectionRef.value.querySelector(".services");

    // Cards get the full viewport once the (SERVICES) title scrolls away
    const cardHeight = window.innerHeight;

    // Sticky-stage stack — no pin, no master timeline: the stage is the
    // screen, cards sit at their final place inside it and enter by clip
    // alone, one viewport of stuck-stage scroll per card.
    const CARD_DURATION = 0.8; // length of each card's entrance wipe
    const CONTENT_DELAY = 0.2; // texts start once the wipe clears the title row
    const CONTENT_DELAY_FIRST = 0.2; // card 1 waits longer — its beat spans the whole entry

    const stage = sectionRef.value.querySelector(".services__stage");
    gsap.set(servicesWrapper, {
      height:
        cardHeight * services.length +
        headerHeights.reduce((acc, h) => acc + h, 0),
    });
    gsap.set(stage, { position: "sticky", top: 0, height: cardHeight });

    services.forEach((service, i) => {
      const cumulativeHeaders = headerHeights
        .slice(0, i)
        .reduce((acc, h) => acc + h, 0);

      // Card 1 unrolls across the whole approach; each next card gets
      // one viewport of stuck-stage scroll
      const track = gsap.timeline({
        scrollTrigger: {
          trigger: servicesWrapper,
          start: i === 0 ? "top 80%" : () => `top+=${(i - 1) * cardHeight} top`,
          end: i === 0 ? "top top" : () => `+=${cardHeight}`,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      const title = service.querySelector(".service__title");
      const number = service.querySelector(".service__number");
      const timeline = service.querySelector(".service__timeline");
      const content = service.querySelector(".service__content");
      const imageWrap = service.querySelector(".service__content--image");
      const image = service.querySelector(".service__content--image img");
      const bodyTexts = service.querySelectorAll(
        ".service__timeline p, .service__content--text--1, .service__content--text--2 p, .service__content--text--2 li",
      );

      // Masked reveals — same signature as About (keep values in sync):
      // display texts split into words, body texts into lines
      const displaySplit = new SplitText([number, title], {
        type: "words",
        mask: "words",
      });
      const bodySplit = new SplitText(bodyTexts, {
        type: "lines",
        mask: "lines",
      });
      // Pad mask wrappers so italic ascenders/descenders aren't clipped
      gsap.set(displaySplit.masks || [], {
        padding: "0.2em 0.15em",
        margin: "-0.2em -0.15em",
      });

      // Already at its final place inside the stage — hidden by clip,
      // shortened so the stack always fits the viewport. Card 1 hides
      // behind a BOTTOM inset: its reveal line travels downward with
      // the entry (no white sliver); the others rise over the stack.
      gsap.set(service, {
        position: "absolute",
        top: cumulativeHeaders,
        left: 0,
        width: "100%",
        height: cardHeight - cumulativeHeaders,
        clipPath: "inset(100% 0% 0% 0%)",
      });

      gsap.set(displaySplit.words, { yPercent: 132 });
      gsap.set(bodySplit.lines, { yPercent: 100 });
      gsap.set(imageWrap, { clipPath: "inset(100% 0% 0% 0%)" });
      gsap.set(image, { scale: 1.15 });
      gsap.set([title, number, timeline, content, image], {
        y: 20,
      });

      // Card content entrance: block drift + number/title words lead,
      // body lines sweep top-down, the image wipes open last
      const revealContent = (position) => {
        track.to(
          [title, number, timeline, content, image],
          {
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.05,
          },
          position,
        );
        track.to(
          displaySplit.words,
          {
            yPercent: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.03,
          },
          "<",
        );
        track.to(
          bodySplit.lines,
          {
            yPercent: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.05,
          },
          "<+0.1",
        );
        track.to(
          imageWrap,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.9,
            ease: "power3.out",
          },
          "<+0.1",
        );
        // Zoom settles a beat longer than its mask — follow-through
        track.to(
          image,
          {
            scale: 1,
            duration: 1.2,
            ease: "power3.out",
          },
          "<",
        );
      };

      // Entrance: the wipe rises in place, then the content composes
      track.to(
        service,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: CARD_DURATION,
          ease: "power3.out",
        },
        0,
      );
      revealContent(i === 0 ? CONTENT_DELAY_FIRST : CONTENT_DELAY);
    });

    return () => {};
  });

  mm.add(BP.reducedMotion, () => {
    const services = gsap.utils.toArray(".service", sectionRef.value);
    services.forEach((service) => {
      gsap.set(service, { clearProps: "all" });
    });
    return () => {};
  });

  scheduleRefresh();
};

onMounted(() => {
  nextTick(setupAnimations);

  resizeHandler = debounce(setupAnimations, 200);
  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
});
</script>

<style lang="scss" scoped>
section {
  position: relative;
}
.services {
  position: relative;
  z-index: 5;

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
    color: var(--color-white);
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
