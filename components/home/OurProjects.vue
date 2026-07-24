<template>
  <section ref="sectionRef" class="projects">
    <div class="grid grid-container projects__header">
      <h2 class="t1-h3 font-inter">
        <span
          ><span class="t1-h3-accent font-como font-italic">(</span>
          <span class="t1-h3-accent font-como font-italic">O</span>ur</span
        ><span class="align-end"
          >w<span class="t1-h3-accent font-como font-italic">o</span>rk
          <span class="t1-h3-accent font-como font-italic">)</span></span
        >
      </h2>
      <div class="description">
        <p class="t1-body uppercase">
          We've helped brands of all sizes turn their digital presence
          <span class="">into their strongest asset</span>
        </p>
      </div>
    </div>
    <div class="grid-container">
      <div class="grid projects__grid">
        <ProjectCard
          v-for="(project, index) in projects"
          :key="index"
          :project="project"
        />
      </div>
    </div>
    <ButtonComponent text="See all projects" class="projects__button" />
    <LayoutLines color="black" />
  </section>
</template>

<script lang="ts" setup>
import ProjectCard from "./ProjectCard.vue";
import { projects } from "../../content/projects";
import ButtonComponent from "../layout/ButtonComponent.vue";
import type { RevealContext } from "~/composables/useSectionReveal";

const sectionRef = useTemplateRef<HTMLElement>("sectionRef");

// Same motion language as Services / About — one site, one signature:
//   • display text  → masked words rise (yPercent 132, power3.out, stagger 0.03)
//   • body text     → masked lines rise (yPercent 100, power3.out)
//   • media         → clip-path wipe + scale that settles a beat longer (follow-through)
// Header reveals on the section; each card reveals on its own trigger so
// nothing animates while still below the fold in this tall grid.
useSectionReveal(sectionRef, {
  name: "our-work",
  desktop: (ctx) => revealProjects(ctx, { display: 132, body: 100, mobile: false }),
  mobile: (ctx) => revealProjects(ctx, { display: 110, body: 100, mobile: true }),
});

interface RevealOpts {
  display: number;
  body: number;
  mobile: boolean;
}

