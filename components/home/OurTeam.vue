<template>
  <section class="team">
    <div class="grid-container">
      <!-- Avatar Maxime -->
      <NuxtImg
        src="/images/team/maxime-joyes.png"
        alt="Maxime Joyes"
        width="600"
        height="800"
        class="team__avatar team__avatar--1"
      />
      <div class="grid">
        <div class="team__header">
          <h2 class="t2-body-accent font-como font-italic">
            <span>( Our</span><span class="align-end">Team )</span>
          </h2>
        </div>
        <div class="team__member">
          <div class="team__member-infos">
            <div class="name-container">
              <p class="team__member-name team__member-name--1 t1-h3">
                Max<span class="t1-h3-accent font-como font-italic">i</span>me
                Jo<span class="t1-h3-accent font-como font-italic">y</span>es
              </p>
            </div>
            <div class="team__member-location t1-body">
              <p>Based in Mexico</p>
              <p>Local time: 10:34AM</p>
            </div>
          </div>
          <div class="team__description t1-body">
            <p class="team__description--text">
              We craft content strategies and narratives that connect with your
              audience and drive engagement through storytelling, design, and
              data-driven insights.
            </p>
            <div class="previous__positions">
              <p class="previous__positions-title">Worked with</p>
              <ul class="previous__positions-list">
                <li class="previous__positions-item">Chanel</li>
                <li class="previous__positions-item">LVMH</li>
                <li class="previous__positions-item">Renault</li>
                <li class="previous__positions-item">Nissan</li>
                <li class="previous__positions-item">Michelin</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    <LayoutLines color="black" />
  </section>
</template>

<script lang="ts" setup></script>

<style lang="scss" scoped>
.team {
  position: relative;
  z-index: 1;
  background-color: var(--color-white);
  padding-top: 14rem;
  min-height: 100svh;

  &__header {
    grid-column-start: 1;
    grid-column-end: 2;
  }

  &__member {
    display: grid;
    grid-column-start: 4;
    grid-column-end: 5;

    .t1-h3 {
      font-size: 9rem;
    }
    .t1-h3-accent {
      font-size: 11.5rem;
    }
    &-location {
      display: flex;
      gap: 8.8rem;
    }
  }

  &__description {
    margin-top: 18rem;

    &--text {
      width: 40ch;
    }
  }

  .previous__positions {
    margin-top: 4.5rem;
    display: flex;
    gap: 3rem;

    &-title {
      color: var(--color-blue);
    }

    &-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  .team__avatar {
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 2;

    &--1 {
      width: 40rem;
      height: 50rem;
    }
  }

  .team__member-name {
    font-weight: 400;
    position: relative;

    &--1 {
    }

    &--2 {
      margin-top: -3.5rem;
    }
  }
}
</style>
