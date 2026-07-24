<template>
  <footer ref="footerRef">
    <div class="grid-container">
      <div class="grid">
        <div class="first-column">
          <p class="title">Contact us if you've got any questions</p>
          <a href="mailto:contact@joyestud.io" class="link"
            >contact@joyestud.io</a
          >
        </div>
        <div class="second-column links">
          <div class="title">Explore</div>
          <ul>
            <li><a class="link" href="#">Home</a></li>
            <li><a class="link" href="#">About us</a></li>
            <li><a class="link" href="#">Services</a></li>
            <li><a class="link" href="#">Projects</a></li>
            <li><a class="link" href="#">Contact us</a></li>
          </ul>
        </div>

        <div class="third-column links">
          <div class="title">Socials</div>
          <ul>
            <li><a class="link" href="#">Instagram</a></li>
            <li><a class="link" href="#">Behance</a></li>
            <li><a class="link" href="#">Dribbble</a></li>
            <li><a class="link" href="#">LinkedIn</a></li>
            <li><a class="link" href="#">Twitter</a></li>
          </ul>
        </div>

        <div class="fourth-column links">
          <div class="title">Credits</div>
          <ul>
            <li><a class="link" href="#">Cookies</a></li>
            <li><a class="link" href="#">Policies</a></li>
          </ul>
        </div>
        <div class="logo-mobile">
          <Joye />
          <Studio />
        </div>
      </div>
    </div>
    <div class="logo-desktop grid">
      <LogoFull />
    </div>
    <LayoutLines color="black" />
  </footer>
</template>

<script lang="ts" setup>
import Io from "../icons/Io.vue";
import Joye from "../icons/Joye.vue";
import JoyeStud from "../icons/JoyeStud.vue";
import LogoFull from "../icons/LogoFull.vue";
import Studio from "../icons/Studio.vue";
import { useGSAP } from "~/composables/useGSAP";
import { useAnimationBus } from "~/composables/useAnimationBus";

const footerRef = useTemplateRef<HTMLElement>("footerRef");
const { gsap, mm, BP, scheduleRefresh } = useGSAP();
const { on } = useAnimationBus();

// Footer reveal — the site's signature masked-rise grammar: link columns
// stagger up, then the giant wordmark rises as it enters. Reversible on
// scroll-back like every reveal on the site.
const setupReveals = () => {
  if (!footerRef.value) return;
  mm.revert();

  const revealIn = (logoSelector: string) => {
    const el = footerRef.value!;
    const cols = el.querySelectorAll(
      ".first-column, .second-column, .third-column, .fourth-column",
    );
    const logo = el.querySelector(logoSelector);

    if (cols.length) {
      gsap.set(cols, { autoAlpha: 0, yPercent: 18 });
      gsap.to(cols, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.8,
        stagger: 0.07,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 82%",
          toggleActions: "play none none reverse",
          invalidateOnRefresh: true,
        },
      });
    }
    if (logo) {
      gsap.set(logo, { autoAlpha: 0, yPercent: 14 });
      gsap.to(logo, {
        autoAlpha: 1,
        yPercent: 0,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: logo,
          start: "top 92%",
          toggleActions: "play none none reverse",
          invalidateOnRefresh: true,
        },
      });
    }
    return () => {};
  };

  mm.add(BP.desktop, () => revealIn(".logo-desktop"));
  mm.add(BP.mobile, () => revealIn(".logo-mobile"));
  mm.add(BP.reducedMotion, () => {
    const el = footerRef.value!;
    gsap.set(
      el.querySelectorAll(
        ".first-column, .second-column, .third-column, .fourth-column, .logo-desktop, .logo-mobile",
      ),
      { clearProps: "all" },
    );
    return () => {};
  });

  scheduleRefresh();
};

onMounted(() => {
  nextTick(setupReveals);
});

// The footer lives in the persistent layout, but page transitions kill ALL
// ScrollTriggers on leave — rebuild ours once the new page has entered.
on("page:afterEnter", () => {
  nextTick(setupReveals);
});
</script>

<style lang="scss" scoped>
footer {
  .title {
    font-size: 1.2rem;
    color: var(--color-pink);
  }
  .link {
    font-size: 1.5rem;
  }
  .first-column {
    grid-column-start: 2;
    grid-column-end: 12;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-block: 3rem;
  }
  .second-column {
    grid-column-start: 2;
    grid-column-end: 7;
  }
  .third-column {
    grid-column-start: 8;
    grid-column-end: 11;
  }
  .fourth-column {
    grid-column-start: 2;
    grid-column-end: 6;
    padding-block: 3rem;
  }
  .fifth-column {
    padding-block: 3rem;
  }
  .links {
    display: flex;
    align-items: flex-start;
    gap: 4rem;

    ul {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
  }

  .logo-desktop {
    display: none;
    svg {
      display: block;
    }

    @include respond-to("desktop") {
      display: grid;
      padding-left: var(--content-margin);

      svg:nth-child(1) {
        grid-column-start: 1;
        grid-column-end: 12;
        width: 75.25%;
      }
      svg:nth-child(2) {
        grid-column-start: 8;
        grid-column-end: 9;
        height: 10rem;
        align-self: flex-start;
      }
    }
  }

  .logo-mobile {
    grid-column-start: 2;
    grid-column-end: 12;
    svg {
      width: 100%;
      display: block;

      &:nth-child(1) {
        width: 75%;
      }
    }

    @include respond-to("desktop") {
      display: none;
    }
  }

  @include respond-to("desktop") {
    .title {
      font-size: 1.2rem;
      color: var(--color-pink);
    }
    .link {
      font-size: 1.5rem;
    }
    .first-column {
      grid-column-start: 1;
      grid-column-end: 3;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-block: 3rem;
      padding-left: var(--content-margin);
    }
    .second-column {
      grid-column-start: 4;
      grid-column-end: 6;
      padding-top: 3rem;
    }
    .third-column {
      grid-column-start: 6;
      grid-column-end: 8;
      padding-block: 3rem;
    }
    .fourth-column {
      grid-column-start: 8;
      grid-column-end: 10;
      padding-block: 3rem;
    }
    .fifth-column {
      padding-block: 3rem;
    }
    .links {
      display: flex;
      align-items: flex-start;
      gap: 4rem;

      ul {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
    }
  }
}
</style>
