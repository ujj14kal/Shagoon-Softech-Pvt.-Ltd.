import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "gsap";

/**
 * Hero scene: the SHAGOON SOFTECH mark rebuilt in 3D — three stacked plates
 * (the top one carrying the </> glyph) inside the brand frame, surrounded by
 * a slowly drifting network of connected nodes ("systems").
 */
export interface HeroScene {
  intro(): gsap.core.Timeline;
  setProgress(p: number): void;
  dispose(): void;
}

const BRAND = {
  blue: 0x0046ab,
  blueBright: 0x1f6be0,
  navy: 0x06346d,
  yellow: 0xfabd14,
  paper: 0xf4f8fa,
};

function roundedSquare(size: number, r: number): THREE.Shape {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h + r, -h);
  s.lineTo(h - r, -h);
  s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r);
  s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r);
  s.quadraticCurveTo(-h, -h, -h + r, -h);
  return s;
}

function glyphTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 26;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // "<"
  ctx.beginPath();
  ctx.moveTo(190, 78); ctx.lineTo(120, 128); ctx.lineTo(190, 178);
  // "/"
  ctx.moveTo(282, 62); ctx.lineTo(230, 194);
  // ">"
  ctx.moveTo(322, 78); ctx.lineTo(392, 128); ctx.lineTo(322, 178);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createHeroScene(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }): HeroScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }

  const isSmall = () => window.innerWidth < 900;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 5.4, 9.6);
  camera.lookAt(0, 0, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 5);
  scene.add(key);
  const warm = new THREE.PointLight(BRAND.yellow, 10, 14, 2);
  warm.position.set(3, -1.5, 2.5);
  scene.add(warm);
  const cool = new THREE.PointLight(BRAND.blueBright, 26, 16, 2);
  cool.position.set(-4, 2, -2);
  scene.add(cool);

  // Root that is positioned per breakpoint
  const root = new THREE.Group();
  scene.add(root);

  // ---- The stack (three plates) --------------------------------------
  const stack = new THREE.Group();
  root.add(stack);

  const plateGeo = new THREE.ExtrudeGeometry(roundedSquare(2.1, 0.32), {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 4,
    curveSegments: 10,
  });
  plateGeo.rotateX(-Math.PI / 2);
  plateGeo.center();

  const plateColors = [BRAND.blue, BRAND.blueBright, BRAND.navy];
  const plates: THREE.Mesh[] = [];
  const baseY = [0.62, 0, -0.62];
  plateColors.forEach((color, i) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.25,
      roughness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      envMapIntensity: 0.55,
    });
    const m = new THREE.Mesh(plateGeo, mat);
    m.rotation.y = Math.PI / 4;
    m.position.y = baseY[i];
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(plateGeo, 30),
      new THREE.LineBasicMaterial({ color: i === 0 ? BRAND.yellow : 0x9cc2ff, transparent: true, opacity: i === 0 ? 0.55 : 0.25 })
    );
    m.add(edges);
    stack.add(m);
    plates.push(m);
  });

  // </> glyph on the top plate, kept horizontal on screen
  const glyph = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 0.85),
    new THREE.MeshBasicMaterial({ map: glyphTexture(), transparent: true, depthWrite: false, toneMapped: false })
  );
  glyph.rotation.x = -Math.PI / 2;
  glyph.rotation.z = -Math.PI / 4;
  glyph.position.y = 0.14;
  plates[0].add(glyph);

  // ---- Brand frame ----------------------------------------------------
  const frameShape = new THREE.Shape();
  const F = 2.15, T = 0.07;
  frameShape.moveTo(-F, -F); frameShape.lineTo(F, -F); frameShape.lineTo(F, F); frameShape.lineTo(-F, F); frameShape.lineTo(-F, -F);
  const hole = new THREE.Path();
  hole.moveTo(-F + T, -F + T); hole.lineTo(-F + T, F - T); hole.lineTo(F - T, F - T); hole.lineTo(F - T, -F + T); hole.lineTo(-F + T, -F + T);
  frameShape.holes.push(hole);
  const frameMat = new THREE.MeshStandardMaterial({ color: BRAND.paper, metalness: 0.6, roughness: 0.25, transparent: true, opacity: 0.55 });
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.06, bevelEnabled: false }), frameMat);
  frame.position.z = -1.1;
  root.add(frame);

  // Yellow orbit ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.85, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({ color: BRAND.yellow, transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = Math.PI / 2.25;
  root.add(ring);
  const satellite = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: BRAND.yellow }));
  ring.add(satellite);

  // ---- Node network ---------------------------------------------------
  const network = new THREE.Group();
  scene.add(network);
  const N = isSmall() ? 70 : 150;
  const pts: THREE.Vector3[] = [];
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const cBlue = new THREE.Color(0x7fb0ff);
  const cYellow = new THREE.Color(BRAND.yellow);
  for (let i = 0; i < N; i++) {
    const r = 4.2 + Math.random() * 4.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const v = new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.6, r * Math.sin(phi) * Math.sin(theta) - 2);
    pts.push(v);
    v.toArray(positions, i * 3);
    (Math.random() < 0.12 ? cYellow : cBlue).toArray(colors, i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true, depthWrite: false });
  network.add(new THREE.Points(pGeo, pMat));

  const linePos: number[] = [];
  const maxDist = 1.9;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (pts[i].distanceTo(pts[j]) < maxDist) linePos.push(...pts[i].toArray(), ...pts[j].toArray());
    }
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  const lMat = new THREE.LineBasicMaterial({ color: 0x7fb0ff, transparent: true, opacity: 0.14, depthWrite: false });
  network.add(new THREE.LineSegments(lGeo, lMat));

  // ---- State ------------------------------------------------------------
  const state = { progress: 0 };
  const intro = plates.map(() => ({ y: 0, r: 0 }));
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (w >= 900) {
      // Place the mark in the right half of the viewport
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length() * camera.aspect;
      root.position.x = Math.min(halfWidth * 0.74, 5.6);
      root.position.y = -0.2;
      root.scale.setScalar(0.78);
    } else {
      root.position.x = 0;
      root.position.y = -0.6;
      root.scale.setScalar(0.7);
    }
  }
  layout();

  const ro = new ResizeObserver(() => {
    layout();
    if (opts.reducedMotion) render(0);
  });
  ro.observe(canvas);

  function onPointer(e: PointerEvent) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }
  if (!opts.reducedMotion) window.addEventListener("pointermove", onPointer, { passive: true });

  // ---- Render loop ------------------------------------------------------
  const clock = new THREE.Clock();
  let running = false;
  let visible = true;

  function render(t: number) {
    const p = state.progress;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Plates float independently and fan out on scroll
    const spread = 1 + p * 1.6;
    plates.forEach((m, i) => {
      m.position.y = baseY[i] * spread + Math.sin(t * 1.1 + i * 0.9) * 0.05 + intro[i].y;
      m.rotation.y = Math.PI / 4 + p * (i - 1) * 0.5 + intro[i].r;
    });

    stack.rotation.y = Math.sin(t * 0.35) * 0.18 + pointer.x * 0.35 + p * 0.8;
    stack.rotation.x = pointer.y * 0.12;
    stack.position.y = Math.sin(t * 0.8) * 0.08;

    frame.rotation.y = Math.sin(t * 0.25) * 0.25 + pointer.x * 0.2 - p * 0.6;
    frame.rotation.x = -0.5 + pointer.y * 0.08;
    frame.scale.setScalar(1 + p * 0.5);
    frameMat.opacity = (isSmall() ? 0.2 : 0.55) * (1 - p * 0.8);

    ring.rotation.z = t * 0.25;
    satellite.position.set(Math.cos(t * 0.9) * 2.85, Math.sin(t * 0.9) * 2.85, 0);

    network.rotation.y = t * 0.03 + pointer.x * 0.15;
    network.rotation.x = pointer.y * 0.06;

    root.rotation.z = p * -0.15;
    camera.position.y = 5.4 - p * 2.6;
    camera.position.z = 9.6 + p * 2.5;
    camera.lookAt(root.position.x * 0.35, p * 0.8, 0);

    renderer.render(scene, camera);
  }

  function tick() {
    if (!running) return;
    render(clock.getElapsedTime());
    requestAnimationFrame(tick);
  }
  function start() {
    if (running || opts.reducedMotion) return;
    running = true;
    requestAnimationFrame(tick);
  }
  function stop() { running = false; }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  });
  io.observe(canvas);
  const onVisibility = () => (document.hidden ? stop() : visible && start());
  document.addEventListener("visibilitychange", onVisibility);

  if (opts.reducedMotion) render(0);
  else start();

  return {
    intro() {
      const tl = gsap.timeline();
      intro.forEach((o, i) => {
        tl.from(o, { y: 5 - i, r: Math.PI, duration: 1.6, ease: "expo.out" }, (2 - i) * 0.12);
      });
      tl.from(frame.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 1.6, ease: "expo.out" }, 0.1);
      tl.from(frameMat, { opacity: 0, duration: 1.2 }, 0.1);
      tl.from(pMat, { opacity: 0, duration: 1.8 }, 0);
      tl.from(lMat, { opacity: 0, duration: 2 }, 0.2);
      tl.from(ring.scale, { x: 0, y: 0, z: 0, duration: 1.6, ease: "expo.out" }, 0.3);
      return tl;
    },
    setProgress(p: number) {
      state.progress = p;
    },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
      pmrem.dispose();
    },
  };
}
