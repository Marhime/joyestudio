<template>
  <div ref="container" class="pixel-blob"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import modelUrl from "~/assets/3D/smileyV3.glb?url";
import { domRectToWorld } from "~/utils/domToWorld";
import { useRAFManager } from "~/composables/useRAFManager";
import { debounce } from "~/utils/debounce";
import { perfMonitor } from "~/utils/perfMonitor";

// Module-level counter for per-instance RAF ids (never rendered → SSR-safe)
let blobInstanceCount = 0;

const DEG = Math.PI / 180;

// Signature motion language for the glance gesture — four named curves,
// never randomized: the curve set IS the character. Registered at module
// scope (client only) so glance() works even when reduced-motion skips init().
//   joyeTurn    → yaw: 5% whisper overshoot, clean land
//   joyeCock    → roll: overshoots to 113%, HANGS on the plateau, softens
//   joyeRelease → return: slow peel off the pose, long soft landing
//   joyeSettle  → roll settle: crosses neutral ~4% once, catches, lands dead
if (import.meta.client) {
  gsap.registerPlugin(CustomEase);
  CustomEase.create("joyeTurn", "M0,0 C0.22,0 0.32,1.05 0.5,1.045 C0.7,1.04 0.82,1 1,1");
  CustomEase.create("joyeCock", "M0,0 C0.16,0 0.28,1.13 0.46,1.12 C0.64,1.10 0.76,1 1,1");
  CustomEase.create("joyeRelease", "0.55,0,0.16,1");
  CustomEase.create("joyeSettle", "M0,0 C0.42,0 0.52,1.042 0.68,1.036 C0.84,1.01 0.93,1 1,1");
}

const props = defineProps({
  color: { type: Number, default: 0xffe15a },
  radius: { type: Number, default: 28 },
  followRange: { type: Number, default: 150 },
});

const container = ref(null);

// Unique RAF id per instance — a second PixelBlob3 (e.g. pages/hiye.vue)
// must never replace or unregister this instance's animate callback in the
// shared RAF manager.
const rafId = `three-${++blobInstanceCount}`;

// Lenis smoothed scroll velocity feeds the ambient scroll-lag (client only)
const { $lenis } = useNuxtApp();

let renderer, scene, camera, mesh, gui;
// World-space viewport height at z=0 — set in init() from camera fov/z
// (both fixed; only aspect varies on resize and is read live).
let viewportWorldH = 372;
const meshes = []; // sphere sub-meshes with shader → shared uniform updates
let featureMeshes = []; // eyes + mouth → MeshBasicMaterial
let mouthMesh = null; // reference to the mouth (Cylinder) for shape-key control
// Measured at GLB load: the pixel body is NOT a unit sphere — geoRadius
// maps scale-units (props.radius, tracking scale) to the VISUAL radius.
// The GLB is recentered at load so mesh.position ≡ ball center.
let geoRadius = 1;
const mouse = new THREE.Vector2(0.5, 0.5);
const followMouse = new THREE.Vector2(0.5, 0.5);
const velocityDir = new THREE.Vector2(0, 0);
const prevPos = new THREE.Vector2(0, 0);
let moveSpeed = 0,
  smoothVelo = 0,
  tickCounter = 0,
  trailStrength = 0;

// Render-skip state: when the visual scene hasn't changed beyond these epsilons,
// we skip renderer.render() entirely. Math (lerps, etc.) still runs so the next
// dirty frame produces the same image as if we'd never skipped.
const prevRender = {
  px: NaN,
  py: NaN,
  rx: NaN,
  ry: NaN,
  rz: NaN,
  sc: NaN,
  trail: NaN,
  tick: NaN,
  dis: NaN,
};
let forceRender = true;

// Frame-rate independent timing: dt is normalized so 1 unit = a 60fps frame.
// At 60fps dt ≈ 1, at 120fps dt ≈ 0.5. Multiply per-frame increments by dt
// so animation speed is identical across refresh rates.
let lastFrameNow = 0;

// ─── Dom-tracking state ──────────────────────────────────────────────────
// Position read inside animate() — no separate gsap.ticker callback
let trackedEl = null;
const isTracking = ref(false);
const mode = ref("free"); // 'free' | 'tracking'
// Base world position written by gsapTickerFn each tick
const trackedBase = { x: 0, y: 0, scale: props.radius };

// ─── Scrub-driven state ──────────────────────────────────────────────────
// GSAP writes scrubTarget via onUpdate; animate() uses it directly.
const isScrubbing = ref(false);
const scrubTarget = { x: 0, y: 0, scale: props.radius };

// ─── Ambient life state ──────────────────────────────────────────────────
// baseScale = the scale the current mode wants, BEFORE the breath multiplier
// — keeps breathing from fighting tracking/scrub scale writes (one owner each).
// scrollLag = world-space Y offset dragged against Lenis scroll velocity;
// it moves mesh.position, so the velocity→trail pipeline reacts to scroll for free.
let baseScale = props.radius;
let scrollLag = 0;
// ─── Pixel-morph particle system ─────────────────────────────────────────
// True transmogrification for the scrubbed flight: ~900 instanced quads
// ("pixels") each detach from the sphere at A, fly their own staggered,
// wobbling arc, and land on the sphere at B — the ball erodes as its
// pixels leave and reassembles as they arrive. Created lazily on first
// morphScrub() call, updated only during scrub ticks.
const MORPH_COUNT = 900;
let morphMesh = null; // THREE.InstancedMesh
let morphData = null; // per-particle random params
const morphDummy = new THREE.Object3D();
const morphTravel = new THREE.Vector2();

