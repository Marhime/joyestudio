<template>
  <div class="button__wrapper">
    <NuxtLink :href="href" :target="target" class="button">
      <span class="button__bg"></span>
      <svg
        width="21"
        height="21"
        viewBox="0 0 21 21"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="button__icon"
      >
        <path d="M7 11.6667H9.33333V14H7V11.6667Z" fill="currentColor" />
        <path d="M4.66667 14H7V16.3333H4.66667V14Z" fill="currentColor" />
        <path
          d="M2.33333 16.3333H4.66667V18.6667H2.33333V16.3333Z"
          fill="currentColor"
        />
        <path
          d="M0 18.6667L2.33333 18.6667V21H0V18.6667Z"
          fill="currentColor"
        />
        <path
          d="M9.33333 9.33333H11.6667V11.6667L9.33333 11.6667V9.33333Z"
          fill="currentColor"
        />
        <path
          d="M11.6667 7H14V9.33333H11.6667L11.6667 7Z"
          fill="currentColor"
        />
        <path d="M14 4.66667H16.3333V7H14V4.66667Z" fill="currentColor" />
        <path
          d="M16.3333 2.33333H18.6667V4.66667H16.3333V2.33333Z"
          fill="currentColor"
        />
        <path
          d="M18.6667 1.01993e-07H21V2.33333H18.6667L18.6667 1.01993e-07Z"
          fill="currentColor"
        />
        <path
          d="M18.6667 2.33333H21V4.66667H18.6667V2.33333Z"
          fill="currentColor"
        />
        <path
          d="M18.6667 4.66667H21V7H18.6667L18.6667 4.66667Z"
          fill="currentColor"
        />
        <path d="M18.6667 7H21V9.33333H18.6667V7Z" fill="currentColor" />
        <path
          d="M18.6667 9.33333H21V11.6667H18.6667V9.33333Z"
          fill="currentColor"
        />
        <path d="M18.6667 11.6667H21V14H18.6667V11.6667Z" fill="currentColor" />
        <path d="M18.6667 14H21V16.3333H18.6667V14Z" fill="currentColor" />
        <path
          d="M18.6667 16.3333H21V18.6667H18.6667V16.3333Z"
          fill="currentColor"
        />
        <path
          d="M18.6667 1.01993e-07L18.6667 2.33333H16.3333L16.3333 0L18.6667 1.01993e-07Z"
          fill="currentColor"
        />
        <path
          d="M16.3333 0L16.3333 2.33333H14V0H16.3333Z"
          fill="currentColor"
        />
        <path d="M14 0V2.33333H11.6667V0H14Z" fill="currentColor" />
        <path d="M11.6667 0V2.33333H9.33333V0H11.6667Z" fill="currentColor" />
        <path d="M9.33333 0V2.33333H7L7 0H9.33333Z" fill="currentColor" />
        <path d="M7 0L7 2.33333H4.66667L4.66667 0H7Z" fill="currentColor" />
        <path
          d="M4.66667 0L4.66667 2.33333H2.33333V0H4.66667Z"
          fill="currentColor"
        />
      </svg>

      <span class="button__label" :data-label="labelSecondary">
        <span class="button__label-inner">{{ label }}</span>
      </span>
    </NuxtLink>
  </div>
</template>

<script setup>
defineProps(["href", "label", "labelSecondary", "target"]);

// const { $gsap } = useNuxtApp();
// const themeStore = useThemeStore();
// const { currentTheme } = storeToRefs(themeStore);

// const linkRef = ref(null);
// const innerRef = ref(null);
// const outerRef = ref(null);

// const changeTheme = () => {
//   if (!innerRef.value || !outerRef.value) return;

//   console.log("animate");

//   // Annuler l'animation précédente si elle existe
//   changeColorCtx?.revert();

//   changeColorCtx = $gsap.context(() => {
//     const tl = $gsap.timeline({ defaults: { duration: 0.5 } });
//     tl.to(innerRef.value, {
//       yPercent: -120,
//       ease: "power3.inOut",
//     }).to(
//       outerRef.value,
//       {
//         yPercent: 0,
//         ease: "power3.inOut",
//       },
//       "<"
//     );
//   }, linkRef.value); // Scope GSAP à ce composant uniquement
// };

// watch(currentTheme, () => {
//   changeTheme();
// });

// onBeforeUnmount(() => {
//   changeColorCtx?.revert();
// });
</script>

<style lang="scss">
.button-wrapper {
}

.button {
  display: flex;
  position: relative;
  justify-content: space-between;
  align-items: center;
  padding: 24.5px;
  gap: 50.5px;
  text-decoration: none;
  font-family: var(--font-inter);

  @include respond-to("desktop") {
    padding: 24.5px 0 24.5px 24.5px;
    gap: 67.5px;
  }
}

.button__icon {
  width: 1.09375vw;
  height: 1.09375vw;
  position: relative;
  transition: transform var(--ease-button);
  color: var(--button-icon);
}

.button__label {
  position: relative;
  font-size: 26px;
  color: var(--button-text);
  overflow: hidden;
  padding-right: 81px;

  &-inner {
    display: block;
    will-change: transform;
    transition: transform var(--ease-button);
  }

  &::after {
    will-change: transform;
    content: attr(data-label);
    position: absolute;
    top: 0;
    left: 0;
    transform: translateY(120%);
    transition: transform var(--ease-button);
    color: var(--button-icon);
    word-break: keep-all;
  }
}

.button__bg {
  background-color: var(--button-bg);
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 70px;
  height: 70px;
  border-radius: 9999px;
  z-index: 0;
  transition: width var(--ease-button);
}

.button:hover {
  .button__bg {
    width: 100%;
  }
  .button__icon {
    transform: rotate(45deg);
  }
  .button__label-inner {
    color: var(--button-text);
    transform: translateY(-120%);
  }

  .button__label::after {
    transform: translateY(0);
  }
}
</style>
