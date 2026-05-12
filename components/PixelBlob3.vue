<template>
  <div ref="container" class="pixel-blob"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { gsap } from "gsap";
import modelUrl from "~/assets/3D/smileyV3.glb?url";
import { domRectToWorld } from "~/utils/domToWorld";
import { useRAFManager } from "~/composables/useRAFManager";
import { debounce } from "~/utils/debounce";
import { perfMonitor } from "~/utils/perfMonitor";

const props = defineProps({
  color: { type: Number, default: 0xffe15a },
  radius: { type: Number, default: 28 },
  followRange: { type: Number, default: 150 },
});

const container = ref(null);

let renderer, scene, camera, mesh, geometry, gui;
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
  idleBreathAmp: 0, // amplitude of the breath on uTrail (0 = off)
  idleBreathFreq: 0.4, // breaths per second (Hz)
  solidStart: 0.3,
  solidEnd: 3,
  trailBias: 1.5,
  coarseRatio: 1,
  // ── Motion
  followLerp: 0.3,
  posLerp: 0.2,
  tiltAmplY: 0.15,
  tiltAmplX: 0.6,
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
  useRAFManager().unregister("three");
};

const onContextRestored = () => {
  useRAFManager().register("three", animate);
};

// ─── Loop ──────────────────────────────────────────────────────────────────
const animate = (now) => {
  if (!renderer || renderer.getContext().isContextLost()) return;

  // dt = 1 means a 60fps frame (16.667 ms). At 120fps dt ≈ 0.5.
  // Capped at 3 so a tab-visibility resume doesn't make tickCounter jump.
  const dt =
    lastFrameNow === 0 ? 1 : Math.min((now - lastFrameNow) / 16.667, 3);
  lastFrameNow = now;

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
    trackedBase.x = x;
    trackedBase.y = y;
    trackedBase.scale = (worldSize / 2) * guiParams.trackingScale;
  }

  if (isTracking.value || isScrubbing.value) {
    // ── Tracking mode ─────────────────────────────────────────────────
    // followMouse lags gently behind the cursor (same lerp as free mode)
    followMouse.x += (mouse.x - followMouse.x) * guiParams.followLerp;
    followMouse.y += (mouse.y - followMouse.y) * guiParams.followLerp;

    // Small organic offset: cursor relative to viewport center
    const ox = (followMouse.x - 0.5) * guiParams.hoverOffset;
    const oy = (followMouse.y - 0.5) * guiParams.hoverOffset;

    // Base from DOM tracker + hover offset → real delta for velocity pipeline
    mesh.position.x = trackedBase.x + ox;
    mesh.position.y = trackedBase.y + oy;
    mesh.scale.setScalar(trackedBase.scale);
  } else {
    // ── Mouse follow mode ─────────────────────────────────────────────────
    followMouse.x += (mouse.x - followMouse.x) * guiParams.followLerp;
    followMouse.y += (mouse.y - followMouse.y) * guiParams.followLerp;

    const tx = (followMouse.x - 0.5) * props.followRange;
    const ty = (followMouse.y - 0.5) * props.followRange;
    mesh.position.x += (tx - mesh.position.x) * guiParams.posLerp;
    mesh.position.y += (ty - mesh.position.y) * guiParams.posLerp;
  }

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

  // Subtle tilt toward mouse
  const baseRotX = (guiParams.rotX * Math.PI) / 180;
  const baseRotY = (guiParams.rotY * Math.PI) / 180;
  const baseRotZ = (guiParams.rotZ * Math.PI) / 180;

  mesh.rotation.y +=
    (baseRotY + (followMouse.x - 0.5) * guiParams.tiltAmplY - mesh.rotation.y) *
    guiParams.tiltLerp;
  mesh.rotation.x +=
    (baseRotX +
      (followMouse.y - 0.5) * -guiParams.tiltAmplX -
      mesh.rotation.x) *
    guiParams.tiltLerp;
  mesh.rotation.z += (baseRotZ - mesh.rotation.z) * guiParams.tiltLerp;

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
          overwrite: true,
          onUpdate: () => {
            forceRender = true;
          },
        };
        for (const idx of Object.values(mouthMesh.morphTargetDictionary)) {
          props[idx] = 0;
        }
        return new Promise((resolve) => {
          props.onComplete = resolve;
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
      fExpr.add(exprActions, "resetToBasis").name("↺ Reset to Basis");
      fExpr.open(true);

      // ── Motion ─────────────────────────────────────────────────────────
      const fMotion = gui.addFolder("⤳ Motion");
      fMotion
        .add(guiParams, "followLerp", 0.01, 0.3, 0.005)
        .name("Mouse follow");
      fMotion.add(guiParams, "posLerp", 0.01, 0.2, 0.005).name("Pos lerp");
      fMotion.add(guiParams, "tiltAmplY", 0.0, 0.6, 0.01).name("Tilt X-axis");
      fMotion.add(guiParams, "tiltAmplX", 0.0, 0.6, 0.01).name("Tilt Y-axis");
      fMotion.add(guiParams, "tiltLerp", 0.01, 0.2, 0.005).name("Tilt speed");
      fMotion.open(false);

      // ── Rotation ──────────────────────────────────────────────────
      const fRot = gui.addFolder("↺ Rotation");
      fRot.add(guiParams, "rotX", -180, 180, 1).name("Rot X");
      fRot.add(guiParams, "rotY", -180, 180, 1).name("Rot Y");
      fRot.add(guiParams, "rotZ", -180, 180, 1).name("Rot Z");
      fRot.open(false);

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

  useRAFManager().register("three", animate);
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
    overwrite: true,
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
    const tl = gsap.timeline({ onComplete: resolve });
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
  getCamera: () => camera,
  getRenderer: () => renderer,
});

onMounted(() => {
  if (prefersReducedMotion.matches) return; // skip Three.js entirely
  init();
});

onBeforeUnmount(() => {
  useRAFManager().unregister("three");
  stopTracking();
  gui?.destroy();
  window.removeEventListener("resize", debouncedResize);
  window.removeEventListener("pointermove", onPointerMove);
  renderer?.domElement?.removeEventListener("webglcontextlost", onContextLost);
  renderer?.domElement?.removeEventListener(
    "webglcontextrestored",
    onContextRestored,
  );
  geometry?.dispose();
  for (const m of meshes) m.material?.dispose();
  for (const m of featureMeshes) m.material?.dispose();
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