const ensureMorphParticles = () => {
  if (morphMesh || !scene) return;
  const geo = new THREE.PlaneGeometry(1, 1);
  // Same RAW shader family as the sphere, sharing the exact uColor value.
  // A MeshBasicMaterial would pass through three's output color-space
  // conversion while the sphere's raw ShaderMaterial does not — same hex,
  // different pixels on screen. Raw + shared uniform = identical yellow.
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      void main() {
        #ifdef USE_INSTANCING
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        #else
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #endif
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }
    `,
    uniforms: { uColor: { value: new THREE.Color(guiParams.color) } },
    transparent: true,
    depthWrite: false,
  });
  morphMesh = new THREE.InstancedMesh(geo, mat, MORPH_COUNT);
  morphMesh.visible = false;
  morphMesh.renderOrder = 1; // above the (mostly dissolved) sphere
  scene.add(morphMesh);

  morphData = {
    dirA: new Float32Array(MORPH_COUNT * 3), // unit departure point on sphere A
    dirB: new Float32Array(MORPH_COUNT * 3), // unit arrival point on sphere B
    stag: new Float32Array(MORPH_COUNT), // random component of launch order
    size: new Float32Array(MORPH_COUNT), // quad size as fraction of radius
    sag: new Float32Array(MORPH_COUNT), // per-particle arc depth factor
    wobAmp: new Float32Array(MORPH_COUNT),
    wobFreq: new Float32Array(MORPH_COUNT),
    wobPhase: new Float32Array(MORPH_COUNT),
  };
  const randUnit = (arr, i) => {
    // Uniform point on the sphere (z flattened toward the camera plane)
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    arr[i * 3] = r * Math.cos(phi);
    arr[i * 3 + 1] = r * Math.sin(phi);
    arr[i * 3 + 2] = u * 0.35;
  };
  for (let i = 0; i < MORPH_COUNT; i++) {
    randUnit(morphData.dirA, i);
    randUnit(morphData.dirB, i);
    morphData.stag[i] = Math.random();
    // Matter-true sizes: every particle is a WHOLE pixel of the shared
    // grain — mostly 1×1, a few 2×2 "still glued" chunks for rhythm.
    // Stored in grain multiples; world size resolved per-frame in
    // updateMorph (the grain is a screen-space constant).
    morphData.size[i] = Math.random() < 0.85 ? 1 : 2;
    morphData.sag[i] = 0.5 + Math.random();
    morphData.wobAmp[i] = 4 + Math.random() * 11;
    morphData.wobFreq[i] = 1.5 + Math.random() * 2.2;
    morphData.wobPhase[i] = Math.random() * Math.PI * 2;
  }
};

// ─── Dissolve state ──────────────────────────────────────────────────────
// v: 0 = intact … 1 = fully dispersed (invisible). Written by the
// dissolveTo() timeline or setDissolve() — the timeline is killed before
// any manual write, so there is always a single owner.
const dissolveState = { v: 0 };
let dissolveTl = null;

// JS-side smoothstep for feature fade curves (matches GLSL smoothstep)
const sstep = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// Glance offsets (radians + squash factor) — written only by the glance()
// GSAP timeline, read by animate() and ADDED RAW to the smoothed base
// rotation. Raw (not lerped) so the tween's easing curve — overshoot,
// settle — reaches the screen intact instead of being low-pass filtered.
// roll = the cute Pixar head-cock; squash = subtle squash & stretch.
const glanceState = { yaw: 0, pitch: 0, roll: 0, squash: 0 };
// Smoothed base rotation accumulators (mouse tilt, sway, pinned yaw/pitch).
// mesh.rotation itself = smoothRot + glanceState → mesh is never the lerp
// accumulator, so the raw glance add doesn't feed back into the smoothing.
const smoothRot = { x: 0, y: 0, z: 0 };

const guiParams = {
  // ── Shader / Appearance
  pixelSize: 0.004,
  edgeWidth: 0.4,
  trailStretch: 12,
  flickerSpeed: 20,
  // Idle shimmer: drift of the noise hash at rest. The shader's hash function
  // is binary (any change = full randomization), so values > 0 produce flicker
  // regardless of how small. Use 0 unless you want a busy noise look.
  idleShimmer: 0,
  // Idle breathing: gentle sinusoidal modulation of uTrail at rest.
  // Smooth because uTrail affects cell stretch geometrically (continuous shader response).
  idleBreathAmp: 0.05, // amplitude of the breath on uTrail (0 = off)
  idleBreathFreq: 0.4, // breaths per second (Hz)
  // ── Pixel cells
  screenSpaceCells: true, // true = screen-aligned squares (same matter as morph/grid)
  matterPx: 10, // the pixel ATOM: screen grain (CSS px) shared by ball cells & morph particles
  // ── Ambient life (always-on, all modes)
  idleFloatAmp: 7, // world-units Lissajous drift amplitude
  idleSwayDeg: 2, // slow rotation sway amplitude (degrees)
  breathAmp: 0.02, // scale pulsation (±2%)
  breathFreq: 0.25, // breaths per second (Hz)
  scrollLagMult: 1.2, // Lenis velocity (px/frame) → world-space drag
  scrollLagMax: 50, // clamp on the scroll drag offset
  // ── Morph flight (scrubbed transmogrification)
  morphArcSag: 55, // base sag of the particle flight arcs (world units)
  morphWobble: 1, // multiplier on the serpentine wobble amplitude
  morphDrift: 3.5, // slow along-travel drift amplitude (world units)
  morphShimmer: 0.15, // per-particle size breathing in flight (0-1)
  morphCrawl: 1.1, // wobble phase crawl speed (rad/s) — life while parked
  morphExitTeaser: 0.25, // top-edge erosion as the ball exits the viewport
  morphTrailBoost: 0.7, // directional-erosion boost at arrival/departure
  solidStart: 0.3,
  solidEnd: 3,
  trailBias: 1.5,
  coarseRatio: 1,
  // ── Motion
  followLerp: 0.3,
  posLerp: 0.2,
  // Cursor gaze: head turns from ITS OWN position toward the cursor's point
  // on the z=0 plane — atan2(offset, gazeDepth) saturates naturally at
  // screen edges (~±23° at strength 0.8 / depth 600).
  gazeStrength: 0.8,
  gazeDepth: 600,
  gazePinnedDamp: 0.35, // pinned anchors damp the gaze instead of killing it
  tiltLerp: 0.1,
  // ── Trail dynamics
  trailRise: 0.15,
  trailDecay: 0.03,
  trailVeloMult: 2.0,
  // ── Color
  color: "#fff176",
  featureColor: "#1a1408",
  // ── Tracking
  trackingScale: 0.48,
  hoverOffset: 25, // ── Initial rotation (degrees)
  rotX: 1,
  rotY: 2,
  rotZ: -1,
};

// The matter grain: ONE constant screen-space pixel size (CSS px) shared by
// the sphere's cells and the morph particles — a bigger ball means MORE
// pixels, never bigger ones. Clamped so tiny balls (mobile inline anchor)
// keep ≥ ~9 cells across and still read as a ball.
const matterGrainPx = (radiusCssPx) =>
  Math.max(3, Math.min(guiParams.matterPx, radiusCssPx / 4.5));

// ─── Shaders ───────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  // Rasterization halo: in screen-space mode the fragment alpha is fully
  // analytic (cell-center math), but fragments only exist where the mesh
  // rasterizes — inflate the geometry (around ITS own center, which may
  // be offset from the node origin) so silhouette cells get FULL coverage
  // instead of being sliced by the smooth sphere edge.
  uniform float uInflate;
  uniform vec3  uGeoCenter;

  void main() {
    vUv      = uv;
    vNormal  = normalize(normalMatrix * normal);
    vec3 inflated = (position - uGeoCenter) * uInflate + uGeoCenter;
    vec4 mvp = modelViewMatrix * vec4(inflated, 1.0);
    vViewPosition = mvp.xyz;
    gl_Position   = projectionMatrix * mvp;
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  uniform float uVelo;
  uniform float uTick;
  uniform float uPixelSize;
  uniform float uEdgeWidth;
  uniform float uTrail;        // slow-decaying trail strength
  uniform float uTrailStretch; // how much cells elongate in movement dir
  uniform vec2  uVeloDir;      // normalized velocity direction
  uniform vec3  uColor;
  uniform float uSolidStart;   // smoothstep lower bound for core
  uniform float uSolidEnd;     // smoothstep upper bound for core
  uniform float uTrailBias;    // trailing edge dissolve multiplier
  uniform float uCoarseRatio;  // layer-2 cell size multiplier
  uniform float uDissolve;     // 0 = intact … 1 = fully dispersed pixel cloud
  uniform float uScreenSpace;  // 1 = axis-aligned screen-space square cells
  uniform float uScreenCell;   // the matter grain: cell size (physical px)
  uniform vec2  uBallScreen;   // ball center in physical px — grid anchor
  uniform vec2  uBallRadius;   // ball radius in physical px (x/y for squash)

  void main() {
    vec2 velSafe = normalize(uVeloDir + vec2(0.001));

    // Cells stretch in movement direction proportionally to trail strength.
    // HARD gate on the dissolve: a dissolving ball is loose pixels and
    // pixels are square — a linear damp is not enough because uTrail is
    // itself boosted by the dissolve (scrubTrail + uDissolve terms would
    // smear the reforming ball into bars). The erosion's direction reads
    // through the spray asymmetry (uVeloDir → trailBias), never through
    // smearing. Cell SIZE never changes either: one matter, one grain.
    float stretch = uTrail * uTrailStretch
                  * (1.0 - smoothstep(0.05, 0.25, uDissolve));

    float facing; float trailBias;
    float cx; float cy; float cx2; float cy2;

    if (uScreenSpace > 0.5) {
      // ── Screen-space matter: TRUE axis-aligned squares on ONE grain —
      // the exact lattice the morph particles launch from and dock into.
      // The grid is ANCHORED to the ball's center (not the screen): it
      // translates rigidly with the ball, so ambient drift never
      // re-rasterizes the edge (no boiling) — only the hash flicker
      // animates. Fresnel + comet bias are evaluated at the CELL CENTER
      // from the analytic ball, so every cell is uniformly on or off:
      // the silhouette itself becomes pixel steps — a smooth arc never
      // slices through a square.
      float sx = uScreenCell * (1.0 + stretch * abs(velSafe.x));
      float sy = uScreenCell * (1.0 + stretch * abs(velSafe.y));
      vec2 sc = gl_FragCoord.xy - uBallScreen;
      cx  = floor(sc.x / sx);
      cy  = floor(sc.y / sy);
      cx2 = floor((sc.x + sx * 0.7) / (sx * uCoarseRatio));
      cy2 = floor((sc.y + sy * 0.4) / (sy * uCoarseRatio));
      vec2 cc = vec2((cx + 0.5) * sx, (cy + 0.5) * sy) / uBallRadius;
      facing = sqrt(max(0.0, 1.0 - dot(cc, cc)));
      trailBias = (1.0 - dot(normalize(cc + vec2(0.0001)), velSafe)) * 0.5;
    } else {
      // ── Surface-space cells (legacy look): painted on the sphere's UV,
      // curved and foreshortened by the 3D projection. Per-fragment
      // fresnel from the real normals.
      facing = max(0.0, dot(normalize(vNormal), -normalize(vViewPosition)));
      trailBias = (1.0 - dot(normalize(vNormal.xy + vec2(0.001)), velSafe)) * 0.5;
      vec2 velPerp  = vec2(-velSafe.y, velSafe.x);
      float uvAlong = dot(vUv - 0.5, velSafe);
      float uvPerp  = dot(vUv - 0.5, velPerp);
      float psAlong = uPixelSize * (1.0 + stretch);
      float psPerp  = uPixelSize;
      cx  = floor(uvAlong / psAlong);
      cy  = floor(uvPerp  / psPerp);
      cx2 = floor((uvAlong + psAlong * 0.7) / (psAlong * uCoarseRatio));
      cy2 = floor((uvPerp  + psPerp  * 0.4) / (psPerp  * uCoarseRatio));
    }

    // Trailing edge dissolves much more than leading edge.
    // uDissolve widens the dissolution zone over the WHOLE sphere — the
    // same silhouette-spray language, pushed inward until only sparse
    // scattered cells remain (the smiley "becomes pixels").
    float t = clamp(facing / (uEdgeWidth + uTrail * trailBias * uTrailBias + uDissolve * 2.5), 0.0, 1.0);

    float r1  = fract(sin(cx  * 127.1 + cy  * 311.7 + uTick * 57.3) * 43758.5);
    float r2  = fract(sin(cx2 * 269.5 + cy2 * 183.3 + uTick * 31.7) * 23421.6);
    float rnd = r1 * 0.65 + r2 * 0.35;

    float spray = step(1.0 - t, rnd);
    // Smooth core dies early in the dissolve — only loose pixels remain
    float solid = smoothstep(uSolidStart, uSolidEnd, t)
                * (1.0 - smoothstep(0.2, 0.6, uDissolve));
    // Terminal fade so a full dissolve can vanish entirely
    float vanish = 1.0 - smoothstep(0.75, 1.0, uDissolve);

    gl_FragColor = vec4(uColor, max(solid, spray) * vanish);
  }
`;

// ─── Events ────────────────────────────────────────────────────────────────
const onPointerMove = (e) => {
  mouse.x = e.clientX / window.innerWidth;
  mouse.y = 1.0 - e.clientY / window.innerHeight;
};

const resize = () => {
  if (!container.value || !renderer || !camera) return;
  const w = container.value.clientWidth || window.innerWidth;
  const h = container.value.clientHeight || window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  forceRender = true;
};
const debouncedResize = debounce(resize, 150);

const onContextLost = (e) => {
  e.preventDefault();
  useRAFManager().unregister(rafId);
};

const onContextRestored = () => {
  useRAFManager().register(rafId, animate);
};

// ─── Loop ──────────────────────────────────────────────────────────────────
const animate = (now) => {
  if (!renderer || renderer.getContext().isContextLost()) return;

  // dt = 1 means a 60fps frame (16.667 ms). At 120fps dt ≈ 0.5.
  // Capped at 3 so a tab-visibility resume doesn't make tickCounter jump.
  const dt =
    lastFrameNow === 0 ? 1 : Math.min((now - lastFrameNow) / 16.667, 3);
  lastFrameNow = now;

  // Morph transmogrification runs per-frame (not per scrub tick) so the
  // swarm keeps living — wobble, drift, shimmer — while the scroll parks.
  if (morphState.active) updateMorph(now / 1000);

  // ── Ambient life ─────────────────────────────────────────────────────
  // Slow Lissajous drift + layered sway + breath, computed from absolute
  // time (frame-rate independent). All frequencies incommensurate so no
  // pattern visibly repeats, and no cross-channel pair sits near 1:1
  // (yaw octave 2 = 0.63 deliberately clear of floatY's 0.73).
  const t = now / 1000;
  const floatX = Math.sin(t * 0.51) * guiParams.idleFloatAmp;
  const floatY = Math.sin(t * 0.73 + 1.3) * guiParams.idleFloatAmp * 0.7;

  // Three incommensurate octaves per axis — a single pure sine reads as a
  // metronome; the stack is perceptually filtered noise for 4 sins/frame.
  const swayU = guiParams.idleSwayDeg * DEG;
  const swayZ =
    (Math.sin(t * 0.4) * 0.675 +
      Math.sin(t * 0.93 + 2.1) * 0.25 +
      Math.sin(t * 2.63 + 4.2) * 0.09) *
    swayU;
  const swayY =
    (Math.sin(t * 0.27 + 0.8) * 0.35 +
      Math.sin(t * 0.63 + 3.7) * 0.125 +
      Math.sin(t * 1.19 + 5.1) * 0.05) *
    swayU;
  // Slow attention drift on pitch; its faster component is the breath below.
  const swayX = Math.sin(t * 0.19 + 2.6) * 0.175 * swayU;

  // Asymmetric breath: the 0.35 phase-distortion makes the inhale ~1.5s and
  // the exhale ~2.5s of the 4s cycle (active in, passive out) — peak
  // amplitude and period are exactly preserved, so no downstream re-tuning.
  const breathPhase = t * 2 * Math.PI * guiParams.breathFreq;
  const breathSine = Math.sin(breathPhase + 0.35 * Math.sin(breathPhase));
  const breathScale = 1 + guiParams.breathAmp * breathSine;

  // Breath → posture: chin lifts on the inhale (locked 1:1 to the scale
  // breath), with a 0.7s-lagged micro-yaw that turns the nod into a shallow
  // elliptical orbit — a breathing head, not a pump. Depth follows the GUI
  // breath knob so the whole organism deepens coherently.
  const breathK = guiParams.breathAmp / 0.02;
  const breathPitch = -breathSine * 0.5 * DEG * breathK;
  const breathYaw = Math.sin(breathPhase - 1.1) * 0.12 * DEG * breathK;

  // Scroll drag: Lenis' smoothed velocity pulls the smiley against the
  // scroll direction; the lerp brings it back to rest once scrolling stops.
  const scrollVelo = $lenis ? $lenis.velocity || 0 : 0;
  const lagTarget = Math.max(
    -guiParams.scrollLagMax,
    Math.min(guiParams.scrollLagMax, -scrollVelo * guiParams.scrollLagMult),
  );
  scrollLag += (lagTarget - scrollLag) * Math.min(0.08 * dt, 1);

  if (isScrubbing.value) {
    // GSAP scrub drives position directly — just copy target
    trackedBase.x = scrubTarget.x;
    trackedBase.y = scrubTarget.y;
    trackedBase.scale = scrubTarget.scale;
  } else if (isTracking.value && trackedEl && camera && renderer) {
    // Read tracked element position (runs inside animate, no separate ticker)
    const rect = trackedEl.getBoundingClientRect();
    const cw = renderer.domElement.clientWidth || window.innerWidth;
    const ch = renderer.domElement.clientHeight || window.innerHeight;
    const { x, y, worldSize } = domRectToWorld(rect, camera, cw, ch);
    // Per-anchor optional scale multiplier (read from data-smiley-scale="1.3")
    const localMul = parseFloat(trackedEl.dataset.smileyScale) || 1;
    trackedBase.x = x;
    trackedBase.y = y;
    trackedBase.scale = (worldSize / 2) * guiParams.trackingScale * localMul;
  }

  if (isTracking.value || isScrubbing.value) {
    // ── Tracking mode ─────────────────────────────────────────────────
    // followMouse lags gently behind the cursor (same lerp as free mode)
    followMouse.x += (mouse.x - followMouse.x) * guiParams.followLerp;
    followMouse.y += (mouse.y - followMouse.y) * guiParams.followLerp;

    // Small organic offset: cursor relative to viewport center
    const ox = (followMouse.x - 0.5) * guiParams.hoverOffset;
    const oy = (followMouse.y - 0.5) * guiParams.hoverOffset;

    // Base from DOM tracker + hover offset → real delta for velocity pipeline.
    // Ambient float is dialed down: the anchor leads, life stays subtle.
    mesh.position.x = trackedBase.x + ox + floatX * 0.25;
    mesh.position.y = trackedBase.y + oy + floatY * 0.25;
    baseScale = trackedBase.scale;
  } else {
    // ── Mouse follow mode ─────────────────────────────────────────────────
    followMouse.x += (mouse.x - followMouse.x) * guiParams.followLerp;
    followMouse.y += (mouse.y - followMouse.y) * guiParams.followLerp;

    const tx = (followMouse.x - 0.5) * props.followRange + floatX;
    const ty = (followMouse.y - 0.5) * props.followRange + floatY + scrollLag;
    mesh.position.x += (tx - mesh.position.x) * guiParams.posLerp;
    mesh.position.y += (ty - mesh.position.y) * guiParams.posLerp;
  }

  // Breath + glance squash applied on top of whatever scale the current mode
  // wants — single writer for mesh.scale, all modes stay alive. Dissolving
  // swells the ball ~35%: the sparse pixels loosen outward as a cloud, then
  // condense back to size.
  const s = baseScale * breathScale * (1 + dissolveState.v * 0.18);
  const sq = glanceState.squash;
  mesh.scale.set(s * (1 - sq), s * (1 + sq), s);

  // Velocity tracking. During a morph the pipeline is bypassed entirely:
  // the magician's-clock warp (ball teleports A→B mid-flight) would spike
  // moveSpeed and smear the reforming cells into bars — scrubTrail owns
  // the morph's comet story, and updateMorph() aims velocityDir itself.
  if (morphState.active) {
    prevPos.set(mesh.position.x, mesh.position.y);
    moveSpeed *= 0.85; // drain any pre-morph residue
  } else {
    const vx = mesh.position.x - prevPos.x;
    const vy = mesh.position.y - prevPos.y;
    const speed = Math.sqrt(vx * vx + vy * vy);
    moveSpeed += (speed - moveSpeed) * 0.12;

    if (speed > 0.001) {
      const inv = 1.0 / speed;
      velocityDir.x += (vx * inv - velocityDir.x) * 0.15;
      velocityDir.y += (vy * inv - velocityDir.y) * 0.15;
    }
  }
  // When speed drops below the threshold, freeze velocityDir instead of
  // multiplying it by 0.92. The shader uses normalize(uVeloDir + 0.001) to
  // orient its cell grid — letting velocityDir shrink toward (0,0) makes the
  // tiny epsilon dominate and rotates the apparent grid toward the X axis.
  // Freezing keeps the grid stable; trailStrength still decays, so the
  // anisotropic stretch fades to round cells without any apparent spin.
  prevPos.set(mesh.position.x, mesh.position.y);

  const clamped = Math.min(moveSpeed * 0.025, 0.12);
  smoothVelo += (clamped - smoothVelo) * 0.08;

  // One matter, one grain: the cell size is CONSTANT on screen (the pixel
  // is the smiley's atom) — hero ball, inline ball and morph particles all
  // share it. The grid anchor follows the ball's projected center
  // (physical px) so ambient drift moves the grid WITH the ball instead
  // of through it.
  const canvasH = renderer.domElement.clientHeight || window.innerHeight;
  const canvasW = renderer.domElement.clientWidth || window.innerWidth;
  const pr = renderer.getPixelRatio();
  const ballRadiusCssX = (mesh.scale.x * geoRadius / viewportWorldH) * canvasH;
  const ballRadiusCssY = (mesh.scale.y * geoRadius / viewportWorldH) * canvasH;
  const grainCss = matterGrainPx(ballRadiusCssY);
  const screenCellPx = grainCss * pr;
  // Rasterization halo: enough geometry overdraw beyond the smooth
  // silhouette for ~2.5 rings of full edge cells (see uInflate).
  const inflate = guiParams.screenSpaceCells
    ? Math.min(1.6, 1 + (2.5 * grainCss) / Math.max(ballRadiusCssY, 1))
    : 1;
  const ballScreenX =
    (mesh.position.x / (viewportWorldH * camera.aspect) + 0.5) * canvasW * pr;
  const ballScreenY =
    (mesh.position.y / viewportWorldH + 0.5) * canvasH * pr;

  // Update shader uniforms on all sub-meshes (direct assignment, no intermediate object)
  for (const m of meshes) {
    const u = m.material.uniforms;
    u.uVelo.value = smoothVelo;
    u.uPixelSize.value = guiParams.pixelSize;
    u.uEdgeWidth.value = guiParams.edgeWidth;
    u.uTrailStretch.value = guiParams.trailStretch;
    u.uVeloDir.value.set(velocityDir.x, velocityDir.y);
    u.uSolidStart.value = guiParams.solidStart;
    u.uSolidEnd.value = guiParams.solidEnd;
    u.uTrailBias.value = guiParams.trailBias;
    u.uCoarseRatio.value = guiParams.coarseRatio;
    u.uDissolve.value = dissolveState.v;
    u.uScreenSpace.value = guiParams.screenSpaceCells ? 1 : 0;
    u.uScreenCell.value = screenCellPx;
    u.uBallScreen.value.set(ballScreenX, ballScreenY);
    u.uBallRadius.value.set(ballRadiusCssX * pr, ballRadiusCssY * pr);
    u.uInflate.value = inflate;
  }

  // Face features can't dissolve through the pixel shader (MeshBasic) —
  // they fade out EARLY in the dissolve (the ball loses its face first,
  // then scatters) and back in as it recondenses.
  const featureAlpha = 1 - sstep(0.12, 0.45, dissolveState.v);
  for (const m of featureMeshes) m.material.opacity = featureAlpha;

  // trailStrength: rises fast with velocity, decays slowly after stop
  // → trail lingers organically instead of cutting instantly
  const targetTrail = Math.min(smoothVelo * guiParams.trailVeloMult, 1.0);
  trailStrength +=
    (targetTrail - trailStrength) *
    (targetTrail > trailStrength ? guiParams.trailRise : guiParams.trailDecay);

  // Idle breathing: gentle sinusoidal modulation of uTrail when at rest.
  // Smooth because uTrail affects cell stretch geometrically — unlike uTick
  // which is fed through a hash and randomizes on any change.
  // Uses absolute time so the rate is frame-rate independent automatically.
  const idleBreath =
    smoothVelo > 0.004
      ? 0
      : guiParams.idleBreathAmp *
        Math.sin((now / 1000) * 2 * Math.PI * guiParams.idleBreathFreq);

  for (const m of meshes)
    m.material.uniforms.uTrail.value =
      trailStrength + idleBreath + dissolveState.v * 0.15 + scrubTrail;

  // Tick: rapid scroll during motion, slow drift at rest.
  // Float (no Math.floor) so the noise pattern shifts continuously, multiplied
  // by dt so the speed is identical across 60fps / 120fps / 144fps screens.
  tickCounter +=
    (smoothVelo > 0.004
      ? smoothVelo * guiParams.flickerSpeed
      : guiParams.idleShimmer) *
      dt +
    dissolveState.v * 0.25 * dt; // dissolving pixels flicker, gently
  for (const m of meshes) m.material.uniforms.uTick.value = tickCounter;

  // Subtle tilt toward mouse. If the tracked element pins a yaw or pitch
  // ("data-smiley-yaw" / "data-smiley-pitch" in degrees), they become the
  // BASE rotation — mouse tilt is still added on top so the smiley stays
  // alive while facing the desired direction.
  const baseRotZ = (guiParams.rotZ * Math.PI) / 180 + swayZ;

  const pinnedYawDeg =
    isTracking.value && trackedEl
      ? parseFloat(trackedEl.dataset.smileyYaw)
      : NaN;
  const baseRotY = !Number.isNaN(pinnedYawDeg)
    ? (pinnedYawDeg * Math.PI) / 180
    : (guiParams.rotY * Math.PI) / 180;

  const pinnedPitchDeg =
    isTracking.value && trackedEl
      ? parseFloat(trackedEl.dataset.smileyPitch)
      : NaN;
  const baseRotX = !Number.isNaN(pinnedPitchDeg)
    ? (pinnedPitchDeg * Math.PI) / 180
    : (guiParams.rotX * Math.PI) / 180;

  // True cursor gaze: angle from the smiley's own position to the cursor's
  // point on the z=0 plane — it looks AT the cursor, wherever it stands,
  // not "tilts relative to viewport center". atan2 saturates at the edges.
  // Pinned axes DAMP the gaze instead of killing it: the head stays biased
  // toward its designed pose but keeps acknowledging the cursor.
  const cursorX = (followMouse.x - 0.5) * viewportWorldH * camera.aspect;
  const cursorY = (followMouse.y - 0.5) * viewportWorldH;
  const gazeYaw =
    Math.atan2(cursorX - mesh.position.x, guiParams.gazeDepth) *
    guiParams.gazeStrength;
  const gazePitch =
    -Math.atan2(cursorY - mesh.position.y, guiParams.gazeDepth) *
    guiParams.gazeStrength;
  const mouseTiltY = Number.isNaN(pinnedYawDeg)
    ? gazeYaw
    : gazeYaw * guiParams.gazePinnedDamp;
  const mouseTiltX = Number.isNaN(pinnedPitchDeg)
    ? gazePitch
    : gazePitch * guiParams.gazePinnedDamp;

  // Base rotation is smoothed (mouse tilt, sway, pinned axes); glance tween
  // offsets are added RAW so their easing personality survives untouched.
  // Smoothing factor is frame-rate corrected: dt is normalized to 60fps
  // frames, so this equals tiltLerp/frame at 60fps and stays identical in
  // feel at 90/120/144Hz.
  const rotEase = 1 - Math.pow(1 - guiParams.tiltLerp, dt);
  smoothRot.y +=
    (baseRotY + mouseTiltY + swayY + breathYaw - smoothRot.y) * rotEase;
  smoothRot.x +=
    (baseRotX + mouseTiltX + swayX + breathPitch - smoothRot.x) * rotEase;
  smoothRot.z += (baseRotZ - smoothRot.z) * rotEase;
  mesh.rotation.y = smoothRot.y + glanceState.yaw;
  mesh.rotation.x = smoothRot.x + glanceState.pitch;
  mesh.rotation.z = smoothRot.z + glanceState.roll;

  // Skip render when nothing visible has changed since last paint.
  // Tracking/scrubbing modes always render — they're DOM-driven and the
  // visible state can shift between frames without our math noticing.
  // tickCounter compared as float with a tiny epsilon so the idle shimmer
  // still renders smoothly (skip would cause strobing).
  const dirty =
    forceRender ||
    isTracking.value ||
    isScrubbing.value ||
    Math.abs(mesh.position.x - prevRender.px) > 0.05 ||
    Math.abs(mesh.position.y - prevRender.py) > 0.05 ||
    Math.abs(mesh.rotation.x - prevRender.rx) > 0.0005 ||
    Math.abs(mesh.rotation.y - prevRender.ry) > 0.0005 ||
    Math.abs(mesh.rotation.z - prevRender.rz) > 0.0005 ||
    Math.abs(mesh.scale.x - prevRender.sc) > 0.05 ||
    Math.abs(trailStrength + idleBreath - prevRender.trail) > 0.001 ||
    Math.abs(tickCounter - prevRender.tick) > 1e-9 ||
    Math.abs(dissolveState.v - prevRender.dis) > 0.001;

  if (dirty) {
    perfMonitor.markStart("three");
    renderer.render(scene, camera);
    perfMonitor.markEnd("three");

    prevRender.px = mesh.position.x;
    prevRender.py = mesh.position.y;
    prevRender.rx = mesh.rotation.x;
    prevRender.ry = mesh.rotation.y;
    prevRender.rz = mesh.rotation.z;
    prevRender.sc = mesh.scale.x;
    prevRender.trail = trailStrength + idleBreath;
    prevRender.tick = tickCounter;
    prevRender.dis = dissolveState.v;
    forceRender = false;
  }

  perfMonitor.tickFrame();
};

// ─── Init ──────────────────────────────────────────────────────────────────
const init = () => {
  scene = new THREE.Scene();

  // pixelRatio = 1 → each logical pixel maps to 1 screen pixel
  // → crisp, visible pixel blocks from gl_FragCoord (no sub-pixel blurring)
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // fully transparent background

  container.value.appendChild(renderer.domElement);
  renderer.domElement.addEventListener(
    "webglcontextlost",
    onContextLost,
    false,
  );
  renderer.domElement.addEventListener(
    "webglcontextrestored",
    onContextRestored,
    false,
  );

  // clientWidth can be 0 during Nuxt hydration — fall back to window dimensions
  const w = container.value.clientWidth || window.innerWidth;
  const h = container.value.clientHeight || window.innerHeight;
  renderer.setSize(w, h);

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
  camera.position.set(0, 0, 450);
  viewportWorldH = 2 * camera.position.z * Math.tan((camera.fov * DEG) / 2);

  // ── Shared material factory ────────────────────────────────────────
  const makeMaterial = (color) =>
    new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uVelo: { value: 0 },
        uTick: { value: 0 },
        uTrail: { value: 0 },
        uTrailStretch: { value: guiParams.trailStretch },
        uPixelSize: { value: guiParams.pixelSize },
        uEdgeWidth: { value: guiParams.edgeWidth },
        uVeloDir: { value: new THREE.Vector2(0, 0) },
        uColor: { value: new THREE.Color(color) },
        uSolidStart: { value: guiParams.solidStart },
        uSolidEnd: { value: guiParams.solidEnd },
        uTrailBias: { value: guiParams.trailBias },
        uCoarseRatio: { value: guiParams.coarseRatio },
        uDissolve: { value: 0 },
        uScreenSpace: { value: 1 },
        uScreenCell: { value: 12 },
        uBallScreen: { value: new THREE.Vector2(0, 0) },
        uBallRadius: { value: new THREE.Vector2(1, 1) },
        uInflate: { value: 1 },
        uGeoCenter: { value: new THREE.Vector3(0, 0, 0) },
      },
      transparent: true,
      depthWrite: false,
    });

  // ── GLB Load ──────────────────────────────────────────────────
  // Feature mesh names — matches L_Eye, R_Eye, Cylinder (mouth)
  const FEATURE_NAMES = ["eye", "gpencil", "mouth", "cylinder", "face"];
  const isFeature = (name) =>
    FEATURE_NAMES.some((k) => name.toLowerCase().includes(k));

  mesh = new THREE.Group();
  mesh.scale.setScalar(props.radius);
  scene.add(mesh);

  new GLTFLoader().load(modelUrl, (gltf) => {
    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;
      if (isFeature(child.name)) {
        // Features → solid fill, no pixel effect. Transparent so the
        // dissolve can fade the face out (opacity driven per-frame).
        child.material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(guiParams.featureColor),
          transparent: true,
          opacity: 1,
          depthWrite: true,
        });
        featureMeshes.push(child);
        // Identify the mouth mesh (Cylinder) so we can drive its shape keys.
        // GLTFLoader populates morphTargetDictionary / morphTargetInfluences
        // when the GLB export includes shape keys.
        if (/cylinder|mouth|face/i.test(child.name)) {
          mouthMesh = child;
        }
      } else {
        // Sphere → full pixel shader
        child.material = makeMaterial(guiParams.color);
        // Inflation pivot: the geometry's own local center (may be offset
        // from the node origin in the GLB).
        child.geometry.computeBoundingSphere();
        child.material.uniforms.uGeoCenter.value.copy(
          child.geometry.boundingSphere.center,
        );
        meshes.push(child);
      }
    });
    // ── Normalize the GLB ────────────────────────────────────────────
    // The authored body is neither a unit sphere nor centered on the node
    // origin. Recenter so mesh.position ≡ the ball's visual center (the
    // analytic shader disc, the morph lattice and the DOM anchors must
    // all agree on ONE center), and measure geoRadius so scale-units map
    // exactly to the visual radius everywhere.
    gltf.scene.updateMatrixWorld(true);
    const bodyBounds = new THREE.Box3();
    for (const m of meshes) bodyBounds.expandByObject(m);
    const bodyCenter = bodyBounds.getCenter(new THREE.Vector3());
    const bodySize = bodyBounds.getSize(new THREE.Vector3());
    gltf.scene.position.sub(bodyCenter);
    // Half-extent, NOT Box3.getBoundingSphere (that circumscribes the box
    // corners — ×√3 too big for a sphere). x/y only: the screen-facing disc.
    geoRadius = Math.max(bodySize.x, bodySize.y) / 2;
    mesh.add(gltf.scene);
    // Basis is the default state (all morph influences = 0 by default).

    // Debug log — tells us what got loaded so we can see if the join broke things.
    if (typeof window !== "undefined") {
      const allMeshNames = [];
      gltf.scene.traverse((c) => {
        if (c.isMesh) allMeshNames.push(c.name);
      });
      console.log("[PixelBlob3] GLB loaded:", {
        geoRadius,
        geoCenter: bodyCenter.toArray(),
        allMeshes: allMeshNames,
        featureMeshes: featureMeshes.map((m) => ({
          name: m.name,
          visible: m.visible,
          position: m.position.toArray(),
          scale: m.scale.toArray(),
          shapeKeys: m.morphTargetDictionary,
        })),
        mouthMesh: mouthMesh
          ? {
              name: mouthMesh.name,
              shapeKeys: mouthMesh.morphTargetDictionary,
              influences: mouthMesh.morphTargetInfluences,
            }
          : null,
      });
    }

    forceRender = true;
  });

  window.addEventListener("resize", debouncedResize);
  window.addEventListener("pointermove", onPointerMove);

  // ─── lil-gui ─────────────────────────────────────────────────────────
  // Activated via ?gui=1 in the URL — keeps the tuner out of normal browsing.
  const guiEnabled =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("gui") === "1";

  if (guiEnabled) {
    import("lil-gui").then(({ default: GUI }) => {
      gui = new GUI({ title: "✦ Pixel Blob", width: 270 });

      // ── Appearance ─────────────────────────────────────────────────────
      const fAppear = gui.addFolder("◈ Appearance");
      fAppear
        .add(guiParams, "pixelSize", 0.001, 0.03, 0.001)
        .name("Pixel size");
      fAppear.add(guiParams, "edgeWidth", 0.05, 1.2, 0.01).name("Edge width");
      fAppear.add(guiParams, "solidStart", 0, 0.98, 0.01).name("Solid start");
      fAppear.add(guiParams, "solidEnd", 0.5, 3.0, 0.01).name("Solid end");
      fAppear.add(guiParams, "coarseRatio", 1.0, 5.0, 0.1).name("Coarse layer");
      fAppear
        .add(guiParams, "trackingScale", 0.1, 2.0, 0.01)
        .name("Tracking size");
      fAppear.add(guiParams, "hoverOffset", 0, 80, 0.5).name("Hover offset");
      fAppear
        .add({ dissolve: 0 }, "dissolve", 0, 1, 0.01)
        .name("Dissolve (test)")
        .onChange((v) => setDissolve(v));
      fAppear
        .add(guiParams, "screenSpaceCells")
        .name("Screen-space px");
      fAppear
        .add(guiParams, "matterPx", 4, 16, 1)
        .name("Matter grain (px)");

      // ── Morph flight — pixel-perfect tuning of the transmogrification.
      // "Scrub (test)" drives the morph by hand, frame by frame, using the
      // hero face and the About placeholder as anchors.
      const fMorph = gui.addFolder("✦ Morph flight");
      fMorph.add(guiParams, "morphArcSag", 0, 160, 1).name("Arc sag");
      fMorph.add(guiParams, "morphWobble", 0, 3, 0.05).name("Wobble");
      fMorph.add(guiParams, "morphDrift", 0, 12, 0.1).name("Drift");
      fMorph.add(guiParams, "morphShimmer", 0, 0.8, 0.01).name("Shimmer");
      fMorph.add(guiParams, "morphCrawl", 0, 5, 0.05).name("Crawl speed");
      fMorph
        .add(guiParams, "morphExitTeaser", 0, 1, 0.01)
        .name("Exit teaser");
      fMorph
        .add(guiParams, "morphTrailBoost", 0, 3, 0.05)
        .name("Trail boost");
      fMorph
        .add({ scrub: 0 }, "scrub", 0, 1, 0.001)
        .name("Scrub (test)")
        .onChange((v) => {
          const a = document.querySelector("[hiye-face]");
          const b = document.querySelector("[hiye-face-placeholder]");
          if (a && b) morphScrub(v, a, b);
        });
      fMorph.open(false);

      // ── Trail & shimmer ────────────────────────────────────────────────
      const fTrail = gui.addFolder("↝ Trail & shimmer");
      fTrail.add(guiParams, "trailStretch", 0.0, 12.0, 0.5).name("Stretch");
      fTrail.add(guiParams, "trailBias", 0.0, 8.0, 0.1).name("Edge bias");
      fTrail
        .add(guiParams, "flickerSpeed", 1, 20, 0.5)
        .name("Flicker (motion)");
      fTrail
        .add(guiParams, "idleBreathAmp", 0, 0.15, 0.005)
        .name("Idle breath amp");
      fTrail
        .add(guiParams, "idleBreathFreq", 0, 2, 0.05)
        .name("Idle breath Hz");
      fTrail
        .add(guiParams, "idleShimmer", 0, 0.001, 0.000001)
        .name("Idle shimmer (noise)");
      fTrail
        .add(guiParams, "trailVeloMult", 1.0, 20.0, 0.5)
        .name("Velo → trail");
      fTrail.add(guiParams, "trailRise", 0.01, 0.3, 0.005).name("Rise speed");
      fTrail
        .add(guiParams, "trailDecay", 0.005, 0.15, 0.005)
        .name("Decay speed");
      fTrail.open(true);

      // ── Expressions (shape keys) ──────────────────────────────────────
      // Independent sliders for direct control (additive). Trigger buttons
      // use setExpression's exclusive mode to cross-fade between expressions
      // and auto-revert to Basis (the default neutral state).
      const fExpr = gui.addFolder("☻ Expressions");
      const exprState = { shocked: 0, happy: 0, wink: 0 };

      const writeInfluence = (name) => (v) => {
        const idx = findMorphIdx(name);
        if (idx === undefined || !mouthMesh?.morphTargetInfluences) return;
        mouthMesh.morphTargetInfluences[idx] = v;
        forceRender = true;
      };

      const syncSliders = () => {
        if (!mouthMesh?.morphTargetInfluences) return;
        for (const name of Object.keys(exprState)) {
          const idx = findMorphIdx(name);
          if (idx !== undefined)
            exprState[name] = mouthMesh.morphTargetInfluences[idx];
        }
        fExpr.controllers.forEach((c) => c.updateDisplay());
      };

      // Tween everything back to 0 (Basis) — single gsap.to() call animates
      // all indices in parallel without the self-overwriting trap.
      const revertToBasis = (duration = 0.45) => {
        if (!mouthMesh?.morphTargetDictionary || !mouthMesh.morphTargetInfluences)
          return Promise.resolve();
        const props = {
          duration,
          ease: "power2.out",
          overwrite: "auto",
          onUpdate: () => {
            forceRender = true;
          },
        };
        for (const idx of Object.values(mouthMesh.morphTargetDictionary)) {
          props[idx] = 0;
        }
        return new Promise((resolve) => {
          props.onComplete = resolve;
          props.onInterrupt = resolve;
          gsap.to(mouthMesh.morphTargetInfluences, props);
        });
      };

      const exprActions = {
        triggerShock: async () => {
          await setExpression("shocked", 1, { duration: 0.25 });
          await new Promise((r) => setTimeout(r, 600));
          await revertToBasis();
          syncSliders();
        },
        triggerHappy: async () => {
          await setExpression("happy", 1, { duration: 0.3 });
          await new Promise((r) => setTimeout(r, 600));
          await revertToBasis();
          syncSliders();
        },
        triggerWink: async () => {
          await wink();
          syncSliders();
        },
        triggerGlance: async () => {
          await glance(Math.random() < 0.5 ? -22 : 22, { pitchDeg: -4 });
        },
        resetToBasis: async () => {
          await revertToBasis(0.3);
          syncSliders();
        },
      };

      fExpr
        .add(exprState, "shocked", 0, 1, 0.01)
        .name("Shocked level")
        .onChange(writeInfluence("shocked"));
      fExpr
        .add(exprState, "happy", 0, 1, 0.01)
        .name("Happy level")
        .onChange(writeInfluence("happy"));
      fExpr
        .add(exprState, "wink", 0, 1, 0.01)
        .name("Wink level")
        .onChange(writeInfluence("wink"));
      fExpr.add(exprActions, "triggerShock").name("→ Shock! (auto-revert)");
      fExpr.add(exprActions, "triggerHappy").name("→ Happy! (auto-revert)");
      fExpr.add(exprActions, "triggerWink").name("→ Wink! (rapid)");
      fExpr.add(exprActions, "triggerGlance").name("→ Glance (side look)");
      fExpr.add(exprActions, "resetToBasis").name("↺ Reset to Basis");
      fExpr.open(true);

      // ── Motion ─────────────────────────────────────────────────────────
      const fMotion = gui.addFolder("⤳ Motion");
      fMotion
        .add(guiParams, "followLerp", 0.01, 0.3, 0.005)
        .name("Mouse follow");
      fMotion.add(guiParams, "posLerp", 0.01, 0.2, 0.005).name("Pos lerp");
      fMotion
        .add(guiParams, "gazeStrength", 0, 1.5, 0.05)
        .name("Gaze strength");
      fMotion.add(guiParams, "gazeDepth", 200, 1200, 10).name("Gaze depth");
      fMotion
        .add(guiParams, "gazePinnedDamp", 0, 1, 0.05)
        .name("Gaze (pinned)");
      fMotion.add(guiParams, "tiltLerp", 0.01, 0.2, 0.005).name("Tilt speed");
      fMotion.open(false);

      // ── Ambient life ───────────────────────────────────────────────────
      const fAmbient = gui.addFolder("≋ Ambient life");
      fAmbient.add(guiParams, "idleFloatAmp", 0, 20, 0.5).name("Float amp");
      fAmbient.add(guiParams, "idleSwayDeg", 0, 8, 0.1).name("Sway (deg)");
      fAmbient.add(guiParams, "breathAmp", 0, 0.08, 0.002).name("Breath amp");
      fAmbient.add(guiParams, "breathFreq", 0.05, 1, 0.01).name("Breath Hz");
      fAmbient.add(guiParams, "scrollLagMult", 0, 4, 0.1).name("Scroll lag");
      fAmbient.add(guiParams, "scrollLagMax", 0, 120, 1).name("Lag clamp");
      fAmbient.open(true);

      // ── Rotation ──────────────────────────────────────────────────
      const fRot = gui.addFolder("↺ Rotation");
      fRot.add(guiParams, "rotX", -180, 180, 1).name("Rot X");
      fRot.add(guiParams, "rotY", -180, 180, 1).name("Rot Y");
      fRot.add(guiParams, "rotZ", -180, 180, 1).name("Rot Z");

      // Live-tune the yaw / pitch of the currently tracked element (writes
      // to its data-smiley-yaw / data-smiley-pitch attributes, picked up by
      // animate() each frame). Useful to dial in "look-at-X" framing per anchor.
      const trackedRotState = { trackedYaw: 0, trackedPitch: 0 };
      const refreshTrackedRot = () => {
        if (trackedEl) {
          const yaw = parseFloat(trackedEl.dataset.smileyYaw);
          const pitch = parseFloat(trackedEl.dataset.smileyPitch);
          trackedRotState.trackedYaw = Number.isNaN(yaw) ? 0 : yaw;
          trackedRotState.trackedPitch = Number.isNaN(pitch) ? 0 : pitch;
          fRot.controllers.forEach((c) => c.updateDisplay());
        }
      };
      fRot
        .add(trackedRotState, "trackedYaw", -90, 90, 1)
        .name("Tracked yaw")
        .onChange((v) => {
          if (trackedEl) {
            trackedEl.dataset.smileyYaw = String(v);
            forceRender = true;
          }
        });
      fRot
        .add(trackedRotState, "trackedPitch", -90, 90, 1)
        .name("Tracked pitch")
        .onChange((v) => {
          if (trackedEl) {
            trackedEl.dataset.smileyPitch = String(v);
            forceRender = true;
          }
        });
      refreshTrackedRot();
      fRot.open(true);

      // ── Color ──────────────────────────────────────────────────────────
      gui
        .addColor(guiParams, "color")
        .name("Body color")
        .onChange((v) => {
          for (const m of meshes)
            if (!isFeature(m.name)) m.material.uniforms.uColor.value.set(v);
          // Morph particles share the same yellow — keep them in sync
          morphMesh?.material.uniforms.uColor.value.set(v);
        });
      gui
        .addColor(guiParams, "featureColor")
        .name("Face color")
        .onChange((v) => {
          for (const m of featureMeshes) m.material.color.set(v);
        });

      // ── Tooltips ───────────────────────────────────────────────────────
      // Native browser tooltips (title attr) keyed by display name — shown
      // on hover over any slider label.
      const TIPS = {
        // ◈ Appearance
        "Pixel size": "Taille des cellules en mode surface (UV) — sans effet si Screen-space px est ON",
        "Edge width": "Épaisseur de la zone de dissolution au bord (fresnel). Plus large = bord plus rongé",
        "Solid start": "Début du cœur plein. Plus haut = cœur plus petit, plus de spray",
        "Solid end": "Fin du dégradé du cœur. Plus bas = cœur plus dur/net",
        "Coarse layer": "Taille de la 2e couche de grosses cellules qui casse la régularité du damier",
        "Tracking size": "Échelle du smiley quand il est ancré à un élément DOM",
        "Hover offset": "Amplitude du décalage organique vers le curseur en mode tracking",
        "Dissolve (test)": "Pilote la désagrégation à la main (0 = intact, 1 = dispersé) — pour figer un stade",
        "Screen-space px": "ON : cellules carrées alignées écran (même matière que particules/grille). OFF : cellules collées sur la sphère, courbées par la 3D",
        "Matter grain (px)": "L'ATOME de matière : taille d'un pixel en px écran, commune à la boule ET aux particules du vol (clampée sur les toutes petites boules)",
        // ✦ Morph flight
        "Arc sag": "Affaissement des trajectoires de vol (la gravité du flux, en unités monde)",
        "Wobble": "Amplitude de la serpentine des particules en vol",
        "Drift": "Dérive lente le long de l'axe de vol (vie du nuage)",
        "Shimmer": "Fraction de pixels qui clignotent en vol (flicker discret, jamais de scale continu)",
        "Crawl speed": "Vitesse de vie du nuage quand le scroll est parké (rampement de phase)",
        "Exit teaser": "Érosion du bord haut quand la boule sort du viewport (l'avant-goût du tour)",
        "Trail boost": "Intensité de l'érosion directionnelle de la boule pendant le morph (les barres)",
        "Scrub (test)": "Pilote le vol complet à la main, image par image — le banc de réglage au pixel",
        // ↝ Trail & shimmer
        "Stretch": "Étirement des cellules dans le sens du déplacement (traînée)",
        "Edge bias": "Asymétrie avant/arrière de la dissolution — l'effet comète",
        "Flicker (motion)": "Vitesse de clignotement des cellules quand la boule bouge",
        "Idle breath amp": "Respiration du bord dissous au repos (0 = off)",
        "Idle breath Hz": "Fréquence de cette respiration (souffles/seconde)",
        "Idle shimmer (noise)": "Bruit de fond des cellules à l'arrêt total",
        "Velo → trail": "Sensibilité : combien la vitesse nourrit la traînée",
        "Rise speed": "Attaque de la traînée (montée)",
        "Decay speed": "Retombée de la traînée après l'arrêt",
        // ☻ Expressions
        "Shocked level": "Blend direct de la shape key choquée (0-1)",
        "Happy level": "Blend direct du sourire élargi (0-1)",
        "Wink level": "Blend direct du clin d'œil (0-1)",
        "→ Shock! (auto-revert)": "Joue l'expression choquée puis revient au sourire",
        "→ Happy! (auto-revert)": "Joue le grand sourire puis revient",
        "→ Wink! (rapid)": "Clin d'œil rapide (ferme-tient-rouvre)",
        "→ Glance (side look)": "Le geste signature : coup d'œil + penché de tête Pixar",
        "↺ Reset to Basis": "Remet toutes les shape keys à zéro",
        // ⤳ Motion
        "Mouse follow": "Lerp du suivi de position du curseur (plus haut = plus collant)",
        "Pos lerp": "Inertie du corps vers sa cible",
        "Gaze strength": "Force du regard vers le curseur (0.8 ≈ ±23° max)",
        "Gaze depth": "Profondeur virtuelle du regard — plus bas = tourne plus fort pour un même écart",
        "Gaze (pinned)": "Amorti du regard quand une pose est épinglée (ex. page contact)",
        "Tilt speed": "Réactivité de la rotation de tête (lissage)",
        // ≋ Ambient life
        "Float amp": "Amplitude de la dérive flottante au repos (Lissajous)",
        "Sway (deg)": "Balancement de rotation au repos (3 octaves incommensurables)",
        "Breath amp": "Profondeur de la respiration (scale + posture couplées)",
        "Breath Hz": "Rythme respiratoire (inspiration active, expiration lente)",
        "Scroll lag": "Force de la traînée à contre-sens du scroll",
        "Lag clamp": "Décalage maximal autorisé par le scroll",
        // ↺ Rotation
        "Rot X": "Pose de base : tangage (positif = penche vers le bas)",
        "Rot Y": "Pose de base : lacet (positif = regarde à droite)",
        "Rot Z": "Pose de base : roulis (penché de tête)",
        "Tracked yaw": "Lacet épinglé en tracking — règle ici, reporte dans data-smiley-yaw (rester ≤ ±20°)",
        "Tracked pitch": "Tangage épinglé en tracking — reporte dans data-smiley-pitch (rester ≤ ±20°)",
        "Body color": "Couleur du corps (sphère + particules du morph)",
        "Face color": "Couleur des yeux et de la bouche",
      };
      for (const c of gui.controllersRecursive()) {
        const tip = TIPS[c._name];
        if (tip) c.domElement.title = tip;
      }
    });
  }

  useRAFManager().register(rafId, animate);
};

