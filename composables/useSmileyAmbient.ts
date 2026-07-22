import { onMounted, onBeforeUnmount } from "vue";
import { useNuxtApp } from "nuxt/app";
import { useSmiley } from "./useSmiley";
import {
  trySmileyAction,
  canTriggerSmileyAction,
  markSmileyAction,
  beginSmileyGesture,
  endSmileyGesture,
} from "./useSmileyCooldown";
import type { SmileyGlanceAccent } from "~/types/smiley";

/**
 * Ambient idle behavior — gives the smiley life when no scripted moment
 * (scroll trigger, UI hover, etc.) is driving it.
 *
 * Behavior:
 *   - Random blink (wink) every 6-10s at idle (no mouse/scroll activity >2s)
 *   - Head life every 7-13s at idle: Pixar head-cock or side glance, with a
 *     single-die facial accent (cock-and-wink / warm hold / shocked-notice)
 *   - Occasional soft Happy (0.25) every 20-40s of pure idle
 *   - Shocked face on violent scroll (Lenis velocity spike), relaxes on calm
 *
 * Runs in ALL smiley modes — ambient gestures are rotation/morph only, they
 * never touch position, so they compose safely with tracking and scrub.
 * The activity guard (mouse move / scroll marks the user active) keeps them
 * out of the way during scripted scroll choreographies.
 *
 * Skips when:
 *   - prefers-reduced-motion is set
 *   - tab is hidden (document.hidden)
 *   - the user is moving the mouse or scrolling
 *
 * Call once from app.vue. Cleans up its own listeners + timers on unmount.
 */

const BLINK_MIN_MS = 6000;
const BLINK_MAX_MS = 10000;
// Gesture is ~2.7-3.5s — sparse cadence is what makes each one land.
const GLANCE_MIN_MS = 7000;
const GLANCE_MAX_MS = 13000;
const GLANCE_YAW_MIN_DEG = 15;
const GLANCE_YAW_MAX_DEG = 26;
const HEAD_TILT_CHANCE = 0.45; // the cock is the signature gesture
const OPPOSITE_SIDE_CHANCE = 0.7; // 50/50 = same-side triples; 1.0 = metronome
// Single-die facial accent bands — at most ONE accent per gesture,
// ~half of gestures stay pure posture (the rare accent is what lands).
const WINK_BAND = 0.3; // head-cock: die < 0.30 → wink as the tilt lands
const HAPPY_BAND = 0.55; // head-cock: 0.30-0.55 → warm hold
const SHOCK_NOTICE_BAND = 0.2; // wide side glance: die < 0.20 → eyes widen
const MICRO_EXPR_MIN_MS = 20000;
const MICRO_EXPR_MAX_MS = 40000;
const IDLE_THRESHOLD_MS = 2000;
const MOUSE_MOVE_EPSILON = 20; // pixels — ignore micro-jitter
const SCROLL_SHOCK_VELOCITY = 30; // Lenis velocity spike → shocked face
const SCROLL_CALM_VELOCITY = 3; // below this → relax back to Basis
const SCROLL_ACTIVE_VELOCITY = 5; // any real scroll counts as user activity

const random = (min: number, max: number) =>
  Math.random() * (max - min) + min;

