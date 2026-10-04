import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { QROptions, CenterContentConfig } from '../types/qr';

interface CitySceneProps {
  matrix: boolean[][];
  matrixSize: number;
  options: QROptions;
  isTopDown: boolean;
  onSceneClick: () => void;
  onTransitionComplete?: (isTopDown: boolean) => void;
}

interface BuildingInstance {
  x: number;
  z: number;
  h: number;
  width: number;
  depth: number;
  archetype: 'house' | 'tower' | 'office' | 'apartment';
  color: THREE.Color;
}

interface HouseRoofInstance {
  x: number;
  z: number;
  baseH: number;
  width: number;
  depth: number;
  color: THREE.Color;
}

interface PenthouseInstance {
  x: number;
  z: number;
  baseH: number;
  width: number;
  depth: number;
  h: number;
  color: THREE.Color;
}

interface RoadInstance {
  x: number;
  z: number;
}

// Sophisticated architectural palette for modern urban buildings
const ARCHITECTURAL_PALETTE = [
  new THREE.Color('#4a6572'), // Muted slate blue
  new THREE.Color('#556852'), // Olive sage
  new THREE.Color('#b05d49'), // Warm terracotta
  new THREE.Color('#dcd0be'), // Warm beige / sandstone
  new THREE.Color('#ece4d4'), // Off-white cream
  new THREE.Color('#8c857b'), // Warm architectural gray
  new THREE.Color('#cf9e57'), // Soft ochre / mustard
  new THREE.Color('#3d5a6c'), // Deep slate
  new THREE.Color('#94715f'), // Muted clay brown
  new THREE.Color('#607274'), // Industrial slate green
];

// Curated pairings for Japanese residential houses (wall + eaved roof)
const JAPANESE_HOUSE_PALETTES = [
  { wall: new THREE.Color('#ede8db'), roof: new THREE.Color('#262a32') }, // Cream + dark charcoal kawara roof
  { wall: new THREE.Color('#7d8c7c'), roof: new THREE.Color('#283038') }, // Pale matcha green + slate roof
  { wall: new THREE.Color('#b36551'), roof: new THREE.Color('#382822') }, // Terracotta + dark timber brown roof
  { wall: new THREE.Color('#c9b193'), roof: new THREE.Color('#262b34') }, // Warm cedar / beige + dark slate roof
  { wall: new THREE.Color('#647887'), roof: new THREE.Color('#22262d') }, // Muted slate blue + dark roof
  { wall: new THREE.Color('#ded6c5'), roof: new THREE.Color('#332b26') }, // Sandstone + bronze roof
];

// Pre-allocated reusable colors to eliminate per-frame garbage collection on mobile
const tempRoofColor = new THREE.Color(0x282c35);
const tempPureBlack = new THREE.Color(0x000000);
const tempPlinth3D = new THREE.Color(0x1e2229);
const tempPureWhite = new THREE.Color(0xffffff);
const tempBg3D = new THREE.Color(0xf4f6f8);
const tempLerpColor = new THREE.Color();

/**
 * Creates procedural architectural facade textures with SPARSE, RANDOMIZED SQUARE WINDOWS.
 * Windows are strictly 1:1 square, attached to vertical facades (never roofs).
 * Varied, non-uniform window distribution across floors and bays with subtle warm light.
 */
function createFacadeTextures(): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const eCanvas = document.createElement('canvas');
  eCanvas.width = 512;
  eCanvas.height = 512;
  const eCtx = eCanvas.getContext('2d')!;

  // Neutral architectural facade base wall (multiplies cleanly with instance colors)
  ctx.fillStyle = '#e4e7eb';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural horizontal floor spandrel lines
  ctx.strokeStyle = '#c8cdd6';
  ctx.lineWidth = 2;
  for (let y = 64; y < 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Pure black base for emissive
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 512, 512);

  // Grid layout for windows
  const cols = 8;
  const floors = 8;
  const cellW = 512 / cols; // 64px
  const cellH = 512 / floors; // 64px
  const winSize = 26; // Exact 1:1 square window

  // Subtle, non-neon architectural warm window illumination
  const warmLights = ['#ffe8c2', '#fff0d6', '#fae1b4', '#f5dab0'];

  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      // SPARSE DISTRIBUTION: Only ~38% of slots have windows at all!
      // Solid facade walls, corners, and spandrels remain uninterrupted.
      const presenceHash = (f * 17 + c * 31 + (f ^ (c * 7))) % 100;
      if (presenceHash > 38) {
        continue; // Blank solid architectural wall
      }

      const x = Math.round(c * cellW + (cellW - winSize) / 2);
      const y = Math.round(f * cellH + (cellH - winSize) / 2);

      // Window Frame (Mullion)
      ctx.fillStyle = '#1c1f24';
      ctx.fillRect(x - 2, y - 2, winSize + 4, winSize + 4);

      // Of the existing windows, ~40% are softly lit, ~60% are dark reflective glass
      const litHash = (f * 43 + c * 71 + 13) % 100;
      const isLit = litHash < 42;

      if (isLit) {
        const col = warmLights[(f * 3 + c * 5) % warmLights.length];
        ctx.fillStyle = col;
        ctx.fillRect(x, y, winSize, winSize);

        eCtx.fillStyle = col;
        eCtx.fillRect(x, y, winSize, winSize);
      } else {
        // Dark unlit glass pane
        ctx.fillStyle = '#1e232a';
        ctx.fillRect(x, y, winSize, winSize);
      }
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const emissiveMap = new THREE.CanvasTexture(eCanvas);
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;

  return { map, emissiveMap };
}