// ─── Reduced motion: skip init entirely ────────────────────────────────────
const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Démarre le tracking temps réel d'un élément DOM.
 * La lecture de getBoundingClientRect() se fait dans animate(),
 * pas dans un gsap.ticker séparé.
 */
const startTracking = (el) => {
  // Set new tracking directly — skip stopTracking() to avoid a "free" frame
  isScrubbing.value = false;
  trackedEl = el;
  isTracking.value = true;
  mode.value = "tracking";
};

/**
 * Arrête le tracking et repasse en mode mouse-follow.
 */
const stopTracking = () => {
  trackedEl = null;
  isTracking.value = false;
  mode.value = "free";
};

// SmileyAPI-compatible aliases — used by useSmiley() composable
// startTracking / stopTracking kept for backward compat (About.vue uses them directly)
const track = startTracking;
const release = stopTracking;

/**
 * Set world-space position directly — used by scroll-scrub animations.
 * GSAP tween calls this in onUpdate; animate() renders the result.
 */
const setScrubPosition = (x, y, s) => {
  scrubTarget.x = x;
  scrubTarget.y = y;
  scrubTarget.scale = s;
  if (!isScrubbing.value) {
    isScrubbing.value = true;
    isTracking.value = false;
    trackedEl = null;
    mode.value = "tracking";
  }
};