export function useSmileyAmbient(): void {
  const smiley = useSmiley();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lenis = useNuxtApp().$lenis as any;

  let blinkTimer: ReturnType<typeof setTimeout> | null = null;
  let microTimer: ReturnType<typeof setTimeout> | null = null;
  let glanceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastMoveAt = 0;
  let lastPos = { x: 0, y: 0 };
  let reducedMotion = false;
  let scrollShocked = false;
  let shockRelaxTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSide = Math.random() < 0.5 ? -1 : 1;
  // Set false on unmount: a scheduler awaiting a gesture when teardown runs
  // would otherwise re-arm its timer afterward and loop as an orphan forever.
  let active = true;

  const isIdle = () => performance.now() - lastMoveAt > IDLE_THRESHOLD_MS;

  // scrollShocked gates gestures too: nothing starts under a shocked face.
  const canAct = () =>
    !document.hidden && !reducedMotion && !scrollShocked && isIdle();

  const scheduleBlink = () => {
    blinkTimer = setTimeout(async () => {
      if (canAct()) {
        await trySmileyAction(() => smiley.wink());
      }
      if (active) scheduleBlink();
    }, random(BLINK_MIN_MS, BLINK_MAX_MS));
  };

  // Head life: either a pure Pixar head-cock (tilt with barely any turn —
  // "curious puppy") or a side glance (turn + derived tilt). One die per
  // gesture decides the single facial accent (or none). Accents are passed
  // INTO the glance as timeline-anchored calls so they pause and die with
  // the gesture; the whole gesture holds the cooldown lock for its duration.
  const scheduleGlance = () => {
    glanceTimer = setTimeout(async () => {
      if (canAct()) {
        const side =
          Math.random() < OPPOSITE_SIDE_CHANCE ? -lastSide : lastSide;
        lastSide = side;
        const die = Math.random();

        if (Math.random() < HEAD_TILT_CHANCE) {
          const accents: SmileyGlanceAccent[] = [];
          if (die < WINK_BAND) {
            // Cock-and-wink: the eye closes the frame the tilt lands —
            // tilt → beat → wink is the Pixar-lamp acknowledgment. Then
            // re-roll the standalone blink so winks never cluster.
            accents.push({
              at: "pose",
              fn: () => {
                smiley.wink();
                if (blinkTimer) clearTimeout(blinkTimer);
                scheduleBlink();
              },
            });
          } else if (die < HAPPY_BAND) {
            // Warm hold: the smile blooms DURING the hold and fades WITH
            // the return — curiosity visibly resolves, the expression
            // never outlives the posture.
            accents.push({
              at: "hold",
              fn: () =>
                smiley.setExpression("happy", 0.16, {
                  duration: 0.4,
                  ease: "sine.out",
                  exclusive: false,
                }),
            });
            accents.push({
              at: "return",
              fn: () =>
                smiley.setExpression("happy", 0, {
                  duration: 0.6,
                  ease: "sine.inOut",
                  exclusive: false,
                }),
            });
          }
          await trySmileyAction(async () => {
            beginSmileyGesture();
            try {
              await smiley.glance(side * random(3, 7), {
                rollDeg: -side * random(11, 16),
                pitchDeg: random(-3, 2),
                holdDuration: random(0.9, 1.6),
                accents,
              });
            } finally {
              endSmileyGesture();
            }
          });
        } else {
          // On a designed pose (tracking anchors may pin yaw/pitch), wide
          // side glances fight the art direction and can push the face to
          // the sphere's silhouette — keep the look small and local there.
          // (The shocked-notice band needs |yaw| ≥ 20 → auto-skipped.)
          const yaw =
            smiley.mode.value === "tracking"
              ? side * random(8, 14)
              : side * random(GLANCE_YAW_MIN_DEG, GLANCE_YAW_MAX_DEG);
          const accents: SmileyGlanceAccent[] = [];
          const withShockNotice =
            Math.abs(yaw) >= 20 && die < SHOCK_NOTICE_BAND;
          if (withShockNotice) {
            // Shocked-notice: eyes widen WITH the anticipation gather —
            // something caught its attention — and relax once the look lands.
            accents.push({
              at: "pose",
              fn: () =>
                smiley.setExpression("shocked", 0, {
                  duration: 0.5,
                  ease: "sine.inOut",
                  exclusive: false,
                }),
            });
          }
          await trySmileyAction(async () => {
            beginSmileyGesture();
            try {
              if (withShockNotice) {
                smiley.setExpression("shocked", 0.12, {
                  duration: 0.15,
                  ease: "power2.out",
                  exclusive: false,
                });
              }
              await smiley.glance(yaw, {
                pitchDeg: random(-6, 4),
                holdDuration: random(0.6, 1.2),
                accents,
              });
            } finally {
              endSmileyGesture();
            }
          });
        }
      }
      if (active) scheduleGlance();
    }, random(GLANCE_MIN_MS, GLANCE_MAX_MS));
  };

  const scheduleMicroExpression = () => {
    microTimer = setTimeout(async () => {
      if (canAct()) {
        await trySmileyAction(async () => {
          // Happy-only: one meaning per expression — shocked belongs to the
          // violent-scroll reaction exclusively. Additive (exclusive: false)
          // so ambient never disturbs other smiley state.
          beginSmileyGesture();
          try {
            await smiley.setExpression("happy", 0.25, {
              duration: 0.6,
              exclusive: false,
            });
            await new Promise((r) => setTimeout(r, 800));
            await smiley.setExpression("happy", 0, {
              duration: 0.5,
              exclusive: false,
            });
          } finally {
            endSmileyGesture();
          }
        });
      }
      if (active) scheduleMicroExpression();
    }, random(MICRO_EXPR_MIN_MS, MICRO_EXPR_MAX_MS));
  };

  // Violent scroll → brief shocked face; relaxes once the scroll calms down.
  // Additive (exclusive: false) so it never fights other expression sources.
  const onLenisScroll = ({ velocity }: { velocity: number }) => {
    const speed = Math.abs(velocity);
    if (speed > SCROLL_ACTIVE_VELOCITY) lastMoveAt = performance.now();

    if (
      !scrollShocked &&
      speed > SCROLL_SHOCK_VELOCITY &&
      !reducedMotion &&
      !document.hidden &&
      canTriggerSmileyAction()
    ) {
      scrollShocked = true;
      markSmileyAction();
      smiley.setExpression("shocked", 0.55, {
        duration: 0.18,
        exclusive: false,
      });
      // The calm branch below needs a FUTURE scroll event to fire — if the
      // scroll stops dead (momentum ends off-frame), no event ever arrives
      // and the face would stay shocked. Time-based fallback relaxes it.
      shockRelaxTimer = setTimeout(() => relaxShock(), 2000);
    } else if (scrollShocked && speed < SCROLL_CALM_VELOCITY) {
      relaxShock();
    }
  };

  const relaxShock = () => {
    if (!scrollShocked) return;
    scrollShocked = false;
    if (shockRelaxTimer) {
      clearTimeout(shockRelaxTimer);
      shockRelaxTimer = null;
    }
    smiley.setExpression("shocked", 0, { duration: 0.5, exclusive: false });
  };

  const onPointerMove = (e: PointerEvent) => {
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    if (
      Math.abs(dx) > MOUSE_MOVE_EPSILON ||
      Math.abs(dy) > MOUSE_MOVE_EPSILON
    ) {
      lastMoveAt = performance.now();
      lastPos = { x: e.clientX, y: e.clientY };
    }
  };

  // Typing is user activity too — without this, gestures fire mid-keystroke
  // in the contact form while the per-key reactions run.
  const onKeyDown = () => {
    lastMoveAt = performance.now();
  };

  // Live OS-setting change: canAct() reads the flag per fire, so flipping
  // reduced-motion mid-session stops gestures on the next tick.
  const reducedMotionMq = import.meta.client
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const onReducedMotionChange = (e: MediaQueryListEvent) => {
    reducedMotion = e.matches;
  };

  onMounted(() => {
    if (!import.meta.client) return;
    reducedMotion = reducedMotionMq?.matches ?? false;
    reducedMotionMq?.addEventListener("change", onReducedMotionChange);
    lastMoveAt = performance.now();
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("keydown", onKeyDown, { passive: true });
    lenis?.on("scroll", onLenisScroll);
    scheduleBlink();
    scheduleGlance();
    scheduleMicroExpression();
  });

  onBeforeUnmount(() => {
    active = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("keydown", onKeyDown);
    reducedMotionMq?.removeEventListener("change", onReducedMotionChange);
    lenis?.off("scroll", onLenisScroll);
    if (blinkTimer) clearTimeout(blinkTimer);
    if (microTimer) clearTimeout(microTimer);
    if (glanceTimer) clearTimeout(glanceTimer);
    if (shockRelaxTimer) clearTimeout(shockRelaxTimer);
  });
}
