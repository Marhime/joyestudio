import type { Ref } from "vue";
import type { SmileyAPI, SmileyMorphAnchor } from "~/types/smiley";
import { useAnimationBus } from "~/composables/useAnimationBus";

/**
 * The smiley as the LEAD ACTOR of every page transition — ONE fused motion
 * scene, never buried (his canvas out-z-indexes the grid wall).
 *
 * The scene: he ERODES where he stands while the wall crystallizes from
 * under him (fillRadial seeded on his position) → his pixel swarm arcs
 * OVER the covered swap → the wall blows open from the destination anchor
 * (dissolveRadial) as he reforms inside it → live tracking takes over.
 *
 * The destination doesn't exist in the DOM during the fill, so the actor
 * keeps a per-route SNAPSHOT of each visited page's [data-smiley-entry]
 * rect (pages land at scroll 0 → deterministic). Known route → the flight
 * launches AT page:leave, simultaneous with the wall, toward the snapshot;
 * the real element is swapped in mid-flight at page:enter (morphScrub
 * reads its target live — the hand-off is invisible). First visit of a
 * route → two-beat fallback: hold above the wall, fly on page:enter.
 *
 * Driven by the animation-bus beats usePageTransition already emits —
 * called once from app.vue with the blob ref (the blob lives there too).
 *
 * Singleton exception (see CLAUDE.md): app-lifetime scope, one-shot tweens
 * only, no MatchMedia/ScrollTrigger to clean up → direct $gsap is correct.
 */

interface EntrySnapshot {
  left: number;
  top: number;
  width: number;
  height: number;
  smileyScale?: string;
}

export function useSmileyTransitionActor(blob: Ref<SmileyAPI | null>) {
  if (!import.meta.client) return;

  const gsap = useNuxtApp().$gsap as typeof import("gsap").gsap;
  const { on } = useAnimationBus();
  const route = useRoute();

  const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Entry-anchor registry (per route path, at scroll 0) ──────────────
  const entrySnapshots = new Map<string, EntrySnapshot>();
  let currentPath = route.path;

  const queryEntry = () =>
    document.querySelector<HTMLElement>("[data-smiley-entry]");
  const isUsable = (r: { width: number; height: number }) =>
    r.width > 4 && r.height > 4;

  const snapshotCurrent = (path: string) => {
    const el = queryEntry();
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!isUsable(r)) return;
    entrySnapshots.set(path, {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      smileyScale: el.dataset.smileyScale,
    });
  };

  // Seed with the landing page once its layout settled (double rAF);
  // re-recorded on every page:enter anyway.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => snapshotCurrent(currentPath)),
  );

  const anchorFrom = (s: EntrySnapshot): SmileyMorphAnchor => ({
    getBoundingClientRect: () => ({
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
    }),
    dataset:
      s.smileyScale !== undefined ? { smileyScale: s.smileyScale } : {},
  });

  // ── Single owner of the actor's motion ───────────────────────────────
  let actTween: gsap.core.Tween | null = null;
  // Mutable flight target: starts as the snapshot anchor, swapped for the
  // REAL element the moment the new page exists.
  let flightTarget: { el: HTMLElement | SmileyMorphAnchor } | null = null;
  const killAct = () => {
    actTween?.kill();
    actTween = null;
    flightTarget = null;
  };

  const launchFlight = (
    api: SmileyAPI,
    from: SmileyMorphAnchor,
    target: HTMLElement | SmileyMorphAnchor,
    duration: number,
  ) => {
    const holder = { el: target };
    flightTarget = holder;
    api.morphScrub(0, from, holder.el, { gated: false });
    const flight = { t: 0 };
    actTween = gsap.to(flight, {
      t: 1,
      duration,
      // Near-constant pace — the same feel as a steady scroll driving the
      // hero→about morph. A strong ease bunches the ribbon into a clump
      // that reads as "the ball leaps"; sine keeps the current flowing.
      ease: "sine.inOut",
      onUpdate: () => {
        api.morphScrub(flight.t, from, holder.el, { gated: false });
      },
      onComplete: () => {
        const landedOn = holder.el;
        actTween = null;
        flightTarget = null;
        api.setDissolve(0);
        // Landed on the real element → hand off to live tracking. On a
        // virtual snapshot (enter never fired — should not happen), stay
        // parked; page:enter's proximity guard will take over.
        if (landedOn instanceof HTMLElement) api.startTracking(landedOn);
      },
    });
  };

  // ── Leave: take off WITH the wall (known route) or hold (first visit) ─
  on("page:leave", () => {
    const api = blob.value;
    if (!api) return;
    // The OLD page is still in the DOM — refresh its snapshot before it goes.
    snapshotCurrent(currentPath);
    killAct();
    // A scroll-parked morph (hero→about) holds element refs the page swap
    // is about to detach — reset it before its anchors go stale.
    api.morphScrub(0, null, null);
    if (reducedMotion()) return; // blob never initialized — nothing to act
    api.hold();
    // ONE SCENE: the router already points to the destination — if its
    // anchor is known, take off NOW, simultaneous with the wall fill.
    const dest = entrySnapshots.get(route.path);
    const from = api.getSelfAnchor();
    if (dest && from) launchFlight(api, from, anchorFrom(dest), 2.6);
  });

  // ── Enter: swap in the real element (airborne) or fly now (fallback) ──
  on("page:enter", () => {
    const api = blob.value;
    if (!api) return;
    currentPath = route.path;

    const entry = queryEntry();
    if (!entry) {
      // Page without a smiley moment: quietly return to free mode.
      killAct();
      api.setDissolve(0);
      api.release();
      return;
    }

    const rect = entry.getBoundingClientRect();
    snapshotCurrent(currentPath);
    if (reducedMotion() || !isUsable(rect)) {
      // Hidden anchor (e.g. contact on mobile) or no-motion: no flight,
      // restore the exact pre-transition behavior.
      killAct();
      api.setDissolve(0);
      api.startTracking(entry);
      return;
    }

    if (actTween && flightTarget) {
      // Airborne since page:leave — from here the target is the REAL
      // element, read live every tick: exact landing, invisible hand-off.
      flightTarget.el = entry;
      return;
    }

    // Fallback (first visit): fly now, over the opening wall — unless the
    // ball already stands on the slot (e.g. a completed snapshot flight).
    const from = api.getSelfAnchor();
    if (!from) {
      api.setDissolve(0);
      api.startTracking(entry);
      return;
    }
    const fr = from.getBoundingClientRect();
    const near =
      Math.hypot(
        fr.left + fr.width / 2 - (rect.left + rect.width / 2),
        fr.top + fr.height / 2 - (rect.top + rect.height / 2),
      ) < Math.max(24, rect.width * 0.2);
    if (near) {
      api.setDissolve(0);
      api.startTracking(entry);
      return;
    }
    launchFlight(api, from, entry, 1.8);
  });
}
