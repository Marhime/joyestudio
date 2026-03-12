<template>
  <footer>
    <div class="grid-container">
      <div class="grid">
        <div class="second-column pixel"></div>
      </div>
      <div class="grid">
        <div class="first-column">
          <p class="title">Contact us if you’ve got any questions</p>
          <a href="mailto:contact@joyestud.io" class="link"
            >contact@joyestud.io</a
          >
        </div>
        <div class="second-column pixel"></div>
        <div class="third-column">
          <div class="links">
            <div class="title">Explore</div>
            <ul>
              <li><a class="link" href="#">Home</a></li>
              <li><a class="link" href="#">About us</a></li>
              <li><a class="link" href="#">Services</a></li>
              <li><a class="link" href="#">Projects</a></li>
              <li><a class="link" href="#">Contact us</a></li>
            </ul>
          </div>
          <div class="links">
            <div class="title">Socials</div>
            <ul>
              <li><a class="link" href="#">Instagram</a></li>
              <li><a class="link" href="#">Behance</a></li>
              <li><a class="link" href="#">Dribbble</a></li>
              <li><a class="link" href="#">LinkedIn</a></li>
              <li><a class="link" href="#">Twitter</a></li>
            </ul>
          </div>
        </div>
        <div class="fourth-column">
          <div class="links">
            <div class="title">Credits</div>
            <ul>
              <li><a class="link" href="#">Cookies</a></li>
              <li><a class="link" href="#">Policies</a></li>
            </ul>
          </div>
        </div>
      </div>
      <LogoFull />
    </div>
  </footer>
</template>

<script lang="ts" setup>
import LogoFull from "../icons/LogoFull.vue";
</script>

<style lang="scss" scoped>
footer {
  .title {
    font-size: 1.2rem;
    color: var(--color-pink);
  }
  .link {
    font-size: 1.8rem;
    font-family: var(--font-inter);
  }
  .first-column {
    grid-column-start: 1;
    grid-column-end: 2;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-block: 3rem;
  }
  .second-column {
    grid-column-start: 2;
    grid-column-end: 3;
    background-color: var(--color-pink);
    padding-bottom: 100%;
    height: 0;
    border-top: 1px solid var(--color-white);
  }
  .third-column {
    grid-column-start: 3;
    grid-column-end: 4;
    display: flex;
    gap: 10rem;
    padding: 3rem;
  }
  .fourth-column {
    padding: 3rem;
    grid-column-start: 4;
    grid-column-end: 5;
  }
  .links {
    display: flex;
    align-items: flex-start;
    gap: 9rem;

    ul {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
  }

  svg {
    width: 78%;
  }
}
</style>
