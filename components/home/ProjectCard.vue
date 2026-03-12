<template>
  <article class="project">
    <NuxtImg
      :src="project.image"
      :alt="project.name"
      width="1200"
      height="800"
      class="project__image"
    />
    <div class="project-overview">
      <p class="project-overview__name t1-body">{{ project.name }}</p>
      <div class="project-overview__chips">
        <p
          v-for="value in project.chips"
          :key="value"
          class="project-overview__chip"
        >
          {{ value }}
        </p>
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
type Project = {
  name: string;
  image: string;
  chips: string[];
};

defineProps<{
  project: Project;
}>();
</script>

<style lang="scss" scoped>
.project {
  &__image {
    width: 100%;
    height: auto;
    object-fit: cover;
    position: relative;
    z-index: 10;
  }
  &-overview {
    padding-top: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  &-overview__chips {
    display: flex;
    gap: 1rem;
  }
  &-overview__chip {
    padding: 0 1rem;
    border: 1px solid var(--color-grey);
    color: var(--color-grey);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    line-height: 1;
    height: 4rem;
  }
}
</style>