const clearScrub = () => {
  isScrubbing.value = false;
  mode.value = "free";
};

/** Current base position (before ambient offsets) in world units. */
const currentBase = () => {
  const usingBase = isTracking.value || isScrubbing.value;
  return {
    x: usingBase ? trackedBase.x : (mesh?.position.x ?? 0),
    y: usingBase ? trackedBase.y : (mesh?.position.y ?? 0),
  };
};

/**
 * A virtual anchor standing exactly where the ball is NOW (fixed viewport
 * rect, no data attrs), sized so the tracking formula reproduces the
 * current baseScale exactly — the departure slot of a page-transition
 * flight. Both flight ends go through the same trackingScale path, so
 * lattice parity is exact and there is no size jump at t=0.
 */
const getSelfAnchor = () => {
  if (!renderer || !camera || !mesh) return null;
  const cw = renderer.domElement.clientWidth || window.innerWidth;
  const ch = renderer.domElement.clientHeight || window.innerHeight;
  const { x, y } = currentBase();
  const sizePx =
    ((baseScale / guiParams.trackingScale) * 2 * ch) / viewportWorldH;
  const rect = {
    left: (x / (viewportWorldH * camera.aspect) + 0.5) * cw - sizePx / 2,
    top: (0.5 - y / viewportWorldH) * ch - sizePx / 2,
    width: sizePx,
    height: sizePx,
  };
  return { getBoundingClientRect: () => rect, dataset: {} };
};

