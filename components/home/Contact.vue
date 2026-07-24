<template>
  <section ref="sectionRef" class="contact-home">
    <div class="grid-container">
      <div class="contact-home__wrapper">
        <h3 class="contact-home__content t1-h2">
          <span
            class="contact-home__content-line contact-home__content-line--1"
          >
            R<span class="t2-h2 font-como font-italic">e</span>ady
            <span
              ref="anchorRef"
              contact-smiley-anchor
              data-smiley-scale="1.3"
              class="face-placeholder"
            ></span>
          </span>

          <span
            class="contact-home__content-line--2 icon"
            @mouseenter="smiley.notice($event.currentTarget)"
            ><RightArrow
          /></span>
          <span class="contact-home__content-line--3"
            >to conn<span class="t2-h2 font-como font-italic">e</span>ct?</span
          >
        </h3>
      </div>
    </div>
    <LayoutLines color="white" />
  </section>
</template>

<script setup>
import RightArrow from "../icons/RightArrow.vue";
import { useGSAP } from "~/composables/useGSAP";
import { useSmiley } from "~/composables/useSmiley";
import { trySmileyAction } from "~/composables/useSmileyCooldown";

const sectionRef = useTemplateRef("sectionRef");
const anchorRef = useTemplateRef("anchorRef");

const { gsap, SplitText, mm, BP, scheduleRefresh } = useGSAP();
const smiley = useSmiley();

onMounted(() => {
  nextTick(() => {
    if (!sectionRef.value) return;

    // Same logic for desktop and mobile — track swap is a one-liner,
    // and the heading reveal shares the site's signature (masked rise,
    // power3.out). The smiley rides the "Ready" line as it settles in.
    const setup = () => {
      const el = sectionRef.value;

      // ── Pixel-rain arrival ─────────────────────────────────────────
      // Same grammar as hero→about: the ball parked in the About sentence
      // scrolled out above long ago — as this section climbs in, its
      // pixels rain down into "Ready ⚪" (gated morph: the swarm only
      // pours from off-screen). Scrubbed → reversible and parkable, and
      // scrolling back up plays the exact mirror before re-tracking About.
      const aboutPh = document.querySelector("[hiye-face-placeholder]");
      if (aboutPh) {
        gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "top 35%",
            scrub: 0.7,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (anchorRef.value)
                smiley.morphScrub(self.progress, aboutPh, anchorRef.value);
            },
            onLeave: () => {
              smiley.setDissolve(0);
              if (anchorRef.value) smiley.track(anchorRef.value);
            },
            onLeaveBack: () => {
              smiley.setDissolve(0);
              smiley.track(aboutPh);
            },
          },
        });
      }

      // ── Heading reveal ────────────────────────────────────────────────
      const line1 = el.querySelector(".contact-home__content-line--1");
      const arrow = el.querySelector(".contact-home__content-line--2");
      const line3 = el.querySelector(".contact-home__content-line--3");

      // "Ready" — block rise (never SplitText: it holds the tracked smiley
      // anchor). The 3D sphere follows the anchor rect, so it rides in too.
      if (line1) gsap.set(line1, { autoAlpha: 0, yPercent: 60 });
      // Arrow — starts off-screen LEFT. It enters LAST and drives the
      // "to connect?" line to the right (final beat below).
      if (arrow) gsap.set(arrow, { xPercent: -180, autoAlpha: 0 });
      // "to connect?" — masked rise. Split by LINES, not words: the nested
      // italic accent (the "e") fragments word-splitting and eats the space
      // ("toconnect"), while a single line wrapper keeps the phrase intact.
      const line3Split = line3
        ? new SplitText(line3, { type: "lines", mask: "lines" })
        : null;
      if (line3Split) {
        gsap.set(line3Split.masks || [], {
          padding: "0.2em 0.15em",
          margin: "-0.2em -0.15em",
        });
        gsap.set(line3Split.lines, { yPercent: 132 });
      }
      // Pre-offset the line left so the arrow has room to shove it back to 0 —
      // it reveals already displaced, then gets pushed (a real move, no jump).
      if (line3) gsap.set(line3, { x: -50 });

      // "Ready ⚪" rises as it enters — the smiley rides it up.
      if (line1)
        gsap.to(line1, {
          autoAlpha: 1,
          yPercent: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: line1,
            start: "top 85%",
            toggleActions: "play none none reverse",
            invalidateOnRefresh: true,
          },
        });

      // The "to connect?" row reveals on ITS OWN entry so the arrow-shove is
      // actually seen — the heading is taller than the viewport, so a single
      // top-of-section trigger would fire this beat off-screen. Sequence:
      // the phrase composes → the arrow drives in from the left and shoves
      // the line right (recoil + settle) → the smiley greets.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: line3 || el,
          start: "top 80%",
          toggleActions: "play none none reverse",
          invalidateOnRefresh: true,
        },
      });
      if (line3Split)
        tl.to(
          line3Split.lines,
          { yPercent: 0, duration: 0.9, ease: "power3.out" },
          0,
        );

      const pushAt = 0.75; // arrow enters as the phrase finishes composing
      if (arrow)
        tl.to(
          arrow,
          { xPercent: 0, autoAlpha: 1, duration: 0.6, ease: "power4.out" },
          pushAt,
        );
      if (line3)
        tl.to(
          line3,
          { x: 0, duration: 0.55, ease: "back.out(1.8)" },
          pushAt + 0.12, // starts as the arrow reaches the text
        );

      // Greeting: once the phrase has landed, the smiley — parked in
      // "Ready ⚪" — winks. Replays on re-entry (reveals reverse + replay
      // site-wide); the cooldown keeps repeated passes from wink-spamming.
      tl.call(() => trySmileyAction(() => smiley.wink()));

      return () => {};
    };

    mm.add(BP.desktop, setup);
    mm.add(BP.mobile, setup);

    // Reduced motion: do nothing — smiley stays in whatever mode it was,
    // and the heading is never hidden (hidden states live inside setup).
    mm.add(BP.reducedMotion, () => () => {});

    scheduleRefresh();
  });
});
</script>

