<template>
  <div class="button__wrapper">
    <NuxtLink class="button js-line" :class="`button--${color}`" :to="href">
      <span class="button__text" :data-text="label">
        <span class="button__text-inner">{{ label }}</span>
      </span>
      <svg
        width="27"
        height="27"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="button__circle"
      >
        <g>
          <path
            d="M20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20C15.5228 20 20 15.5228 20 10Z"
            class="button__circle-bg"
          />
          <path
            d="M7 13L13 7M13 7H8.108M13 7V11.892"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="button__arrow button__arrow--visible"
          />
          <path
            d="M7 13L13 7M13 7H8.108M13 7V11.892"
            stroke="white"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="button__arrow button__arrow--hidden"
          />
        </g>
      </svg>
    </NuxtLink>
  </div>
</template>

<script setup>
defineProps({
  href: String,
  label: String,
  color: String,
});
</script>

<style lang="scss" scoped>
.button__wrapper {
  overflow: hidden;
}
.button {
  font-size: 1.75rem;
  display: inline-flex;
  align-items: center;
  gap: 1em;
  border-radius: 9999px;
  padding: 0.5em 0.7em 0.5em 1.2em; // Padding original
  text-decoration: none;
  font-weight: 600;
  overflow: hidden;
  position: relative;
  pointer-events: all;

  .button__arrow {
    stroke: white;
  }

  &--light {
    background-color: white;
    color: var(--color-blue);
    .button__circle-bg {
      fill: var(--color-blue);
    }
  }

  &--dark {
    background-color: var(--color-light);
    color: var(--color-dark);
    .button__circle-bg {
      fill: var(--color-dark);
    }
  }

  &--purple {
    background-color: var(--color-light);
    color: var(--color-dark);
    .button__circle-bg {
      fill: var(--color-purple);
    }
  }

  &--green {
    background-color: var(--color-light);
    color: var(--color-dark);
    .button__circle-bg {
      fill: var(--color-green);
    }
  }

  &--yellow {
    background-color: var(--color-light);
    color: var(--color-dark);
    .button__circle-bg {
      fill: var(--color-yellow);
    }
  }

  &--red {
    background-color: var(--color-light);
    color: var(--color-dark);
    .button__circle-bg {
      fill: var(--color-red);
    }
  }

  .button__text {
    position: relative;
    overflow: hidden;
    font-size: 1em;

    &-inner {
      display: block;
      will-change: transform;
      transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
    }

    &::after {
      will-change: transform;
      content: attr(data-text);
      position: absolute;
      top: 0;
      left: 0;
      transform: translateY(120%);
      transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
    }
  }

  .button__circle {
    border-radius: 50%;
    overflow: hidden;
    position: relative;
    transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
    will-change: transform;
    width: 1.75em;
    height: 1.75em;
  }

  .button__arrow {
    will-change: transform;
    transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1),
      opacity 0.3s cubic-bezier(0.19, 1, 0.22, 1);

    &--hidden {
      transform: translate(-55%, 55%);
      opacity: 0;
    }
  }

  &:hover {
    .button__text-inner {
      transform: translateY(-120%);
    }

    .button__text::after {
      transform: translateY(0);
    }

    .button__circle {
      transform: scale(1.25);
    }

    .button__arrow--visible {
      transform: translate(55%, -55%);
      opacity: 0;
    }

    .button__arrow--hidden {
      transform: translate(0, 0);
      opacity: 1;
    }
  }
}
</style>
