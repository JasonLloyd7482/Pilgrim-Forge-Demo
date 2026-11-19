import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Title scene for Pilgrim Forge: a brass astrolabe over a small iron anvil.
// Everything is built from simple shapes — no downloaded 3D models.

const NAVY = 0x0a1428;

// Speeds are radians per second. The system "reduce motion" setting multiplies
// these by zero so the astrolabe holds still.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionScale = motionQuery.matches ? 0 : 1;
motionQuery.addEventListener('change', (event) => {
  motionScale = event.matches ? 0 : 1;
});

const stage = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(NAVY, 1);
renderer.domElement.setAttribute('aria-hidden', 'true');
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(NAVY);

// A soft studio reflection so the brass reads as metal, not flat paint.
const room = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(room, 0.04).texture;
scene.environmentIntensity = 0.72;
room.dispose();
pmrem.dispose();

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

const brass = new THREE.MeshStandardMaterial({
  color: 0xb08d57,
  metalness: 1,
  roughness: 0.32,
});

const iron = new THREE.MeshStandardMaterial({
  color: 0x2a2c31,
  metalness: 0.88,
  roughness: 0.46,
});

const keyLight = new THREE.DirectionalLight(0xfff0d0, 2.6);
keyLight.position.set(4, 6, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8eadd4, 1.15);
rimLight.position.set(-5, 3.5, -4);
scene.add(rimLight);

scene.add(new THREE.AmbientLight(0x1a2744, 0.25));

const forge = new THREE.Group();
scene.add(forge);

forge.add(createAnvil(iron));
forge.add(createForgeGlow());
forge.add(createSpindle(brass));

const rings = [
  createRing(brass, { radius: 0.94, tube: 0.034, tiltX: 0.18, tiltZ: 0.04, speed: 0.16, start: 0.2, ticks: true }),
  createRing(brass, { radius: 0.72, tube: 0.026, tiltX: 1.12, tiltZ: 0.18, speed: -0.28, start: 1.1 }),
  createRing(brass, { radius: 0.5, tube: 0.022, tiltX: 0.42, tiltZ: 1.2, speed: 0.45, start: 2.2 }),
];

for (const ring of rings) {
  ring.holder.position.y = 0.72;
  forge.add(ring.holder);
}

forge.add(createStar());

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom softens only the brightest pixels: the star and the forge glow.
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.48,
  0.4,
  1.05
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / Math.max(height, 1);

  camera.aspect = aspect;

  // Keep the horn and the rings on screen, and leave a band at the bottom
  // for the title. Short windows need a taller view so the anvil sits above the words.
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const halfTan = Math.tan(vFov / 2);
  const objectBottom = -1.65;
  const objectTop = 2.32;
  const titleFraction = Math.min(0.3, 150 / height);
  const visibleForHeight = (objectTop - objectBottom) / (1 - titleFraction - 0.07);
  const distance = Math.max(
    visibleForHeight / (2 * halfTan),
    3.4 / (2 * halfTan * aspect)
  );
  const visibleHeight = 2 * distance * halfTan;
  const objectMid = (objectTop + objectBottom) / 2;
  const lookAtY = objectMid - (titleFraction / 2) * visibleHeight;

  camera.position.set(distance * 0.14, lookAtY + 0.2, distance);
  camera.lookAt(0, lookAtY, 0);
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}

window.addEventListener('resize', resize);
resize();

// How long the last frame took. Keeps the spin the same speed at any frame rate.
const timer = new THREE.Timer();
timer.connect(document);

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.05);

  for (const ring of rings) {
    ring.holder.rotation.y += ring.speed * dt * motionScale;
  }

  composer.render();
});