/**
 * Freeze at the CURRENT world position/scale (page-transition hold).
 * Tracking would read anchors of a page about to detach; free mode would
 * drift to the cursor. Scrub mode parks the base while breath/hover life
 * keeps running — a moving hold, never true immobility. The hover offset
 * is subtracted here because the scrub branch re-adds it every frame.
 */
const hold = () => {
  if (!mesh) return;
  const ox = (followMouse.x - 0.5) * guiParams.hoverOffset;
  const oy = (followMouse.y - 0.5) * guiParams.hoverOffset;
  setScrubPosition(mesh.position.x - ox, mesh.position.y - oy, baseScale);
};

/** Case-insensitive lookup of a shape key index on the mouth mesh. */
const findMorphIdx = (name) => {
  if (!mouthMesh?.morphTargetDictionary) return undefined;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(mouthMesh.morphTargetDictionary)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
};

/**
 * Set a facial expression on the mouth mesh by tweening its shape-key influence.
 * Requires the GLB to have been exported with shape keys ("Basis" + named keys
 * like "smile", "shocked"). No-ops gracefully if no morph targets are present.
 *
 *   smiley.setExpression('shocked')             → exclusive: fade all others to 0
 *   smiley.setExpression('shocked', 0.5)        → exclusive, partial blend
 *   smiley.setExpression('shocked', 1, { exclusive: false })  → additive
 *   smiley.setExpression('shocked', 0)          → fade just shocked back
 */