<style lang="scss" scoped>
.contact-home {
  position: relative;
  padding-block: 10rem;
  z-index: 0;
  background-color: var(--color-pink);
  color: var(--color-white);
  @include respond-to("desktop") {
    padding-block: 30rem;
  }
  .face-placeholder {
    display: block;
    width: 6rem;
    height: 6rem;
    margin-left: var(--content-margin);
    @include respond-to("desktop") {
      width: 13rem;
      height: 13rem;
    }
  }

  .icon {
    svg {
      width: 100%;
      height: auto;
      display: block;
      color: var(--color-white);
      width: 90%;
    }
    @include respond-to("desktop") {
      align-self: flex-end;
      display: block;
      // width: 12.5rem;
    }
  }

  &__content {
    line-height: 1;
    align-items: center;
    color: var(--color-white);
    @include grid;
    row-gap: 1rem;

    .t2-h2 {
      line-height: 0.65;
    }

    &-line {
      &--1 {
        grid-column-start: 4;
        grid-column-end: -1;
        display: flex;
        align-items: flex-end;
        line-height: 0.75;
      }
      &--2 {
        grid-column-start: 4;
        grid-column-end: 5;
      }
      &--3 {
        grid-column-start: 5;
        grid-column-end: -1;
      }
    }

    @include respond-to("desktop") {
      &-line {
        &--1 {
          grid-column-start: 4;
          grid-column-end: -1;
          margin-left: -0.8rem;
        }
        &--2 {
          grid-column-start: 4;
          grid-column-end: 4;
        }
        &--3 {
          display: flex;
          align-items: flex-end;

          line-height: 0.75;
          grid-column-start: 5;
          grid-column-end: -1;
        }
      }
    }
  }
}
</style>