function createRing(material, { radius, tube, tiltX, tiltZ, speed, start, ticks }) {
  // The outer group spins around the upright rod (the world's Y axis).
  // The inner group is only there to tilt the ring onto its own axis.
  const holder = new THREE.Group();
  holder.rotation.y = start;

  const tilted = new THREE.Group();
  tilted.rotation.x = tiltX;
  tilted.rotation.z = tiltZ;

  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 18, 96), material);
  tilted.add(mesh);

  if (ticks) {
    tilted.add(createTicks(material, radius));
    const sight = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.02, 0.028, 0.02), material);
    tilted.add(sight);
  }

  holder.add(tilted);
  return { holder, speed };
}

function createTicks(material, radius) {
  const ticks = new THREE.Group();

  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const long = i % 2 === 0;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, long ? 0.09 : 0.055, 0.016),
      material
    );
    tick.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    tick.rotation.z = angle - Math.PI / 2;
    ticks.add(tick);
  }

  return ticks;
}

function createSpindle(material) {
  const spindle = new THREE.Group();

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 2.55, 16), material);
  rod.position.y = 0.68;
  spindle.add(rod);

  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 16), material);
  hub.position.y = 0.72;
  spindle.add(hub);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12), material);
  cap.position.y = 1.9;
  spindle.add(cap);

  return spindle;
}

function createStar() {
  const group = new THREE.Group();
  group.position.y = 2.08;

  const shape = new THREE.Shape();
  const outer = 0.2;
  const inner = 0.045;

  for (let i = 0; i < 8; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.04,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  geometry.center();

  // Values above 1 stay bright in the render target, so the bloom pass glows them.
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3.4, 2.5, 1.15),
  });

  const star = new THREE.Mesh(geometry, material);
  group.add(star);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: new THREE.Color(1.6, 0.95, 0.4),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.85,
  }));
  halo.scale.set(0.85, 0.85, 1);
  group.add(halo);

  const light = new THREE.PointLight(0xffe2ad, 2.2, 3.2, 2);
  group.add(light);

  return group;
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 244, 214, 1)');
  gradient.addColorStop(0.35, 'rgba(255, 196, 90, 0.55)');
  gradient.addColorStop(1, 'rgba(255, 160, 40, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createAnvil(material) {
  const anvil = new THREE.Group();
  anvil.position.y = -1.42;
  anvil.rotation.y = 0.5;

  // Feet, base, waist, hammer face, and the little step at the heel.
  addBox(anvil, material, 0.26, 0.08, 0.62, -0.52, 0.04, 0);
  addBox(anvil, material, 0.26, 0.08, 0.62, 0.52, 0.04, 0);
  addBox(anvil, material, 1.5, 0.16, 0.76, 0, 0.16, 0);
  addBox(anvil, material, 0.52, 0.34, 0.4, 0.02, 0.4, 0);
  addBox(anvil, material, 1.22, 0.22, 0.56, 0.06, 0.66, 0);
  addBox(anvil, material, 0.22, 0.1, 0.56, 0.56, 0.82, 0);

  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.2, 0.76, 14), material);
  // Tip the cone onto its side so the point sticks out to the left.
  horn.rotation.z = Math.PI / 2;
  horn.position.set(-0.86, 0.62, 0);
  anvil.add(horn);

  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.034, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0x070708, roughness: 0.9, metalness: 0.2 })
  );
  hole.position.set(0.56, 0.81, 0);
  anvil.add(hole);

  return anvil;
}

function createForgeGlow() {
  const glow = new THREE.Group();
  glow.position.y = -1.48;

  // A tight pool of light under the anvil, kept small so it does not cover the title.
  const core = glowDisc(0.32, new THREE.Color(4.6, 1.25, 0.2), 0.95);
  core.position.y = 0.03;
  glow.add(core);

  const halo = glowDisc(0.52, new THREE.Color(1.8, 0.4, 0.06), 0.45);
  glow.add(halo);

  const light = new THREE.PointLight(0xff5a16, 5.5, 3.2, 2);
  light.position.y = 0.32;
  glow.add(light);

  return glow;
}

function glowDisc(radius, color, opacity) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  return disc;
}

function addBox(group, material, width, height, depth, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}