/**
 * Creates procedural road textures for visible asphalt streets, sidewalks, and markings.
 */
function createRoadTextures(): {
  straightH: THREE.CanvasTexture;
  straightV: THREE.CanvasTexture;
  intersection: THREE.CanvasTexture;
  plaza: THREE.CanvasTexture;
} {
  const makeCanvas = () => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    return { canvas: c, ctx: c.getContext('2d')! };
  };

  // 1. East-West Straight Road (Horizontal)
  const h = makeCanvas();
  h.ctx.fillStyle = '#8f97a3'; // Light concrete sidewalk
  h.ctx.fillRect(0, 0, 512, 512);
  h.ctx.fillStyle = '#2a2e36'; // Asphalt roadway
  h.ctx.fillRect(0, 96, 512, 320);
  h.ctx.fillStyle = '#b0b8c4'; // Curbs
  h.ctx.fillRect(0, 92, 512, 4);
  h.ctx.fillRect(0, 416, 512, 4);
  h.ctx.strokeStyle = '#dce1e8'; // Dashed center line
  h.ctx.lineWidth = 8;
  h.ctx.setLineDash([32, 28]);
  h.ctx.beginPath();
  h.ctx.moveTo(0, 256);
  h.ctx.lineTo(512, 256);
  h.ctx.stroke();

  // 2. North-South Straight Road (Vertical)
  const v = makeCanvas();
  v.ctx.fillStyle = '#8f97a3';
  v.ctx.fillRect(0, 0, 512, 512);
  v.ctx.fillStyle = '#2a2e36';
  v.ctx.fillRect(96, 0, 320, 512);
  v.ctx.fillStyle = '#b0b8c4';
  v.ctx.fillRect(92, 0, 4, 512);
  v.ctx.fillRect(416, 0, 4, 512);
  v.ctx.strokeStyle = '#dce1e8';
  v.ctx.lineWidth = 8;
  v.ctx.setLineDash([32, 28]);
  v.ctx.beginPath();
  v.ctx.moveTo(256, 0);
  v.ctx.lineTo(256, 512);
  v.ctx.stroke();

  // 3. Intersection / T-Junction / Cross
  const ix = makeCanvas();
  ix.ctx.fillStyle = '#2a2e36';
  ix.ctx.fillRect(0, 0, 512, 512);
  ix.ctx.fillStyle = '#8f97a3';
  const cornerSize = 96;
  ix.ctx.fillRect(0, 0, cornerSize, cornerSize);
  ix.ctx.fillRect(512 - cornerSize, 0, cornerSize, cornerSize);
  ix.ctx.fillRect(0, 512 - cornerSize, cornerSize, cornerSize);
  ix.ctx.fillRect(512 - cornerSize, 512 - cornerSize, cornerSize, cornerSize);
  ix.ctx.fillStyle = '#dce1e8'; // Zebra crossings
  for (let i = 120; i < 392; i += 32) {
    ix.ctx.fillRect(i, 80, 16, 32);
    ix.ctx.fillRect(i, 400, 16, 32);
    ix.ctx.fillRect(80, i, 32, 16);
    ix.ctx.fillRect(400, i, 32, 16);
  }

  // 4. Urban Plaza / Public Square / Open Space
  const p = makeCanvas();
  p.ctx.fillStyle = '#838b97';
  p.ctx.fillRect(0, 0, 512, 512);
  p.ctx.strokeStyle = '#6a727d';
  p.ctx.lineWidth = 3;
  for (let s = 64; s < 512; s += 64) {
    p.ctx.beginPath();
    p.ctx.moveTo(s, 0);
    p.ctx.lineTo(s, 512);
    p.ctx.stroke();
    p.ctx.beginPath();
    p.ctx.moveTo(0, s);
    p.ctx.lineTo(512, s);
    p.ctx.stroke();
  }

  return {
    straightH: new THREE.CanvasTexture(h.canvas),
    straightV: new THREE.CanvasTexture(v.canvas),
    intersection: new THREE.CanvasTexture(ix.canvas),
    plaza: new THREE.CanvasTexture(p.canvas),
  };
}

/**
 * Creates dynamic canvas texture for the optional center text or logo badge
 */
