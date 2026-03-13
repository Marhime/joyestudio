<template>
  <section class="team">
    <div class="grid-container">
      <!-- Avatar Maxime -->
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
          <NuxtImg
            src="/images/team/maxime-joyes-peli.png"
            alt="Maxime Joyes"
            width="600"
            height="800"
            class="team__avatar team__avatar--1"
          />
          <div class="team__description t1-body">
            <p class="team__description--text">
              We craft content strategies and narratives that connect with your
              audience and drive engagement through storytelling, design, and
              data-driven insights.
            </p>
            <div class="previous__positions">
              <p class="previous__positions-title blue">Worked with</p>
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
  <section class="team">
    <div class="grid-container">
      <!-- Avatar Maxime -->
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
                K<span class="t1-h3-accent font-como font-italic">a</span>rla
                M<span class="t1-h3-accent font-como font-italic">e</span>dina
              </p>
            </div>
            <div class="team__member-location t1-body">
              <p>Based in Mexico</p>
              <p>Local time: 10:34AM</p>
            </div>
          </div>
          <NuxtImg
            src="/images/team/karla-daniela-peli.png"
            alt="Karla Daniela"
            width="600"
            height="800"
            class="team__avatar team__avatar--1"
          />
          <div class="team__description t1-body">
            <p class="team__description--text">
              We craft content strategies and narratives that connect with your
              audience and drive engagement through storytelling, design, and
              data-driven insights.
            </p>
            <div class="previous__positions">
              <p class="previous__positions-title pink">Worked with</p>
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
  padding-block: 2.5rem;

  @include respond-to("desktop") {
    min-height: 100svh;
    padding-block: 14rem;
  }

  &__header {
    display: none;
    @include respond-to("desktop") {
      display: flex;
      flex-direction: column;
      padding-left: var(--content-margin);
      grid-column-start: 1;
      grid-column-end: 2;
    }
  }

  &__member {
    grid-column-start: 2;
    grid-column-end: 12;

    @include respond-to("desktop") {
      grid-column-start: 8;
      grid-column-end: 12;
    }

    &-infos {
      display: flex;
      flex-direction: column-reverse;
      justify-content: space-between;
      gap: 2rem;

      @include respond-to("desktop") {
        flex-direction: column;
      }
    }

    .t1-h3 {
      font-size: 7rem;
      line-height: 0.55;
    }

    .t1-h3-accent {
      font-size: 9rem;
    }

    @include respond-to("desktop") {
      .t1-h3 {
        font-size: 9rem;
        line-height: 0.55;
      }

      .t1-h3-accent {
        font-size: 11.5rem;
      }
    }

    &-location {
      display: flex;
      justify-content: space-between;
      // padding-right: var(--content-margin);

      @include respond-to("desktop") {
        justify-content: flex-start;
        gap: 8.8rem;
      }
    }
  }

  &__description {
    @include respond-to("desktop") {
      margin-top: 18rem;
    }

    &--text {
      width: 40ch;
    }
  }

  .previous__positions {
    margin-top: 4.5rem;
    display: flex;
    gap: 3rem;

    &-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  .team__avatar {
    z-index: 2;

    @include respond-to("desktop") {
      position: absolute;
      bottom: 0;
      left: var(--content-margin);
    }

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
    }
  }
}
</style>
