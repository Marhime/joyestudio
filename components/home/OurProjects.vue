<template>
  <section class="projects">
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