function revealProjects(ctx: RevealContext, opts: RevealOpts) {
  const { gsap, SplitText, el } = ctx;

  // ── Header — display title (masked words) + body description (masked lines)
  const titleLines = el.querySelectorAll<HTMLElement>(
    ".projects__header h2 > span",
  );
  const titleSplit = new SplitText(titleLines, { type: "lines", mask: "lines" });
  gsap.set(titleSplit.masks || [], {
    padding: "0.2em 0.15em",
    margin: "-0.2em -0.15em",
  });
  gsap.set(titleSplit.lines, { yPercent: opts.display });
  gsap.to(titleSplit.lines, {
    yPercent: 0,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.08,
    scrollTrigger: {
      trigger: el,
      start: "top 75%",
      invalidateOnRefresh: true,
    },
  });

  const desc = el.querySelector<HTMLElement>(".description p");
  if (desc) {
    const descSplit = new SplitText(desc, { type: "lines", mask: "lines" });
    gsap.set(descSplit.lines, { yPercent: opts.body });
    gsap.to(descSplit.lines, {
      yPercent: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: {
        trigger: desc,
        start: "top 80%",
        invalidateOnRefresh: true,
      },
    });
  }

  // ── Cards — per-card trigger: media wipes open, image zoom settles longer,
  //    overview drifts up. Each card owns its own reveal as it enters view.
  const cards = gsap.utils.toArray<HTMLElement>(".project", el);
  cards.forEach((card) => {
    const media = card.querySelector<HTMLElement>(".project__media");
    const image = card.querySelector<HTMLElement>(".project__image");
    const overview = card.querySelector<HTMLElement>(".project-overview");

    if (media) gsap.set(media, { clipPath: "inset(100% 0% 0% 0%)" });
    // Persistent oversize — the image is always larger than its frame, which
    // gives the parallax drift below room to move without ever showing an edge.
    if (image) gsap.set(image, { scale: 1.22 });
    if (overview) gsap.set(overview, { autoAlpha: 0, y: 20 });

    // ── Reveal (triggered → keeps the signature power3.out) ───────────────
    // Fire once the card is genuinely climbing INTO view (not at the very
    // bottom edge): these cards are tall, so an early "top 88%" ran the wipe
    // below the fold and the card arrived already revealed. Lower start =
    // the wipe plays where the eye is.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: card,
        start: opts.mobile ? "top 78%" : "top 68%",
        invalidateOnRefresh: true,
      },
    });

    if (media)
      tl.to(
        media,
        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.out" },
        0,
      );
    if (image)
      // Zoom outlasts its own wipe (follow-through) and settles to an
      // OVERSIZED rest (1.14) — leaving ~7% headroom each side for parallax.
      tl.to(image, { scale: 1.14, duration: 1.2, ease: "power3.out" }, 0);
    if (overview)
      tl.to(
        overview,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
        },
        0.15,
      );

    // ── Parallax layer (scrubbed → the scroll-coupling, ease:"none") ──────
    // The oversized image drifts vertically inside its mask as the card
    // travels the viewport. ±5% stays within the 7% headroom, so the frame
    // never reveals an edge. This is depth, not motion — hence linear.
    if (image)
      gsap.fromTo(
        image,
        { yPercent: -5 },
        {
          yPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
  });

  // Subtle depth between layers: the header drifts less than the cards below,
  // so the section reads as foreground (images) over background (heading).
  const header = el.querySelector<HTMLElement>(".projects__header");
  if (header)
    gsap.fromTo(
      header,
      { yPercent: -3 },
      {
        yPercent: 3,
        ease: "none",
        scrollTrigger: {
          trigger: header,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
}
</script>

<style lang="scss" scoped>
.projects {
  position: relative;
  padding-block: 5rem;

  &__header {
    margin-bottom: 5.9rem;
  }

  .t1-h3 {
    display: flex;
    flex-direction: column;
    font-weight: 100;
    grid-column-start: 2;
    grid-column-end: 5;
    line-height: 0.65;

    @include respond-to("desktop") {
      grid-column-start: 1;
      grid-column-end: 4;
      padding-left: var(--content-margin);
    }
  }

  .t1-h3-accent {
    line-height: inherit;
  }

  .description {
    grid-column-start: 4;
    grid-column-end: 10;
    grid-row: 2;
    display: flex;
    align-items: flex-end;
    margin-top: 2.4rem;

    @include respond-to("desktop") {
      grid-column-start: 8;
      grid-column-end: 11;
      grid-row: 1;
      margin-top: 0;
    }
  }

  .t1-body {
    color: rgba($color: #221e1f, $alpha: 0.3);

    span {
      color: var(--color-black);
    }
  }

  .projects__grid {
    row-gap: 3rem;
    padding-bottom: 6.1rem;
  }

  &__button {
    margin: 0 auto;
    width: 30rem;
  }

  .project {
    &:nth-child(1) {
      grid-column-start: 2;
      grid-column-end: 12;
    }
    &:nth-child(2) {
      grid-column-start: 2;
      grid-column-end: 8;
      justify-self: flex-end;
      .project-overview {
        flex-direction: column;
      }
    }
    &:nth-child(3) {
      grid-column-start: 3;
      grid-column-end: 8;
      // padding-left: var(--content-margin);
    }
    &:nth-child(4) {
      grid-column-start: 3;
      grid-column-end: 12;
    }
    &:nth-child(5) {
      grid-column-start: 2;
      grid-column-end: 12;
    }
    &:nth-child(6) {
      grid-column-start: 3;
      grid-column-end: 12;
    }
    &:nth-child(7) {
      grid-column-start: 2;
      grid-column-end: 12;
    }
    &:nth-child(8) {
      grid-column-start: 3;
      grid-column-end: 8;
    }

    @include respond-to("desktop") {
      &:nth-child(1) {
        grid-column-start: 1;
        grid-column-end: 8;
        padding-left: var(--content-margin);
      }
      &:nth-child(2) {
        grid-column-start: 10;
        grid-column-end: 12;
        padding-left: 0;
        padding-right: var(--content-margin);
        justify-self: flex-start;
        .project-overview {
          flex-direction: row;
        }
      }
      &:nth-child(3) {
        grid-column-start: 1;
        grid-column-end: 4;
        padding-left: var(--content-margin);
      }
      &:nth-child(4) {
        grid-column-start: 8;
        grid-column-end: 12;
        padding-right: var(--content-margin);
      }
      &:nth-child(5) {
        grid-column-start: 4;
        grid-column-end: 6;
      }
      &:nth-child(6) {
        grid-column-start: 6;
        grid-column-end: 12;
        grid-row: 4;
        padding-right: var(--content-margin);
      }
      &:nth-child(7) {
        grid-column-start: 1;
        grid-column-end: 6;
        padding-left: var(--content-margin);
        grid-row: 5;
      }
      &:nth-child(8) {
        grid-column-start: 10;
        grid-column-end: 12;
        padding-right: var(--content-margin);
        align-self: flex-end;
        grid-row: 5;
      }
    }
  }
}
</style>
