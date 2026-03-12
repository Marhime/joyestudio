<template>
  <section ref="sectionRef" class="contact-home">
    <div class="grid-container">
      <div class="contact-home__wrapper">
        <h3 class="contact-home__content t1-h2">
          <span class="contact-home__content-line contact-home__content-line--1"
            >R<span class="t2-h2 font-como font-italic">e</span>ady</span
          >

          <span class="contact-home__content-line--2"
            ><span class="icon"> <IconRightArrow /> </span>to conn<span
              class="t2-h2 font-como font-italic"
              >e</span
            >ct?</span
          >
        </h3>
      </div>
    </div>
    <LayoutLines color="white" />
  </section>
</template>

<script setup>
import IconRightArrow from "../icons/IconRightArrow.vue";
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
        display: none;
      }
      svg {
        width: 100%;
        height: auto;
        display: block;
        color: var(--color-white);
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

  &__content {
    font-family: var(--font-inter);
    line-height: 1;
    align-items: center;
    color: var(--color-white);
    @include grid;

    .t2-h2 {
      line-height: 0.65;
    }

    &-line {
      &--1 {
        grid-column-start: 2;
        grid-column-end: 5;
      }
      &--2 {
        grid-column-start: 2;
        grid-column-end: 5;
      }
    }

    @include respond-to("desktop") {
      &-line {
        &--1 {
          grid-column-start: 3;
          grid-column-end: 7;
          margin-left: -0.8rem;
        }
        &--2 {
          display: flex;
          align-items: flex-end;

          line-height: 0.75;
          grid-column-start: 3;
          grid-column-end: 7;

          .icon {
            margin-right: 1.5rem;
          }
        }
      }
    }
  }
}
</style>