const setExpression = (name, value = 1, opts = {}) => {
  if (!mouthMesh?.morphTargetDictionary || !mouthMesh.morphTargetInfluences) {
    return Promise.resolve();
  }
  const targetIdx = findMorphIdx(name);
  if (targetIdx === undefined) {
    console.warn(`[PixelBlob3] Unknown shape key: "${name}"`);
    return Promise.resolve();
  }
  const {
    duration = 0.4,
    ease = "back.out(1.6)",
    exclusive = true,
  } = opts;

  // Build the target-property map: one entry per index to animate.
  // Single gsap.to() call → all indices animate in parallel without
  // mutual overwriting (which would happen with separate tweens on the
  // same underlying array).
  const tweenProps = {
    [targetIdx]: value,
    duration,
    ease,
    // "auto" kills only tweens touching the SAME indices — a blanket `true`
    // would kill every in-flight morph tween on the shared influences array
    // (their promises would hang without onInterrupt, starving the ambient
    // scheduler chains).
    overwrite: "auto",
    onUpdate: () => {
      forceRender = true;
    },
  };

  if (exclusive && value > 0) {
    for (const idx of Object.values(mouthMesh.morphTargetDictionary)) {
      if (idx === targetIdx) continue;
      tweenProps[idx] = 0;
    }
  }

  return new Promise((resolve) => {
    tweenProps.onComplete = resolve;
    tweenProps.onInterrupt = resolve;
    gsap.to(mouthMesh.morphTargetInfluences, tweenProps);
  });
};

/**
 * Rapid wink: snappy close → brief hold → smooth re-open.
 * Additive (doesn't touch other shape keys). Fire-and-forget.
 *
 *   smiley.wink()                                 → default snappy wink
 *   smiley.wink({ holdDuration: 0.2 })            → slower, more emphasized
 */
const wink = (opts = {}) => {
  if (!mouthMesh?.morphTargetDictionary || !mouthMesh.morphTargetInfluences) {
    return Promise.resolve();
  }
  const idx = findMorphIdx("wink");
  if (idx === undefined) {
    console.warn('[PixelBlob3] Wink shape key not found in GLB');
    return Promise.resolve();
  }
  const {
    closeDuration = 0.08,
    holdDuration = 0.08,
    openDuration = 0.2,
  } = opts;

  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve, onInterrupt: resolve });
    tl.to(mouthMesh.morphTargetInfluences, {
      [idx]: 1,
      duration: closeDuration,
      ease: "power2.in",
      onUpdate: () => {
        forceRender = true;
      },
    });
    if (holdDuration > 0) {
      tl.to({}, { duration: holdDuration });
    }
    tl.to(mouthMesh.morphTargetInfluences, {
      [idx]: 0,
      duration: openDuration,
      ease: "power3.out",
      onUpdate: () => {
        forceRender = true;
      },
    });
  });
};

/**
 * Set the dissolve amount directly (0 = intact, 1 = dispersed/invisible).
 * Kills any dissolveTo() in flight — single owner of dissolveState.
 */
const setDissolve = (v) => {
  dissolveTl?.kill();
  dissolveState.v = Math.min(1, Math.max(0, v));
  scrubTrail = 0;
  forceRender = true;
};

/**
 * Pixel comet: the smiley scatters into a loose pixel cloud where it
 * stands (face fades first), then the cloud STREAMS across the screen to
 * the target — the velocity→trail pipeline stretches the sparse cells
 * along the flight for free — and recondenses on arrival, tracking the
 * element. Killable/chainable — a reversal mid-flight retweens from the
 * current state, no snap. Fire-and-forget.
 *
 *   smiley.dissolveTo(placeholderEl)
 *   smiley.dissolveTo(heroEl, { travelDuration: 0.9 })
 */
const dissolveTo = (el, opts = {}) => {
  const {
    outDuration = 0.35,
    travelDuration = 0.65,
    inDuration = 0.6,
  } = opts;

  dissolveTl?.kill();
  return new Promise((resolve) => {
    const from = { x: 0, y: 0, s: props.radius };
    const travel = { t: 0 };
    dissolveTl = gsap.timeline({
      onComplete: resolve,
      onInterrupt: resolve,
      onUpdate: () => {
        forceRender = true;
      },
    });
    dissolveTl
      // 1 — scatter in place: the face dies, the ball loosens into cells
      .to(dissolveState, {
        v: 0.85,
        duration: outDuration,
        ease: "power2.in",
      })
      // 2 — comet flight: capture the departure point, then stream the
      // dissolved cloud to the target. The target rect is read LIVE each
      // tick (it scrolls during the flight); the position delta feeds the
      // velocity pipeline → cells stretch along the flight path.
      .call(() => {
        from.x = mesh.position.x;
        from.y = mesh.position.y;
        from.s = baseScale;
      })
      .to(travel, {
        t: 1,
        duration: travelDuration,
        ease: "power2.inOut",
        onUpdate: () => {
          if (!renderer || !camera) return;
          const cw = renderer.domElement.clientWidth || window.innerWidth;
          const ch = renderer.domElement.clientHeight || window.innerHeight;
          const { x, y, worldSize } = domRectToWorld(
            el.getBoundingClientRect(),
            camera,
            cw,
            ch,
          );
          const localMul = parseFloat(el.dataset.smileyScale) || 1;
          const ts = (worldSize / 2) * guiParams.trackingScale * localMul;
          const k = travel.t;
          setScrubPosition(
            from.x + (x - from.x) * k,
            from.y + (y - from.y) * k,
            from.s + (ts - from.s) * k,
          );
        },
      })
      // 3 — land: hand off to live tracking, pixels catch up into place
      .call(() => {
        startTracking(el);
      })
      .to(dissolveState, { v: 0, duration: inDuration, ease: "power3.out" });
  });
};

