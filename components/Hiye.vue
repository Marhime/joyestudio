<template>
  <div ref="container" class="hiye-container"></div>
</template>

<script setup>
import * as THREE from "three";
import GUI from "lil-gui";
import { onMounted, onBeforeUnmount, ref } from "vue";

const container = ref(null);

let scene, camera, renderer, mesh, uniforms, gui;
let frameId;

onMounted(() => {
  init();
  animate();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  renderer.dispose();
  gui.destroy();
});

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    container.value.clientWidth / container.value.clientHeight,
    0.1,
    100,
  );
  camera.position.z = 3;

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.value.appendChild(renderer.domElement);

  uniforms = {
    uTime: { value: 0 },
    uNoiseScale: { value: 1.5 },
    uNoiseStrength: { value: 0.25 },
    uNoiseSpeed: { value: 0.4 },
    uColor: { value: new THREE.Color("#FFD21F") },
    uLightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
  };

  const geometry = new THREE.IcosahedronGeometry(1, 6);

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertexShader(),
    fragmentShader: fragmentShader(),
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  setupGUI();
  window.addEventListener("resize", onResize);
}

function animate() {
  uniforms.uTime.value += 0.01;
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(animate);
}

function setupGUI() {
  gui = new GUI();

  gui.add(uniforms.uNoiseScale, "value", 0.1, 5, 0.1).name("Noise Scale");
  gui
    .add(uniforms.uNoiseStrength, "value", 0.0, 1, 0.01)
    .name("Noise Strength");
  gui.add(uniforms.uNoiseSpeed, "value", 0.0, 2, 0.01).name("Noise Speed");

  gui
    .addColor({ color: "#FFD21F" }, "color")
    .name("Base Color")
    .onChange((val) => {
      uniforms.uColor.value.set(val);
    });
}

function onResize() {
  camera.aspect = container.value.clientWidth / container.value.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.value.clientWidth, container.value.clientHeight);
}

function vertexShader() {
  return `
    flat varying float vNoise;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uNoiseScale;
    uniform float uNoiseStrength;
    uniform float uNoiseSpeed;

    // Simplex noise (same as avant)
    vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}

    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0,1.0/3.0);
      const vec4 D = vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(
        i.z+vec4(0.0,i1.z,i2.z,1.0))
        +i.y+vec4(0.0,i1.y,i2.y,1.0))
        +i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.y;
      vec4 y=y_*ns.x+ns.y;
      vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;
      vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    float fbm(vec3 pos){
      float value = 0.0;
      float amp = 0.5;
      for(int i=0;i<4;i++){
        value += amp * snoise(pos);
        pos *= 2.0;
        amp *= 0.5;
      }
      return value;
    }

    void main(){
  vec3 pos = position;

  float baseNoise = fbm(normalize(position) * uNoiseScale + uTime * uNoiseSpeed);

  // displacement doux
  pos += normal * baseNoise * uNoiseStrength;

  vNormal = normalMatrix * normal;
  vPosition = pos;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);

  float edgeNoise = snoise(normalize(position) * 8.0 + uTime * 0.5);
float edgeFactor = pow(1.0 - abs(dot(normal, vec3(0.0,0.0,1.0))), 3.0);

pos += normal * edgeNoise * edgeFactor * 0.05;

}

  `;
}

function fragmentShader() {
  return `
  float random(vec2 st){
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

    flat varying float vNoise;

    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform vec3 uColor;
    uniform vec3 uLightDirection;

    void main(){
  vec3 normal = normalize(vNormal);

  float light = dot(normal, normalize(uLightDirection));
  float diffuse = clamp(light, 0.0, 1.0);

  float rim = 1.0 - max(dot(normal, vec3(0.0,0.0,1.0)), 0.0);
  rim = pow(rim, 2.5);

  // grain subtil
  float grain = random(vPosition.xy * 20.0) * 0.05;

  vec3 color = uColor;
  color += diffuse * 0.25;
  color += rim * 0.35;
  color += grain;

  gl_FragColor = vec4(color,1.0);
}

  `;
}
</script>

<style scoped>
.hiye-container {
  width: 100%;
  height: 100vh;
  position: relative;
  z-index: 10;
}
</style>
