<template>
  <div class="contact-page">
    <div class="grid">
      <div class="contact-page__heading">
        <h1 class="title">
          Let's m<span class="title-char font-como font-italic">a</span
          >ke&nbsp;it tog<span class="title-char font-como font-italic">e</span
          >ther!
        </h1>
      </div>
    </div>
    <InteractiveForm />
    <LayoutLines color="white" />
  </div>
</template>

<script setup lang="ts">
import InteractiveForm from "~/components/contact/InteractiveForm.vue";
</script>

<style lang="scss" scoped>
.contact-page {
  position: relative;
  z-index: 1;
  padding-top: 27rem;
  background-color: var(--color-blue);
  min-height: 100svh;

  &__heading {
    display: none;
  }
}

@include respond-to("desktop") {
  .contact-page {
    padding-top: 15.6rem;

    &__heading {
      display: block;
      grid-column: 1 / 6;
      margin-left: var(--content-margin);
      color: var(--color-white);

      .title {
        font-size: 9.2rem;
        line-height: 0.65;
        letter-spacing: -0.075em;
      }
      .title-char {
        font-size: 12.4rem;
        line-height: 0.65;
      }
    }
  }
}
</style>