// Live morph state — morphScrub() only records the scrub progress; ALL
// motion is computed in animate() every frame, so the swarm keeps living
// (time-driven wobble, drift, shimmer) even when the scroll is parked
// mid-flight — matching the sphere shader's ever-flickering cells.
const morphState = {
  active: false,
  t: 0,
  tStart: 0,
  fromEl: null,
  toEl: null,
  gated: true,
};
let scrubTrail = 0; // directional-erosion boost on uTrail during the morph

/**
 * Scrub-driven pixel transmogrification between two DOM anchors.
 * t=0 → intact ball tracking `fromEl`; t=1 → intact ball tracking `toEl`.
 * Call every scrub tick with the live progress — rendering runs per-frame.
 *
 * opts.gated (default true) = the magician's clock: the swarm only pours
 * once the departure ball has scrolled OUT of the viewport (scroll-driven
 * morphs infer the dissolve off-screen). gated:false = the whole journey
 * plays ON SCREEN (page-transition flight): the ball erodes in place, its
 * pixels arc across, it reforms at the target — both ends visible.
 */
const morphScrub = (t, fromEl, toEl, opts = {}) => {
  morphState.t = t;
  morphState.fromEl = fromEl;
  morphState.toEl = toEl;
  morphState.gated = opts.gated !== false;
  morphState.active = t > 0.001 && t < 0.999 && !!fromEl && !!toEl;
  if (!morphState.active) {
    // Reset the internal clock ONLY when leaving through the START.
    // Leaving through the END must keep tStart: scrolling back re-enters
    // with the same clock, so the return plays the exact mirror of the
    // forward journey — the B→A position swap stays off-screen. Wiping it
    // here was the "teleport on the way back" bug.
    if (t < 0.5) morphState.tStart = 0;
    scrubTrail = 0;
    if (morphMesh) morphMesh.visible = false;
  }
  forceRender = true;
};

// Per-frame morph update — called from animate() while morphState.active.
// Path position is a pure function of scrub t (reversible, parkable);
// wobble/drift/shimmer are functions of TIME so the swarm never freezes.
const updateMorph = (timeSec) => {
  if (!renderer || !camera || !mesh) return;
  ensureMorphParticles();

  const t = morphState.t;
  const cw = renderer.domElement.clientWidth || window.innerWidth;
  const ch = renderer.domElement.clientHeight || window.innerHeight;
  const A = domRectToWorld(
    morphState.fromEl.getBoundingClientRect(),
    camera,
    cw,
    ch,
  );
  const B = domRectToWorld(
    morphState.toEl.getBoundingClientRect(),
    camera,
    cw,
    ch,
  );
  const mulA = parseFloat(morphState.fromEl.dataset.smileyScale) || 1;
  const mulB = parseFloat(morphState.toEl.dataset.smileyScale) || 1;
  // rA/rB are SCALE units (fed to setScrubPosition); rAv/rBv are the
  // VISUAL radii — what the shader disc actually covers on screen — used
  // for the exit gate, the lattice slots, the grain and the z bulge.
  const rA = (A.worldSize / 2) * guiParams.trackingScale * mulA;
  const rB = (B.worldSize / 2) * guiParams.trackingScale * mulB;
  const rAv = rA * geoRadius;
  const rBv = rB * geoRadius;

  morphTravel.set(B.x - A.x, B.y - A.y);
  const dist = morphTravel.length() || 1;
  morphTravel.divideScalar(dist);
  const perpX = -morphTravel.y;
  const perpY = morphTravel.x;

  // ── The magician's clock ───────────────────────────────────────────
  // Never show both languages at once: while the ball at A is on screen
  // it stays INTACT and simply scrolls out with the page. The particle
  // stream only begins once the ball has left the viewport (e→1) — it
  // pours in from above the fold, and the viewer infers the dissolve
  // happened off-screen. tm is the morph's internal clock, remapped to
  // the scroll remaining after the exit; the gate eases it continuously
  // so reverse-scrub re-entry never pops.
  const vh2 = viewportWorldH / 2;
  const gated = morphState.gated;
  const e = gated ? sstep(vh2 - rAv, vh2 + rAv * 0.8, A.y) : 1; // 0 visible … 1 out
  if (gated && e < 0.995) morphState.tStart = t;
  const gate = gated ? sstep(0.75, 0.98, e) : 1;
  const tm = gated
    ? Math.min(
        1,
        Math.max(
          0,
          (t - morphState.tStart) / Math.max(0.05, 1 - morphState.tStart),
        ),
      ) * gate
    : t;

  // The ball never travels: intact at A until off-screen (a whisper of
  // top-edge erosion as it exits foreshadows the trick), then reassembles
  // at B as the pixels land. velocityDir re-aims the shader's directional
  // spray along the travel axis so the arrival builds like a comet.
  const atA = tm < 0.35;
  setScrubPosition(atA ? A.x : B.x, atA ? A.y : B.y, atA ? rA : rB);
  velocityDir.x = atA ? -morphTravel.x : morphTravel.x;
  velocityDir.y = atA ? -morphTravel.y : morphTravel.y;
  dissolveTl?.kill();
  // Departure erosion: gated flights only tease the top edge (the real
  // dissolve is inferred off-screen); ungated flights erode the WHOLE
  // ball on screen — fully dispersed just before the invisible A→B swap
  // at tm 0.35, so the airborne pixels alone carry the continuity.
  dissolveState.v = atA
    ? gated
      ? guiParams.morphExitTeaser * e
      : sstep(0.04, 0.32, tm)
    : 1 - sstep(0.35, 0.95, tm);
  scrubTrail =
    guiParams.morphTrailBoost * dissolveState.v * (1 - dissolveState.v);

  // ── Particle swarm (runs on the remapped clock) ────────────────────
  const show = tm > 0.01 && tm < 0.985;
  morphMesh.visible = show;
  if (show && morphData) {
    const d = morphData;
    // One matter: particles are whole pixels of the SAME screen grain as
    // the sphere's cells, and they launch from / dock into SLOTS of the
    // ball's own lattice. The lattice of the ball currently on screen is
    // anchored at the LIVE mesh position (hover offset included) so a
    // landed pixel sits exactly on the grid the reassembling ball paints.
    const worldPerPx = viewportWorldH / ch;
    const cellA = matterGrainPx(rAv / worldPerPx) * worldPerPx;
    const cellB = matterGrainPx(rBv / worldPerPx) * worldPerPx;
    const anchorAX = atA ? mesh.position.x : A.x;
    const anchorAY = atA ? mesh.position.y : A.y;
    const anchorBX = atA ? B.x : mesh.position.x;
    const anchorBY = atA ? B.y : mesh.position.y;
    const snap = (v, cell) => (Math.floor(v / cell) + 0.5) * cell;
    for (let i = 0; i < MORPH_COUNT; i++) {
      const i3 = i * 3;
      const dax = d.dirA[i3];
      const day = d.dirA[i3 + 1];
      // One law of matter, time-symmetric: pixels leave from the face
      // NEAREST the destination first (kA→0 = facing B), and seat on the
      // face FARTHEST from the source first (kB→0) — so the reforming
      // ball's open seam always faces the incoming stream.
      const kA =
        0.5 - 0.5 * (dax * morphTravel.x + day * morphTravel.y);
      const kB =
        0.5 -
        0.5 * (d.dirB[i3] * morphTravel.x + d.dirB[i3 + 1] * morphTravel.y);
      const t0 = 0.02 + 0.1 * d.stag[i] + 0.22 * kA; // launch ∈ [0.02, 0.34]
      const t1 = 0.45 + 0.12 * d.stag[i] + 0.28 * kB; // dock ∈ [0.45, 0.85]
      const p = sstep(t0, Math.max(t0 + 0.25, t1), tm);

      // Departure / arrival = SLOTS on the two balls' pixel lattices —
      // a pixel lifts off from its own grid cell and seats into a grid
      // cell of the reformed ball, never in between.
      const ax = anchorAX + snap(dax * rAv, cellA);
      const ay = anchorAY + snap(day * rAv, cellA);
      const bx = anchorBX + snap(d.dirB[i3] * rBv, cellB);
      const by = anchorBY + snap(d.dirB[i3 + 1] * rBv, cellB);
      // Flight-shaped motion: individual arc + serpentine wobble whose
      // phase CRAWLS with time (the parked swarm keeps undulating), + a
      // slow along-travel drift — all zero at the endpoints.
      // Ungated (page-transition) flights damp the droop hard: the stream
      // must read as a STRAIGHT A→B current (never leaving the screen,
      // never a detour) — the ribbon stagger and the steady tween pace do
      // the "scroll morph" feel, not the trajectory.
      const flight = Math.sin(p * Math.PI);
      const arc =
        -flight *
        guiParams.morphArcSag *
        d.sag[i] *
        (morphState.gated ? 1 : 0.35);
      const wob =
        Math.sin(
          p * d.wobFreq[i] * Math.PI * 2 +
            d.wobPhase[i] +
            timeSec * guiParams.morphCrawl,
        ) *
        d.wobAmp[i] *
        guiParams.morphWobble *
        flight;
      const drift =
        Math.sin(timeSec * 1.1 + d.wobPhase[i] * 3.0) *
        guiParams.morphDrift *
        flight;

      morphDummy.position.set(
        ax +
          (bx - ax) * p +
          perpX * wob +
          morphTravel.x * drift,
        ay +
          (by - ay) * p +
          perpY * wob +
          morphTravel.y * drift +
          arc,
        // z bulge only mid-flight: both endpoints stay on the z=0 plane
        // so the projected pixel lands EXACTLY on its lattice slot (a z
        // offset would parallax-shift and rescale it off the grid).
        (d.dirA[i3 + 2] + (d.dirB[i3 + 2] - d.dirA[i3 + 2]) * p) *
          (rAv + (rBv - rAv) * p) *
          flight,
      );
      // A pixel is binary matter: it POPS at full size on launch and
      // vanishes as it seats — the same language as the shader's hash
      // spray. In flight, a small fraction blink off for one tick (hash
      // flicker, like the sphere's cells) — never a continuous breath.
      const tick = Math.floor(timeSec * 8 + d.stag[i] * 8);
      const hb = Math.sin(i * 127.1 + tick * 311.7) * 43758.5;
      const blink =
        hb - Math.floor(hb) < guiParams.morphShimmer * 0.45 * flight ? 0 : 1;
      const airborne = p > 0.0001 && p < 0.9999 ? 1 : 0;
      morphDummy.scale.setScalar(
        Math.max(
          1e-4,
          airborne * blink * d.size[i] * (cellA + (cellB - cellA) * p),
        ),
      );
      morphDummy.updateMatrix();
      morphMesh.setMatrixAt(i, morphDummy.matrix);
    }
    morphMesh.instanceMatrix.needsUpdate = true;
  }
  forceRender = true;
};

