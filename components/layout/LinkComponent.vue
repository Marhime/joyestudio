<template>
  <div class="link" ref="linkRef">
    <NuxtLink class="link" :href="href">
      <span class="link__label t1-body" :data-text="label">
        <span class="link__label-inner" ref="innerRef">{{ label }}</span>
        <span class="link__label-outer" ref="outerRef">{{ label }}</span>
      </span>
    </NuxtLink>
  </div>
</template>

<script setup>
defineProps(["href", "label", "target"]);
</script>

<style lang="scss">
.link {
  &__label {
    position: relative;
    overflow: hidden;
    display: block;

    &-inner,
    &-outer {
      display: block;
      font-size: inherit;
      font-weight: inherit;
      transition: transform var(--ease-button);
      color: var(--theme-color);
    }

    &-outer {
      position: absolute;
      top: 0;
      left: 0;
      transform: translateY(120%);
    }
  }

  &:hover {
    .link__label-inner {
      transform: translateY(-120%);
    }

    .link__label-outer {
      transform: translateY(0);
    }
  }
}
</style>
