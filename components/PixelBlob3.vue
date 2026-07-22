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
  // ── Ambient life (always-on, all modes)
  idleFloatAmp: 7, // world-units Lissajous drift amplitude
  idleSwayDeg: 2, // slow rotation sway amplitude (degrees)
  breathAmp: 0.02, // scale pulsation (±2%)
  breathFreq: 0.25, // breaths per second (Hz)
  scrollLagMult: 1.2, // Lenis velocity (px/frame) → world-space drag
  scrollLagMax: 50, // clamp on the scroll drag offset
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

// ─── Shaders ───────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vUv      = uv;
    vNormal  = normalize(normalMatrix * normal);
    vec4 mvp = modelViewMatrix * vec4(position, 1.0);
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

  void main() {
    // Fresnel: 1 at center, 0 at silhouette
    float facing = max(0.0, dot(normalize(vNormal), -normalize(vViewPosition)));

    // Which side of the sphere is trailing?
    // +1 = leading edge (front of movement), -1 = trailing edge (back)
    vec2 velSafe   = normalize(uVeloDir + vec2(0.001));
    float trailDot = dot(normalize(vNormal.xy + vec2(0.001)), velSafe);
    float trailBias = (1.0 - trailDot) * 0.5; // 0 at leading, 1 at trailing

    // Trailing edge dissolves much more than leading edge
    float t = clamp(facing / (uEdgeWidth + uTrail * trailBias * uTrailBias), 0.0, 1.0);

    // ── Anisotropic cells: elongated along movement direction ─────────────
    vec2 velPerp  = vec2(-velSafe.y, velSafe.x);
    float uvAlong = dot(vUv - 0.5, velSafe);
    float uvPerp  = dot(vUv - 0.5, velPerp);

    // Cells stretch in movement direction proportionally to trail strength
    float psAlong = uPixelSize * (1.0 + uTrail * uTrailStretch);
    float psPerp  = uPixelSize;

    float cx  = floor(uvAlong / psAlong);
    float cy  = floor(uvPerp  / psPerp);

    // Second coarser layer offset to break regularity
    float cx2 = floor((uvAlong + psAlong * 0.7) / (psAlong * uCoarseRatio));
    float cy2 = floor((uvPerp  + psPerp  * 0.4) / (psPerp  * uCoarseRatio));

    float r1  = fract(sin(cx  * 127.1 + cy  * 311.7 + uTick * 57.3) * 43758.5);
    float r2  = fract(sin(cx2 * 269.5 + cy2 * 183.3 + uTick * 31.7) * 23421.6);
    float rnd = r1 * 0.65 + r2 * 0.35;

    float spray = step(1.0 - t, rnd);
    float solid = smoothstep(uSolidStart, uSolidEnd, t);

    gl_FragColor = vec4(uColor, max(solid, spray));
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
  // wants — single writer for mesh.scale, all modes stay alive.
  const s = baseScale * breathScale;
  const sq = glanceState.squash;
  mesh.scale.set(s * (1 - sq), s * (1 + sq), s);

  // Velocity tracking
  const vx = mesh.position.x - prevPos.x;
  const vy = mesh.position.y - prevPos.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  moveSpeed += (speed - moveSpeed) * 0.12;

  if (speed > 0.001) {
    const inv = 1.0 / speed;
    velocityDir.x += (vx * inv - velocityDir.x) * 0.15;
    velocityDir.y += (vy * inv - velocityDir.y) * 0.15;
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
  }

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
    m.material.uniforms.uTrail.value = trailStrength + idleBreath;

  // Tick: rapid scroll during motion, slow drift at rest.
  // Float (no Math.floor) so the noise pattern shifts continuously, multiplied
  // by dt so the speed is identical across 60fps / 120fps / 144fps screens.
  tickCounter +=
    (smoothVelo > 0.004
      ? smoothVelo * guiParams.flickerSpeed
      : guiParams.idleShimmer) * dt;
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
    Math.abs(tickCounter - prevRender.tick) > 1e-9;

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
        // Features → solid fill, no pixel effect
        child.material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(guiParams.featureColor),
          transparent: false,
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
        meshes.push(child);
      }
    });
    mesh.add(gltf.scene);
    // Basis is the default state (all morph influences = 0 by default).

    // Debug log — tells us what got loaded so we can see if the join broke things.
    if (typeof window !== "undefined") {
      const allMeshNames = [];
      gltf.scene.traverse((c) => {
        if (c.isMesh) allMeshNames.push(c.name);
      });
      console.log("[PixelBlob3] GLB loaded:", {
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
        });
      gui
        .addColor(guiParams, "featureColor")
        .name("Face color")
        .onChange((v) => {
          for (const m of featureMeshes) m.material.color.set(v);
        });
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
  setExpression,
  wink,
  glance,
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
  z-index: 100; /* au-dessus de tout sauf les éléments UI importants */
}
</style>