// Single owner of glanceState — a new gesture kills the previous timeline
// and tweens from current values (continuous, no snap).
let glanceTl = null;

/**
 * Pixar-style head cock, five acts on one timeline:
 * anticipation gather → yaw leads / pitch follows / roll trails & hangs on
 * its overshoot plateau (the signature) → velocity-slaved stretch →
 * moving hold ("listening" drift) → asymmetric return, roll last out with
 * a single soft counter-sway.
 * Beats join at zero velocity — no overwrite juggling needed. The tween
 * writes glanceState only; animate() adds it raw on top of the smoothed
 * base rotation, so mouse tilt keeps working during the glance.
 *
 *   smiley.glance(22)                              → curious look right
 *   smiley.glance(-20, { pitchDeg: -5 })           → look left, slightly up
 *   smiley.glance(5, { rollDeg: -14 })             → pure head-cock
 */
const glance = (yawDeg = 22, opts = {}) => {
  const {
    pitchDeg = 0,
    // Head tilts toward the side it looks at (negative z = clockwise on
    // screen for a positive/right yaw) — the "curious puppy" pose.
    rollDeg = -yawDeg * 0.55,
    holdDuration = 0.9,
    // Per-take tempo (±6% timeScale): genuine take-to-take variation
    // without touching the signature curves. Wider than 6% reads perky or
    // draggy against this character's languid personality.
    tempo = gsap.utils.random(0.94, 1.06),
    // Facial accents anchored to timeline positions ({at: seconds | 'return',
    // fn}) — they live and die WITH the gesture: a kill removes pending
    // accents atomically, tab-hidden pauses delay them in sync, and
    // timeScale keeps them on-beat (positions are timeline-local).
    accents = [],
  } = opts;

  const Y = yawDeg * DEG;
  const P = pitchDeg * DEG;
  const R = rollDeg * DEG;
  // Squash slaved to gesture size: a 5° cock whispers, a 26° glance pops.
  const squashAmp = Math.min(
    0.05,
    0.03 + (0.02 * Math.max(Math.abs(yawDeg), Math.abs(rollDeg))) / 28,
  );

  // ── Per-take variation — decided at BUILD time, never in-take tremor.
  // Amplitudes jitter; durations never (zero-velocity joins depend on them).
  const chinDip = gsap.utils.random(1.0, 2.0) * DEG;
  // Arc scoop: on wide, level/upward turns the head dips through the travel
  // (figure-8 lobe) — lowest just after it is fastest. Downward finals skip
  // it (would read as pitch overshoot); ~35% of side glances skip → free
  // take-to-take variety through omission.
  const scoop = Math.abs(yawDeg) >= 10 && P <= 0.5 * DEG;
  const dipAmp = scoop
    ? (0.8 + (1.2 * Math.min(Math.abs(yawDeg), 26)) / 26) *
      DEG *
      gsap.utils.random(0.8, 1.2)
    : 0;
  // Settle correction: most takes touch the pose twice (a beat, then a tiny
  // lock-on nudge); ~35% land clean so the correction never becomes its own
  // pattern.
  const settle = holdDuration >= 0.85 && Math.random() < 0.65;
  const nudge = settle ? gsap.utils.random(0.012, 0.025) : 0;
  const yawDriftMult = gsap.utils.random(0.955, 0.985);
  const rollDriftMult = gsap.utils.random(1.05, 1.11);
  const craneDeg = gsap.utils.random(-1.4, -0.6);

  // Chained retarget (a glance is already in flight — e.g. hovering CTAs in
  // succession): kill and retween FROM current values, and skip the
  // anticipation — the gather is the charm of a gesture from rest, but on a
  // retarget it reads as stutter. Direct feedback must be immediate.
  const chained = !!glanceTl?.isActive();
  const t0 = chained ? 0 : 0.18; // when the turn starts
  const poseLands = t0 + 0.63; // roll landing — accent anchor "pose"
  const returnAt = poseLands + holdDuration; // accent anchor "return"

  glanceTl?.kill();
  return new Promise((resolve) => {
    glanceTl = gsap.timeline({
      onComplete: resolve,
      onInterrupt: resolve,
      // Plateau hang, moving hold and settle tail move ~0.0002 rad/frame —
      // below the dirty-check epsilon. Force render so they never step.
      onUpdate: () => {
        forceRender = true;
      },
    });

    // 1 — anticipation: gather + counter-tilt, compress into the neck.
    // Yaw counter skipped on pure head-cocks (reads as jitter under 10°).
    if (!chained) {
      glanceTl.to(
        glanceState,
        {
          yaw:
            Math.abs(yawDeg) >= 10 ? Y * gsap.utils.random(-0.09, -0.15) : 0,
          roll: R * gsap.utils.random(-0.14, -0.22),
          pitch: chinDip,
          squash: gsap.utils.random(-0.014, -0.022),
          duration: 0.18,
          ease: "sine.inOut",
        },
        0,
      );
    }
    // 2 — turn: yaw leads (eyes direct attention first), whisper overshoot
    glanceTl.to(glanceState, { yaw: Y, duration: 0.42, ease: "joyeTurn" }, t0);
    // 3 — pitch: arc scoop through wide turns (bottoms ~40ms after peak yaw
    // velocity — drag), or the straight decisive ease on head-cocks.
    // Deliberately no overshoot either way (three overshooting axes = jelly).
    if (scoop) {
      glanceTl.to(
        glanceState,
        { pitch: chinDip + dipAmp, duration: 0.15, ease: "sine.inOut" },
        t0 + 0.02,
      );
      glanceTl.to(
        glanceState,
        { pitch: P, duration: 0.35, ease: "power2.inOut" },
        t0 + 0.17,
      );
    } else {
      glanceTl.to(
        glanceState,
        { pitch: P, duration: 0.5, ease: "power3.out" },
        t0 + 0.02,
      );
    }
    // 4 — roll trails 80ms behind, lasts longer, hangs on its plateau —
    // the trailing tilt traces an arc: the curious-puppy tell
    glanceTl.to(
      glanceState,
      { roll: R, duration: 0.55, ease: "joyeCock" },
      t0 + 0.08,
    );
    // 5 — stretch springs from the gather, peaking at max angular velocity
    glanceTl.to(
      glanceState,
      { squash: squashAmp, duration: 0.18, ease: "sine.out" },
      t0,
    );
    // 6 — stretch fully gone a hair before the pose lands: the held pose
    // is a clean sphere
    glanceTl.to(
      glanceState,
      { squash: 0, duration: 0.44, ease: "power2.inOut" },
      t0 + 0.18,
    );
    // 7 — moving hold, per channel: roll sinks deeper, pitch cranes toward
    // the viewer ("listening", never frozen), and yaw either locks on with
    // a settle nudge after a 0.12s beat, or relaxes in one motion.
    glanceTl.to(
      glanceState,
      { roll: R * rollDriftMult, duration: holdDuration, ease: "sine.inOut" },
      poseLands,
    );
    glanceTl.to(
      glanceState,
      { pitch: P + craneDeg * DEG, duration: holdDuration, ease: "sine.inOut" },
      poseLands,
    );
    if (settle) {
      glanceTl.to(
        glanceState,
        { yaw: Y * (1 + nudge), duration: 0.26, ease: "sine.inOut" },
        poseLands + 0.12,
      );
      glanceTl.to(
        glanceState,
        {
          yaw: Y * yawDriftMult,
          duration: holdDuration - 0.38,
          ease: "sine.inOut",
        },
        poseLands + 0.38,
      );
    } else {
      glanceTl.to(
        glanceState,
        { yaw: Y * yawDriftMult, duration: holdDuration, ease: "sine.inOut" },
        poseLands,
      );
    }
    // 8 — return: heavier than the outbound (energy dissipated). Absolute
    // anchor: with per-channel hold tweens, ">" would be insertion-order
    // dependent.
    glanceTl.to(
      glanceState,
      { yaw: 0, pitch: 0, duration: 0.8, ease: "joyeRelease" },
      returnAt,
    );
    // 9 — roll last in, last out: crosses neutral ~4% once and lands dead —
    // the closing punctuation of the gesture
    glanceTl.to(
      glanceState,
      { roll: 0, duration: 0.95, ease: "joyeSettle" },
      returnAt + 0.1,
    );

    // Facial accents ride the timeline itself: paused with it (hidden tab),
    // killed with it (interrupt) — never a wall-clock timer. Semantic
    // anchors resolve against THIS take's timing (chained takes land early).
    for (const a of accents) {
      const pos =
        a.at === "pose"
          ? poseLands
          : a.at === "hold"
            ? poseLands + 0.2
            : a.at === "return"
              ? returnAt
              : a.at;
      glanceTl.call(a.fn, [], pos);
    }

    glanceTl.timeScale(tempo);
  });
};

defineExpose({
  startTracking,
  stopTracking,
  isTracking,
  track,
  release,
  mode,
  setScrubPosition,
  clearScrub,
  hold,
  getSelfAnchor,
  setExpression,
  wink,
  glance,
  setDissolve,
  getDissolve: () => dissolveState.v,
  // Ball center + visual radius in viewport CSS px (y top-down) — lets the
  // page transition seed its radial wall wavefront on the character.
  getScreenPosition: () => {
    if (!renderer || !camera || !mesh) return null;
    const cw = renderer.domElement.clientWidth || window.innerWidth;
    const ch = renderer.domElement.clientHeight || window.innerHeight;
    return {
      x: (mesh.position.x / (viewportWorldH * camera.aspect) + 0.5) * cw,
      y: (0.5 - mesh.position.y / viewportWorldH) * ch,
      r: ((mesh.scale.y * geoRadius) / viewportWorldH) * ch,
    };
  },
  dissolveTo,
  morphScrub,
  getCamera: () => camera,
  getRenderer: () => renderer,
});

onMounted(() => {
  if (prefersReducedMotion.matches) return; // skip Three.js entirely
  init();
});

onBeforeUnmount(() => {
  useRAFManager().unregister(rafId);
  stopTracking();
  glanceTl?.kill();
  dissolveTl?.kill();
  gui?.destroy();
  window.removeEventListener("resize", debouncedResize);
  window.removeEventListener("pointermove", onPointerMove);
  renderer?.domElement?.removeEventListener("webglcontextlost", onContextLost);
  renderer?.domElement?.removeEventListener(
    "webglcontextrestored",
    onContextRestored,
  );
  for (const m of [...meshes, ...featureMeshes]) {
    m.geometry?.dispose();
    m.material?.dispose();
  }
  morphMesh?.geometry?.dispose();
  morphMesh?.material?.dispose();
  renderer?.dispose();
  renderer?.domElement?.parentNode?.removeChild(renderer.domElement);
});
</script>

<style scoped>
.pixel-blob {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none; /* laisse passer les clics au contenu en dessous */
  /* Au-dessus du mur de pixels (PixelGridOverlay, 9999) : pendant une
     transition le smiley reste visible et voyage PAR-DESSUS la grid —
     il est l'acteur de la transition, jamais enseveli sous elle. */
  z-index: 10000;
}
</style>