function createCenterBadgeTexture(centerContent: CenterContentConfig): THREE.CanvasTexture | null {
  if (!centerContent || centerContent.type === 'none') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // White badge with clean outline
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(16, 16, 480, 480, 56);
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);

  if (centerContent.type === 'text' && centerContent.text.trim()) {
    const text = centerContent.text.trim().substring(0, 10);
    const fontSize = text.length > 6 ? 84 : 110;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 256);
    tex.needsUpdate = true;
  } else if (centerContent.type === 'logo' && centerContent.logoDataUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const padding = 60;
      const innerSize = 512 - padding * 2;
      const aspect = img.width / img.height;
      let dw = innerSize;
      let dh = innerSize;
      if (aspect > 1) {
        dh = innerSize / aspect;
      } else {
        dw = innerSize * aspect;
      }
      ctx.drawImage(img, 256 - dw / 2, 256 - dh / 2, dw, dh);
      tex.needsUpdate = true;
    };
    img.src = centerContent.logoDataUrl;
  }

  return tex;
}

export const CityScene: React.FC<CitySceneProps> = ({
  matrix,
  matrixSize,
  options,
  isTopDown,
  onSceneClick,
  onTransitionComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References across re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Root City Group: Entire miniature city (buildings, houses, roads, plinth) rotates around Y-axis!
  const cityGroupRef = useRef<THREE.Group>(new THREE.Group());

  // Meshes & Materials
  const buildingsMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const houseRoofMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const penthouseMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Distinct Road Meshes for continuous network
  const roadsHMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const roadsVMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const roadsIxMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const roadsPlazaMeshRef = useRef<THREE.InstancedMesh | null>(null);

  const plinthMeshRef = useRef<THREE.Mesh | null>(null);
  const centerBadgeMeshRef = useRef<THREE.Mesh | null>(null);

  // Shared Materials for uniform smooth animation
  const sideMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const roofMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const houseRoofMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const roadMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const plinthMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  // Instance trackers
  const qrInstancesRef = useRef<BuildingInstance[]>([]);
  const houseRoofInstancesRef = useRef<HouseRoofInstance[]>([]);
  const penthouseInstancesRef = useRef<PenthouseInstance[]>([]);
  const dummyRef = useRef<THREE.Object3D>(new THREE.Object3D());

  // Dynamic values in refs so scene setup does not re-mount
  const marginRef = useRef(options.margin);
  marginRef.current = options.margin;

  const matrixSizeRef = useRef(matrixSize);
  matrixSizeRef.current = matrixSize;

  // Rotation & Zoom State:
  // Camera elevation is FIXED at 45°! The city itself rotates horizontally around Y-axis!
  const cityRotation = useRef({
    currentY: 0,
    targetY: 0,
  });

  const zoomState = useRef({
    radius: Math.max(matrixSize * 1.6, 52),
    targetRadius: Math.max(matrixSize * 1.6, 52),
    minRadius: 26,
    maxRadius: 115,
  });

  // Pointer state for click vs 360° city drag
  const pointerState = useRef({
    isDown: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    pinchDist: 0,
  });

  // Camera transition state (0 = 3D City view, 1 = Top-down QR view)
  const transitionRef = useRef({
    currentProgress: isTopDown ? 1 : 0,
    targetProgress: isTopDown ? 1 : 0,
  });

  // Sync transition target when isTopDown changes
  useEffect(() => {
    transitionRef.current.targetProgress = isTopDown ? 1 : 0;
  }, [isTopDown]);

  // Adjust base zoom when matrixSize changes
  useEffect(() => {
    const baseRadius = Math.max(matrixSize * 1.6, 48);
    zoomState.current.targetRadius = Math.max(zoomState.current.targetRadius, baseRadius * 0.7);
  }, [matrixSize]);

  // MOUNT ONCE: Setup Three.js scene, camera, lights, plinth, and animation loop
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f8f5);
    sceneRef.current = scene;

    // 2. City Group: Everything that belongs to the city rotates together
    const cityGroup = cityGroupRef.current;
    scene.add(cityGroup);

    // 3. Camera with FIXED 45° elevation
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // Mobile device detection for adaptive performance
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window) ||
      (window.innerWidth <= 768);

    // 4. Renderer with Adaptive DPR (caps mobile to 1.6 to prevent fillrate bottlenecks)
    const maxDpr = isMobileDevice ? 1.6 : 2.0;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    // 5. Neutral Architectural Lighting (no neon)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.25);
    sunLight.position.set(40, 75, 45);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xedf2f7, 0.55);
    fillLight.position.set(-45, 50, -35);
    scene.add(fillLight);

    // Responsive Resize Handler with ResizeObserver
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h, false);
      }
    };
    window.addEventListener('resize', handleResize);

    const containerEl = containerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(containerEl);
    }

    // Desktop Mouse wheel zoom handler (preserves fixed 45° angle)
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.055;
      const zoom = zoomState.current;
      zoom.targetRadius = Math.max(
        zoom.minRadius,
        Math.min(zoom.maxRadius, zoom.targetRadius + zoomFactor)
      );
    };
    containerEl.addEventListener('wheel', handleWheel, { passive: false });

    // Native High-Precision Touch Gestures (Passive: false prevents browser pull-to-refresh)
    const touchState = {
      startX: 0,
      startY: 0,
      lastX: 0,
      isDragging: false,
      hasPinched: false,
      pinchStartDist: 0,
      startTime: 0,
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchState.startX = t.clientX;
        touchState.startY = t.clientY;
        touchState.lastX = t.clientX;
        touchState.isDragging = false;
        touchState.hasPinched = false;
        touchState.startTime = performance.now();
      } else if (e.touches.length === 2) {
        touchState.hasPinched = true;
        touchState.isDragging = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchState.pinchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 1 && !touchState.hasPinched) {
        const t = e.touches[0];
        const dx = t.clientX - touchState.lastX;
        const totalDist = Math.hypot(t.clientX - touchState.startX, t.clientY - touchState.startY);

        if (totalDist > 8) {
          touchState.isDragging = true;
        }

        if (touchState.isDragging) {
          // One-finger horizontal city rotation:
          // Drag right (dx > 0) -> rotates right
          // Drag left (dx < 0) -> rotates left
          cityRotation.current.targetY += dx * 0.008;
          touchState.lastX = t.clientX;
        }
      } else if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        if (touchState.pinchStartDist > 0) {
          // Pinch in: currentDist < pinchStartDist -> deltaDist > 0 -> zoom out (increase radius)
          // Pinch out: currentDist > pinchStartDist -> deltaDist < 0 -> zoom in (decrease radius)
          const deltaDist = (touchState.pinchStartDist - currentDist) * 0.14;
          const zoom = zoomState.current;
          zoom.targetRadius = Math.max(
            zoom.minRadius,
            Math.min(zoom.maxRadius, zoom.targetRadius + deltaDist)
          );
        }
        touchState.pinchStartDist = currentDist;
        touchState.isDragging = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        const elapsed = performance.now() - touchState.startTime;
        if (!touchState.isDragging && !touchState.hasPinched && elapsed < 450) {
          // Clean tap without meaningful movement triggers QR reveal transition
          onSceneClick();
        }
        touchState.isDragging = false;
        touchState.hasPinched = false;
        touchState.pinchStartDist = 0;
      } else if (e.touches.length === 1) {
        touchState.lastX = e.touches[0].clientX;
        touchState.hasPinched = true;
        touchState.pinchStartDist = 0;
      }
    };

    const onTouchCancel = () => {
      touchState.isDragging = false;
      touchState.hasPinched = false;
      touchState.pinchStartDist = 0;
    };

    containerEl.addEventListener('touchstart', onTouchStart, { passive: false });
    containerEl.addEventListener('touchmove', onTouchMove, { passive: false });
    containerEl.addEventListener('touchend', onTouchEnd, { passive: false });
    containerEl.addEventListener('touchcancel', onTouchCancel, { passive: false });

    // Animation Loop
    let lastTime = performance.now();

    const animate = (time: number) => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Battery & GPU Optimization: Pause rendering when page/tab is backgrounded
      if (document.hidden) return;

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const t = transitionRef.current;
      const speed = delta * 2.2;
      if (t.currentProgress < t.targetProgress) {
        t.currentProgress = Math.min(t.targetProgress, t.currentProgress + speed);
        if (t.currentProgress === t.targetProgress && onTransitionComplete) {
          onTransitionComplete(true);
        }
      } else if (t.currentProgress > t.targetProgress) {
        t.currentProgress = Math.max(t.targetProgress, t.currentProgress - speed);
        if (t.currentProgress === t.targetProgress && onTransitionComplete) {
          onTransitionComplete(false);
        }
      }

      const p = t.currentProgress;
      // Smooth cubic easing for camera and height flattening
      const easedP = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

      // Smooth zoom lerp
      const zoom = zoomState.current;
      zoom.radius += (zoom.targetRadius - zoom.radius) * 0.14;

      // Smooth City Y-Axis Rotation
      const rot = cityRotation.current;
      rot.currentY += (rot.targetY - rot.currentY) * 0.14;

      // In top-down mode: smoothly align city rotation squarely to nearest 0 rad
      const alignedTargetY = Math.round(rot.currentY / (Math.PI * 2)) * (Math.PI * 2);
      const activeRotationY = THREE.MathUtils.lerp(rot.currentY, alignedTargetY, easedP);
      cityGroup.rotation.y = activeRotationY;

      // Camera position with FIXED 45° elevation:
      // In 3D: Y = R * sin(45°), Z = R * cos(45°), X = 0
      if (cameraRef.current) {
        const aspect = cameraRef.current.aspect;
        const sin45 = 0.7071;
        const cos45 = 0.7071;

        const cityCamY = zoom.radius * sin45;
        const cityCamZ = zoom.radius * cos45;

        // In Top-down QR view: centered directly overhead with proper responsive framing
        const currentMargin = marginRef.current;
        const currentMatrixSize = matrixSizeRef.current;
        const qrSpan = currentMatrixSize + currentMargin * 2;
        let topDownY = (qrSpan / (2 * Math.tan((cameraRef.current.fov * Math.PI) / 360))) * 1.2;
        if (aspect < 1) {
          topDownY /= aspect; // Responsive framing on portrait mobile
        }

        const camX = 0;
        const camY = THREE.MathUtils.lerp(cityCamY, topDownY, easedP);
        const camZ = THREE.MathUtils.lerp(cityCamZ, 0.001, easedP);

        cameraRef.current.position.set(camX, camY, camZ);
        cameraRef.current.lookAt(0, 0, 0);

        // Smoothly orient camera UP vector
        cameraRef.current.up.set(
          0,
          THREE.MathUtils.lerp(1, 0, easedP),
          THREE.MathUtils.lerp(0, -1, easedP)
        );
      }

      // Animate QR Building Modules (Uniform flattening on same base plane - NO GLITCH)
      if (buildingsMeshRef.current && sideMaterialRef.current && roofMaterialRef.current) {
        const mesh = buildingsMeshRef.current;
        const dummy = dummyRef.current;
        const instances = qrInstancesRef.current;
        const heightFactor = 1.0 - easedP;

        for (let i = 0; i < instances.length; i++) {
          const inst = instances[i];
          const curH = 0.02 + inst.h * heightFactor;
          const curW = THREE.MathUtils.lerp(inst.width, 1.0, easedP);
          const curD = THREE.MathUtils.lerp(inst.depth, 1.0, easedP);

          dummy.position.set(inst.x, curH / 2, inst.z);
          dummy.scale.set(curW, curH, curD);
          dummy.updateMatrix();

          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;

        // In top-down mode, fade vertical facade emissive windows to 0
        sideMaterialRef.current.emissiveIntensity = 0.6 * (1.0 - easedP);
        // Roof becomes pure pitch black #000000 in top-down QR mode (zero-GC lerp)
        roofMaterialRef.current.color.copy(tempRoofColor).lerp(tempPureBlack, easedP);
        roofMaterialRef.current.roughness = 0.5 + 0.5 * easedP;
      }

      // Animate Japanese Residential House Eaved Roof Caps
      if (houseRoofMeshRef.current) {
        const roofMesh = houseRoofMeshRef.current;
        const dummy = dummyRef.current;
        const houses = houseRoofInstancesRef.current;
        const heightFactor = 1.0 - easedP;

        roofMesh.visible = heightFactor > 0.02;
        if (roofMesh.visible) {
          for (let i = 0; i < houses.length; i++) {
            const hInst = houses[i];
            const baseH = 0.02 + hInst.baseH * heightFactor;
            const roofH = 0.42 * heightFactor;

            dummy.position.set(hInst.x, baseH + roofH / 2, hInst.z);
            dummy.scale.set(hInst.width * 1.08, roofH, hInst.depth * 1.08); // Slight eave overhang
            dummy.updateMatrix();

            roofMesh.setMatrixAt(i, dummy.matrix);
          }
          roofMesh.instanceMatrix.needsUpdate = true;
        }
      }

      // Animate Skyscraper Stepped Roof Penthouses
      if (penthouseMeshRef.current) {
        const pMesh = penthouseMeshRef.current;
        const dummy = dummyRef.current;
        const pInstances = penthouseInstancesRef.current;
        const heightFactor = 1.0 - easedP;

        pMesh.visible = heightFactor > 0.02;
        if (pMesh.visible) {
          for (let i = 0; i < pInstances.length; i++) {
            const pInst = pInstances[i];
            const baseH = 0.02 + pInst.baseH * heightFactor;
            const curPentH = pInst.h * heightFactor;

            dummy.position.set(pInst.x, baseH + curPentH / 2, pInst.z);
            dummy.scale.set(pInst.width * 0.65, curPentH, pInst.depth * 0.65);
            dummy.updateMatrix();

            pMesh.setMatrixAt(i, dummy.matrix);
          }
          pMesh.instanceMatrix.needsUpdate = true;
        }
      }

      // Animate Road Tiles: Visible asphalt/sidewalks in 3D -> Pure solid white #ffffff in top-down view (zero-GC)
      if (roadMaterialsRef.current.length > 0) {
        for (const mat of roadMaterialsRef.current) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = easedP;
          mat.color.copy(tempPureWhite);
        }
      }

      // Animate Urban Base Plinth & Background: Architectural plinth in 3D -> Pure white in top-down view (zero-GC)
      if (plinthMaterialRef.current && sceneRef.current) {
        const plinthProgress = Math.min(1, easedP * 1.3);
        plinthMaterialRef.current.color.copy(tempPlinth3D).lerp(tempPureWhite, plinthProgress);
        sceneRef.current.background = tempLerpColor.copy(tempBg3D).lerp(tempPureWhite, plinthProgress);
      }

      if (cameraRef.current) {
        renderer.render(scene, cameraRef.current);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
      containerEl.removeEventListener('wheel', handleWheel);
      containerEl.removeEventListener('touchstart', onTouchStart);
      containerEl.removeEventListener('touchmove', onTouchMove);
      containerEl.removeEventListener('touchend', onTouchEnd);
      containerEl.removeEventListener('touchcancel', onTouchCancel);
      renderer.dispose();
    };
  }, []);

  // RECONSTRUCT MESHES ONLY WHEN MATRIX OR CENTER BADGE CHANGES
  useEffect(() => {
    if (!sceneRef.current || matrixSize === 0) return;
    const cityGroup = cityGroupRef.current;

    // Clean up previous meshes
    const removeAndDispose = (mesh: THREE.InstancedMesh | THREE.Mesh | null) => {
      if (!mesh) return;
      cityGroup.remove(mesh);
      mesh.geometry.dispose();
    };

    removeAndDispose(buildingsMeshRef.current);
    buildingsMeshRef.current = null;
    removeAndDispose(houseRoofMeshRef.current);
    houseRoofMeshRef.current = null;
    removeAndDispose(penthouseMeshRef.current);
    penthouseMeshRef.current = null;
    removeAndDispose(roadsHMeshRef.current);
    roadsHMeshRef.current = null;
    removeAndDispose(roadsVMeshRef.current);
    roadsVMeshRef.current = null;
    removeAndDispose(roadsIxMeshRef.current);
    roadsIxMeshRef.current = null;
    removeAndDispose(roadsPlazaMeshRef.current);
    roadsPlazaMeshRef.current = null;
    removeAndDispose(plinthMeshRef.current);
    plinthMeshRef.current = null;
    removeAndDispose(centerBadgeMeshRef.current);
    centerBadgeMeshRef.current = null;

    const halfSize = (matrixSize - 1) / 2;
    const residentialRadius = matrixSize * 0.28;

    // 1. DISCRETE MAPPING:
    // BLACK CELL -> BUILDING (Tower, Office, Apartment, or Japanese House)
    // WHITE CELL -> CONTINUOUS ROAD / SIDEWALK / PLAZA
    const qrInstances: BuildingInstance[] = [];
    const houseRoofInstances: HouseRoofInstance[] = [];
    const penthouseInstances: PenthouseInstance[] = [];

    // Road classification instances
    const roadsH: RoadInstance[] = [];
    const roadsV: RoadInstance[] = [];
    const roadsIx: RoadInstance[] = [];
    const roadsPlaza: RoadInstance[] = [];

    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        const posX = c - halfSize;
        const posZ = r - halfSize;
        const isBlack = Boolean(matrix[r] && matrix[r][c]);

        if (isBlack) {
          // BLACK CELL: Place building
          const distFromCenter = Math.hypot(posX, posZ);
          const isFinder =
            (r < 8 && c < 8) ||
            (r < 8 && c >= matrixSize - 8) ||
            (r >= matrixSize - 8 && c < 8);

          // CENTRAL AREA: Japanese-Inspired Residential Houses (1-2 storeys)
          if (!isFinder && distFromCenter <= residentialRadius) {
            const housePalette = JAPANESE_HOUSE_PALETTES[(r * 11 + c * 17) % JAPANESE_HOUSE_PALETTES.length];
            const houseH = 1.0 + ((r * 7 + c * 13) % 4) * 0.22; // 1.0 to 1.66 units
            const inst: BuildingInstance = {
              x: posX,
              z: posZ,
              h: houseH,
              width: 0.84,
              depth: 0.84,
              archetype: 'house',
              color: housePalette.wall,
            };
            qrInstances.push(inst);

            houseRoofInstances.push({
              x: posX,
              z: posZ,
              baseH: houseH,
              width: 0.84,
              depth: 0.84,
              color: housePalette.roof,
            });
          } else {
            // MID TO OUTER AREA: Architectural Towers, Offices, Apartments
            const isTower = isFinder || (distFromCenter > matrixSize * 0.42 && (r + c) % 4 === 0);
            const isOffice = !isTower && (r * c) % 3 === 0;
            const bldColor = ARCHITECTURAL_PALETTE[(r * 23 + c * 37) % ARCHITECTURAL_PALETTE.length];

            if (isTower) {
              const towerH = isFinder ? 7.5 + Math.sin(r * 2 + c * 3) * 1.5 : 5.8 + ((r * 13 + c * 29) % 6) * 0.65;
              qrInstances.push({
                x: posX,
                z: posZ,
                h: towerH,
                width: 0.94,
                depth: 0.94,
                archetype: 'tower',
                color: bldColor,
              });

              // Stepped rooftop penthouse
              penthouseInstances.push({
                x: posX,
                z: posZ,
                baseH: towerH,
                width: 0.94,
                depth: 0.94,
                h: 0.75,
                color: bldColor,
              });
            } else if (isOffice) {
              const officeH = 3.5 + ((r * 7 + c * 19) % 5) * 0.45;
              qrInstances.push({
                x: posX,
                z: posZ,
                h: officeH,
                width: 0.92,
                depth: 0.92,
                archetype: 'office',
                color: bldColor,
              });
            } else {
              const aptH = 2.3 + ((r * 17 + c * 23) % 6) * 0.35;
              qrInstances.push({
                x: posX,
                z: posZ,
                h: aptH,
                width: 0.9,
                depth: 0.9,
                archetype: 'apartment',
                color: bldColor,
              });
            }
          }
        } else {
          // WHITE CELL: Continuous circulation road network
          const isN = r > 0 && !matrix[r - 1][c];
          const isS = r < matrixSize - 1 && !matrix[r + 1][c];
          const isW = c > 0 && !matrix[r][c - 1];
          const isE = c < matrixSize - 1 && !matrix[r][c + 1];
          const openNeighbors = (isN ? 1 : 0) + (isS ? 1 : 0) + (isW ? 1 : 0) + (isE ? 1 : 0);

          if (openNeighbors >= 3) {
            roadsIx.push({ x: posX, z: posZ });
          } else if (isN && isS && !isW && !isE) {
            roadsV.push({ x: posX, z: posZ });
          } else if (isW && isE && !isN && !isS) {
            roadsH.push({ x: posX, z: posZ });
          } else if (openNeighbors <= 1) {
            roadsPlaza.push({ x: posX, z: posZ });
          } else {
            // Turning / corner road cell
            roadsIx.push({ x: posX, z: posZ });
          }
        }
      }
    }

    qrInstancesRef.current = qrInstances;
    houseRoofInstancesRef.current = houseRoofInstances;
    penthouseInstancesRef.current = penthouseInstances;

    // 2. PROCEDURAL FACADE TEXTURE & COLORFUL BUILDINGS
    const { map, emissiveMap } = createFacadeTextures();

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White base so instanceColor tints the walls faithfully
      map: map,
      emissive: 0xffffff,
      emissiveMap: emissiveMap,
      emissiveIntensity: isTopDown ? 0 : 0.6,
      roughness: 0.5,
      metalness: 0.1,
    });
    sideMaterialRef.current = sideMat;

    const roofMat = new THREE.MeshStandardMaterial({
      color: isTopDown ? 0x000000 : 0x282c35,
      roughness: isTopDown ? 1.0 : 0.6,
      metalness: 0.05,
    });
    roofMaterialRef.current = roofMat;

    // BoxGeometry material faces: 0,1,4,5 = sides; 2,3 = roof & bottom
    const buildingMaterials = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingsMesh = new THREE.InstancedMesh(buildingGeo, buildingMaterials, qrInstances.length);
    const dummy = dummyRef.current;
    const initialHeightFactor = isTopDown ? 0 : 1;

    for (let i = 0; i < qrInstances.length; i++) {
      const inst = qrInstances[i];
      const curH = 0.02 + inst.h * initialHeightFactor;
      const curW = isTopDown ? 1.0 : inst.width;
      const curD = isTopDown ? 1.0 : inst.depth;

      dummy.position.set(inst.x, curH / 2, inst.z);
      dummy.scale.set(curW, curH, curD);
      dummy.updateMatrix();

      buildingsMesh.setMatrixAt(i, dummy.matrix);
      // Assign individual architectural color
      buildingsMesh.setColorAt(i, inst.color);
    }

    buildingsMesh.instanceMatrix.needsUpdate = true;
    if (buildingsMesh.instanceColor) buildingsMesh.instanceColor.needsUpdate = true;
    cityGroup.add(buildingsMesh);
    buildingsMeshRef.current = buildingsMesh;

    // 3. JAPANESE RESIDENTIAL EAVED ROOFS (4-sided pitched roofs with overhang)
    if (houseRoofInstances.length > 0) {
      const roofCapGeo = new THREE.ConeGeometry(0.72, 1, 4);
      roofCapGeo.rotateY(Math.PI / 4);
      const houseRoofMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Tinted per instance
        roughness: 0.7,
        metalness: 0.08,
      });
      houseRoofMaterialRef.current = houseRoofMat;

      const houseRoofMesh = new THREE.InstancedMesh(roofCapGeo, houseRoofMat, houseRoofInstances.length);
      for (let i = 0; i < houseRoofInstances.length; i++) {
        const hInst = houseRoofInstances[i];
        const baseH = 0.02 + hInst.baseH * initialHeightFactor;
        const roofH = 0.42 * initialHeightFactor;

        dummy.position.set(hInst.x, baseH + roofH / 2, hInst.z);
        dummy.scale.set(hInst.width * 1.08, roofH, hInst.depth * 1.08);
        dummy.updateMatrix();

        houseRoofMesh.setMatrixAt(i, dummy.matrix);
        houseRoofMesh.setColorAt(i, hInst.color);
      }

      houseRoofMesh.visible = !isTopDown;
      houseRoofMesh.instanceMatrix.needsUpdate = true;
      if (houseRoofMesh.instanceColor) houseRoofMesh.instanceColor.needsUpdate = true;
      cityGroup.add(houseRoofMesh);
      houseRoofMeshRef.current = houseRoofMesh;
    }

    // 4. SKYSCRAPER STEPPED ROOF PENTHOUSES
    if (penthouseInstances.length > 0) {
      const pGeo = new THREE.BoxGeometry(1, 1, 1);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.1,
      });

      const pMesh = new THREE.InstancedMesh(pGeo, pMat, penthouseInstances.length);
      for (let i = 0; i < penthouseInstances.length; i++) {
        const pInst = penthouseInstances[i];
        const baseH = 0.02 + pInst.baseH * initialHeightFactor;
        const curPentH = pInst.h * initialHeightFactor;

        dummy.position.set(pInst.x, baseH + curPentH / 2, pInst.z);
        dummy.scale.set(pInst.width * 0.65, curPentH, pInst.depth * 0.65);
        dummy.updateMatrix();

        pMesh.setMatrixAt(i, dummy.matrix);
        pMesh.setColorAt(i, pInst.color);
      }

      pMesh.visible = !isTopDown;
      pMesh.instanceMatrix.needsUpdate = true;
      if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
      cityGroup.add(pMesh);
      penthouseMeshRef.current = pMesh;
    }

    // 5. CONTINUOUS RECOGNIZABLE ROAD SYSTEM (Asphalt, Sidewalks, Lane Markings)
    const roadTextures = createRoadTextures();
    const roadGeo = new THREE.BoxGeometry(1, 0.02, 1);
    const activeRoadMats: THREE.MeshStandardMaterial[] = [];

    const createRoadMesh = (instances: RoadInstance[], mapTex: THREE.CanvasTexture) => {
      if (instances.length === 0) return null;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: mapTex,
        roughness: 0.85,
        metalness: 0.05,
        emissive: 0xffffff,
        emissiveIntensity: isTopDown ? 1.0 : 0.0,
      });
      activeRoadMats.push(mat);

      const mesh = new THREE.InstancedMesh(roadGeo, mat, instances.length);
      for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        dummy.position.set(inst.x, 0.01, inst.z);
        dummy.scale.set(1.0, 1.0, 1.0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      cityGroup.add(mesh);
      return mesh;
    };

    roadsHMeshRef.current = createRoadMesh(roadsH, roadTextures.straightH);
    roadsVMeshRef.current = createRoadMesh(roadsV, roadTextures.straightV);
    roadsIxMeshRef.current = createRoadMesh(roadsIx, roadTextures.intersection);
    roadsPlazaMeshRef.current = createRoadMesh(roadsPlaza, roadTextures.plaza);
    roadMaterialsRef.current = activeRoadMats;

    // 6. URBAN BASE PLINTH
    const plinthSpan = matrixSize + 6;
    const plinthGeo = new THREE.BoxGeometry(plinthSpan, 0.25, plinthSpan);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: isTopDown ? 0xffffff : 0x1e2229,
      roughness: 0.9,
      metalness: 0.05,
    });
    plinthMaterialRef.current = plinthMat;

    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.set(0, -0.125, 0);
    cityGroup.add(plinthMesh);
    plinthMeshRef.current = plinthMesh;

    // 7. Optional Center Content Badge
    if (options.centerContent && options.centerContent.type !== 'none') {
      const badgeTex = createCenterBadgeTexture(options.centerContent);
      if (badgeTex) {
        const badgeSpan = Math.max(4, Math.floor(matrixSize * 0.22));
        const badgeGeo = new THREE.PlaneGeometry(badgeSpan, badgeSpan);
        const badgeMat = new THREE.MeshBasicMaterial({
          map: badgeTex,
          transparent: true,
          side: THREE.DoubleSide,
        });
        const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
        badgeMesh.rotation.x = -Math.PI / 2;
        badgeMesh.position.set(0, 0.025, 0);

        cityGroup.add(badgeMesh);
        centerBadgeMeshRef.current = badgeMesh;
      }
    }
  }, [matrix, matrixSize, options.centerContent]);

  // Desktop Mouse Pointer Handlers (strictly mouse, touch handled natively)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    pointerState.current = {
      isDown: true,
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      pinchDist: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !pointerState.current.isDown) return;

    const dx = e.clientX - pointerState.current.lastX;
    const totalDist = Math.hypot(
      e.clientX - pointerState.current.startX,
      e.clientY - pointerState.current.startY
    );

    // Movement threshold (6px) distinguishes click from drag
    if (totalDist > 6) {
      pointerState.current.isDragging = true;
    }

    if (pointerState.current.isDragging) {
      cityRotation.current.targetY += dx * 0.008;
      pointerState.current.lastX = e.clientX;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (pointerState.current.isDown && !pointerState.current.isDragging) {
      // Clean desktop click triggers reveal transition
      onSceneClick();
    }
    pointerState.current.isDown = false;
    pointerState.current.isDragging = false;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing select-none relative"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
