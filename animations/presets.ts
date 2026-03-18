import type { RevealContext } from "~/composables/useSectionReveal";

/**
 * Ready-to-use animation presets for useSectionReveal.
 *
 * Each preset receives a RevealContext and optional config.
 * Use them inside useSectionReveal callbacks:
 *
 *   import { fadeUp, splitReveal } from '~/animations/presets'
 *
 *   useSectionReveal(sectionRef, {
 *     desktop: (ctx) => fadeUp(ctx, { children: '.card', stagger: 0.08 }),
 *     mobile:  (ctx) => fadeUp(ctx, { stagger: 0.05 }),
 *   })
 *
 * Or mix presets with custom tweens:
 *
 *   useSectionReveal(sectionRef, {
 *     desktop: (ctx) => {
 *       splitReveal(ctx, { targets: '.title', type: 'chars' })
 *       fadeUp(ctx, { children: '.card', start: 'top 70%' })
 *     },
 *   })
 */

// ── fadeUp ────────────────────────────────────────────────────────────────────

interface FadeUpOptions {
  /** CSS selector for children to animate. If omitted, animates the section itself. */
  children?: string;
  duration?: number;
  stagger?: number;
  /** ScrollTrigger start position (default: 'top 80%'). */
  start?: string;
  yPercent?: number;
  ease?: string;
}

/**
 * Fade-up reveal: targets slide up and fade in on scroll.
 */
export function fadeUp(ctx: RevealContext, opts: FadeUpOptions = {}) {
  const {
    children,
    duration = 0.8,
    stagger = 0.1,
    start = "top 80%",
    yPercent = 15,
    ease = "power3.out",
  } = opts;

  const targets = children ? ctx.el.querySelectorAll(children) : [ctx.el];
  if (!targets.length) return;

  ctx.gsap.set(targets, { autoAlpha: 0, yPercent });

  ctx.gsap.to(targets, {
    autoAlpha: 1,
    yPercent: 0,
    duration,
    stagger,
    ease,
    scrollTrigger: {
      trigger: ctx.el,
      start,
      invalidateOnRefresh: true,
    },
  });
}

// ── splitReveal ──────────────────────────────────────────────────────────────

interface SplitRevealOptions {
  /** CSS selector for text elements. If omitted, splits the section element itself. */
  targets?: string;
  type?: "words" | "chars" | "lines";
  duration?: number;
  stagger?: number;
  start?: string;
  yPercent?: number;
  ease?: string;
}

/**
 * SplitText reveal: words, chars, or lines animate in with masking.
 */
export function splitReveal(ctx: RevealContext, opts: SplitRevealOptions = {}) {
  const {
    targets,
    type = "words",
    duration = 0.6,
    stagger = 0.03,
    start = "top 80%",
    yPercent = 100,
    ease = "power3.out",
  } = opts;

  const elements = targets ? ctx.el.querySelectorAll(targets) : [ctx.el];
  if (!elements.length) return;

  elements.forEach((element: Element) => {
    const split = new ctx.SplitText(element, { type, mask: type });

    const items =
      type === "chars"
        ? split.chars
        : type === "lines"
          ? split.lines
          : split.words;

    ctx.gsap.set(items, { autoAlpha: 0, yPercent });

    ctx.gsap.to(items, {
      autoAlpha: 1,
      yPercent: 0,
      duration,
      stagger,
      ease,
      scrollTrigger: {
        trigger: element,
        start,
        invalidateOnRefresh: true,
      },
    });
  });
}

// ── parallax ─────────────────────────────────────────────────────────────────

interface ParallaxOptions {
  /** CSS selector for the element to parallax. If omitted, parallaxes the section. */
  target?: string;
  /** How far the element moves (default: -20 = moves up 20% relative to scroll). */
  yPercent?: number;
  start?: string;
  end?: string;
}

/**
 * Simple scroll parallax: target scrolls at a different speed.
 */
export function parallax(ctx: RevealContext, opts: ParallaxOptions = {}) {
  const {
    target,
    yPercent = -20,
    start = "top bottom",
    end = "bottom top",
  } = opts;

  const el = target ? ctx.el.querySelector(target) : ctx.el;
  if (!el) return;

  ctx.gsap.to(el, {
    yPercent,
    ease: "none",
    scrollTrigger: {
      trigger: ctx.el,
      start,
      end,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}

// ── scrubTimeline ────────────────────────────────────────────────────────────

interface ScrubTimelineOptions {
  start?: string;
  end?: string;
  pin?: boolean;
  scrub?: number | boolean;
}

/**
 * Returns a scroll-scrubbed GSAP timeline.
 * Add your own tweens to the returned timeline.
 *
 *   desktop: (ctx) => {
 *     const tl = scrubTimeline(ctx, { pin: true, end: '+=200%' })
 *     tl.to('.title', { y: -100, opacity: 0 })
 *     tl.to('.image', { scale: 1.2 })
 *   }
 */
export function scrubTimeline(
  ctx: RevealContext,
  opts: ScrubTimelineOptions = {},
) {
  const { start = "top top", end = "+=100%", pin = false, scrub = 1 } = opts;

  return ctx.gsap.timeline({
    scrollTrigger: {
      trigger: ctx.el,
      start,
      end,
      scrub,
      pin,
      invalidateOnRefresh: true,
    },
  });
}
