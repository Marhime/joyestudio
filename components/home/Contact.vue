<template>
  <section ref="sectionRef" class="contact-home">
    <div class="grid-container">
      <div class="contact-home__wrapper">
        <h3 class="contact-home__content t1-h2">
          <span
            class="contact-home__content-line contact-home__content-line--1"
          >
            R<span class="t2-h2 font-como font-italic">e</span>ady
            <span class="face-placeholder"></span>
          </span>

          <span class="contact-home__content-line--2 icon"><RightArrow /></span>
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
    background-color: var(--color-white);
    border-radius: 50%;
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
