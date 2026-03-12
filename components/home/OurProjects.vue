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
    grid-column-start: 1;
    grid-column-end: 3;
    line-height: 0.65;
  }

  .t1-h3-accent {
    line-height: inherit;
  }

  .description {
    grid-column-start: 4;
    grid-column-end: 5;
    display: flex;
    align-items: flex-end;
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
      grid-column-start: 1;
      grid-column-end: 4;
    }
    &:nth-child(2) {
      grid-column-start: 4;
      grid-column-end: 5;
      width: 66.66667%;
      justify-self: flex-end;
      .project-overview {
        flex-direction: column;
      }
    }
    &:nth-child(3) {
      grid-column-start: 1;
      grid-column-end: 3;
    }
    &:nth-child(4) {
      grid-column-start: 4;
      grid-column-end: 5;
    }
    &:nth-child(5) {
      grid-column-start: 3;
      grid-column-end: 4;
      width: 50%;
    }
    &:nth-child(6) {
      grid-column-start: 3;
      grid-column-end: 5;
      width: 75%;
      justify-self: flex-end;
    }
    &:nth-child(7) {
      grid-column-start: 1;
      grid-column-end: 4;
      width: 68%;
    }
    &:nth-child(8) {
      grid-column-start: 4;
      grid-column-end: 5;
      width: 66.66667%;
      justify-self: flex-end;
      align-self: flex-end;
    }
  }
}
</style>
