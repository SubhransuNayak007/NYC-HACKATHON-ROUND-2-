"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export type MascotMode =
  | "idle"
  | "email_focused"
  | "password_focused"
  | "password_peeking"
  | "submitting"
  | "success";

export interface ThreeYetiMascotProps {
  mode?: MascotMode;
  charCount?: number;
  typingProgress?: number; // 0 to 1 across form
}

// ── 2ND-ORDER SPRING-DAMPER PHYSICS SOLVER ──
class SpringDamper {
  target: number;
  current: number;
  velocity: number;
  stiffness: number;
  damping: number;
  mass: number;

  constructor(initial = 0, stiffness = 120, damping = 14, mass = 1.0) {
    this.target = initial;
    this.current = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = Math.max(0.001, mass);
  }

  setTarget(t: number) {
    this.target = t;
  }

  snapTo(v: number) {
    this.current = v;
    this.target = v;
    this.velocity = 0;
  }

  impulse(v: number) {
    this.velocity += v;
  }

  update(dt: number): number {
    const maxSubDt = 0.016;
    let remaining = Math.min(dt, 0.08);
    while (remaining > 0) {
      const step = Math.min(remaining, maxSubDt);
      const springForce = -this.stiffness * (this.current - this.target);
      const dampingForce = -this.damping * this.velocity;
      const accel = (springForce + dampingForce) / this.mass;
      this.velocity += accel * step;
      this.current += this.velocity * step;
      remaining -= step;
    }
    return this.current;
  }
}

export function ThreeYetiMascot({
  mode = "idle",
  charCount = 0,
  typingProgress = 0,
}: ThreeYetiMascotProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<MascotMode>(mode);
  const charCountRef = useRef<number>(charCount);
  const typingProgressRef = useRef<number>(typingProgress);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    charCountRef.current = charCount;
  }, [charCount]);

  useEffect(() => {
    typingProgressRef.current = typingProgress;
  }, [typingProgress]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 540;

    // ── SCENE & CAMERA ──
    const scene = new THREE.Scene();

    // 1. Bright Sunny Blue Sky Background Gradient
    const createSkyBackground = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 512;
      cvs.height = 512;
      const ctx = cvs.getContext("2d")!;
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, "#38bdf8"); // Vivid sky blue
      grad.addColorStop(0.4, "#7dd3fc"); // Soft daylight
      grad.addColorStop(0.75, "#bae6fd"); // Horizon glow
      grad.addColorStop(1.0, "#e0f2fe"); // Bright horizon
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      return new THREE.CanvasTexture(cvs);
    };
    scene.background = createSkyBackground();

    // 2. Camera setup (zoomed for full character & landscape visibility)
    const camera = new THREE.PerspectiveCamera(38, Math.max(0.1, width / height), 0.1, 100);
    camera.position.set(0, 0.1, 4.8);
    camera.lookAt(0, -0.05, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    // ── PROCEDURAL HIGH-RESOLUTION FUR TEXTURES ──
    // 1. High-frequency Fur Normal Map (thousands of dense wavy fibers)
    const createFurNormal = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 512;
      cvs.height = 512;
      const ctx = cvs.getContext("2d")!;
      const imgData = ctx.createImageData(512, 512);
      const data = imgData.data;
      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 512; x++) {
          const idx = (y * 512 + x) * 4;
          const nx = x / 512;
          const ny = y / 512;
          const fiber1 = Math.sin(nx * 180 + Math.cos(ny * 90) * 4) * 0.35;
          const fiber2 = Math.sin(nx * 320 + ny * 160) * 0.25;
          const curl = Math.sin(ny * 45 + fiber1 * 3) * 0.25;
          const val = 0.5 + fiber1 * 0.25 + fiber2 * 0.15 + curl * 0.15;
          data[idx] = 128 + Math.sin(val * Math.PI * 2) * 65;
          data[idx + 1] = 128 + Math.cos(val * Math.PI * 2) * 65;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(cvs);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      return tex;
    };

    // 2. Soft Contact Shadow Map for Feet
    const createContactShadowTex = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 256;
      cvs.height = 256;
      const ctx = cvs.getContext("2d")!;
      const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
      grad.addColorStop(0, "rgba(20, 55, 20, 0.75)");
      grad.addColorStop(0.35, "rgba(30, 75, 30, 0.45)");
      grad.addColorStop(0.7, "rgba(40, 95, 40, 0.15)");
      grad.addColorStop(1, "rgba(50, 100, 50, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(cvs);
    };

    const furNormalTex = createFurNormal();
    const contactShadowTex = createContactShadowTex();

    // ── LIGHTING: WARM SUNLIGHT + SOFT SKY AMBIENT + RIM GLOW ──
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x4ade80, 1.3);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    sunLight.position.set(3.5, 5.5, 4.2);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);

    // Warm Sun Fill
    const fillLight = new THREE.DirectionalLight(0xffedd5, 0.9);
    fillLight.position.set(-3.0, 2.0, 3.0);
    scene.add(fillLight);

    // Soft Rim Light on fluffy fur edges
    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 2.8);
    rimLight.position.set(-3.5, 4.0, -3.5);
    scene.add(rimLight);

    // ── ENVIRONMENT: LUSH GRASS MEADOW & DEPTH ──
    const groundGeo = new THREE.PlaneGeometry(16, 14, 32, 32);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const wave = Math.sin(x * 0.4 + 0.4) * 0.08 - (z + 1.2) * 0.04;
      pos.setY(i, wave);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4fa84f, // Lush natural green
      roughness: 0.88,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -0.92, -1.0);
    ground.receiveShadow = true;
    scene.add(ground);

    // Distant Rolling Meadow Hill
    const hillGeo = new THREE.SphereGeometry(8.0, 32, 32);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x418a41,
      roughness: 0.92,
    });
    const backHill = new THREE.Mesh(hillGeo, hillMat);
    backHill.position.set(0, -7.8, -4.5);
    backHill.scale.set(1.4, 0.8, 1.0);
    scene.add(backHill);

    // Scattered Little Meadow Daisy Blooms
    const flowerGroup = new THREE.Group();
    scene.add(flowerGroup);
    const flowerGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.015, 8);
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const flowerCenterMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3 });

    const flowerCoords = [
      [-1.3, -0.9, 0.8],
      [-1.55, -0.88, 1.2],
      [-0.85, -0.91, 1.4],
      [1.25, -0.9, 0.9],
      [1.6, -0.88, 1.3],
      [0.95, -0.92, 1.5],
    ];

    flowerCoords.forEach(([fx, fy, fz]) => {
      const fl = new THREE.Mesh(flowerGeo, flowerMat);
      fl.position.set(fx, fy, fz);
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), flowerCenterMat);
      center.position.set(fx, fy + 0.015, fz);
      flowerGroup.add(fl);
      flowerGroup.add(center);
    });

    // ── VOLUMETRIC PUFFY CLOUDS ──
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.02,
      transparent: true,
      opacity: 0.94,
    });

    const createPuffyCloud = (x: number, y: number, z: number, scale: number) => {
      const cg = new THREE.Group();
      const parts = [
        { r: 0.55, pos: [0, 0, 0] },
        { r: 0.42, pos: [-0.45, -0.1, 0] },
        { r: 0.46, pos: [0.46, -0.06, 0] },
        { r: 0.35, pos: [0.8, -0.18, 0] },
        { r: 0.32, pos: [-0.78, -0.18, 0] },
      ];
      parts.forEach(({ r, pos }) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), cloudMat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        cg.add(mesh);
      });
      cg.position.set(x, y, z);
      cg.scale.set(scale, scale * 0.72, scale);
      scene.add(cg);
      return cg;
    };

    const cloud1 = createPuffyCloud(-2.2, 1.6, -3.0, 1.15);
    const cloud2 = createPuffyCloud(2.4, 1.9, -4.0, 1.45);
    const cloud3 = createPuffyCloud(-0.7, 2.4, -5.0, 1.65);

    // ── CELEBRATION SPARKLES / CONFETTI ──
    const sparkleCount = 36;
    const sparkleGroup = new THREE.Group();
    sparkleGroup.visible = false;
    scene.add(sparkleGroup);

    const sparkleGeo = new THREE.OctahedronGeometry(0.08, 0);
    const sparkleColors = [0xffd166, 0x06d6a0, 0x118ab2, 0xff70a6, 0xff9f1c];
    const sparkleMeshes: Array<{
      mesh: THREE.Mesh;
      vx: number;
      vy: number;
      vz: number;
      rotV: THREE.Vector3;
      originY: number;
    }> = [];

    for (let i = 0; i < sparkleCount; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: sparkleColors[i % sparkleColors.length],
        roughness: 0.2,
        metalness: 0.8,
        emissive: sparkleColors[i % sparkleColors.length],
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(sparkleGeo, mat);
      mesh.scale.setScalar(Math.random() * 0.6 + 0.6);
      sparkleGroup.add(mesh);
      sparkleMeshes.push({
        mesh,
        vx: (Math.random() - 0.5) * 2.2,
        vy: Math.random() * 2.5 + 1.2,
        vz: (Math.random() - 0.5) * 1.5,
        rotV: new THREE.Vector3(
          Math.random() * 4 - 2,
          Math.random() * 4 - 2,
          Math.random() * 4 - 2
        ),
        originY: Math.random() * 0.5 - 0.2,
      });
    }

    // ── CHARACTER ROOT RIG (FITTED FOR VIEWPORT) ──
    const yetiRoot = new THREE.Group();
    yetiRoot.position.set(0, 0.05, 0);
    yetiRoot.scale.setScalar(0.70);
    scene.add(yetiRoot);

    // ── HIGH-FIDELITY FLUFFY MATERIALS (VELVET SHEEN & MATTE FUR) ──
    const furMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfcfdff, // Pure soft white with subtle cream warmth
      roughness: 0.94, // Ultra-soft matte, zero plastic specular
      metalness: 0.0,
      sheen: 1.0, // Microfiber velvet edge halo
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color(0xfff6ea),
      normalMap: furNormalTex,
      normalScale: new THREE.Vector2(0.5, 0.5),
    });

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0x82bfe8, // Soft pastel sky blue face & hands
      roughness: 0.62,
      metalness: 0.02,
    });

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x06080e, // Deep glossy black
      roughness: 0.03,
      metalness: 0.25,
    });

    const glintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const blushMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8da1,
      roughness: 0.75,
      transparent: true,
      opacity: 0.35,
    });

    const noseMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90e2, // Cute soft blue button nose
      roughness: 0.35,
      metalness: 0.08,
    });

    const mouthMaterial = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.4,
    });

    // ── BODY / TORSO RIG (WITH VOLUMETRIC FUR LAYERS) ──
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.38, 0);
    yetiRoot.add(bodyGroup);

    // Main Fluffy Torso
    const bodyGeo = new THREE.SphereGeometry(0.86, 32, 32);
    bodyGeo.scale(1.08, 1.18, 0.96);
    const bodyMesh = new THREE.Mesh(bodyGeo, furMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyGroup.add(bodyMesh);

    // Volumetric Belly & Chest Fluff Ruff
    const bellyRuff = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 24),
      furMaterial
    );
    bellyRuff.scale.set(1.15, 0.95, 0.6);
    bellyRuff.position.set(0, 0.08, 0.65);
    bodyGroup.add(bellyRuff);

    // Fluffy Side Hip Tufts
    const hipTuftL = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), furMaterial);
    hipTuftL.scale.set(0.9, 1.2, 0.8);
    hipTuftL.position.set(-0.75, -0.25, 0.1);
    bodyGroup.add(hipTuftL);

    const hipTuftR = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), furMaterial);
    hipTuftR.scale.set(0.9, 1.2, 0.8);
    hipTuftR.position.set(0.75, -0.25, 0.1);
    bodyGroup.add(hipTuftR);

    // ── LEGS & GROUNDED FEET ──
    const legGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 20);
    const leftLeg = new THREE.Mesh(legGeo, furMaterial);
    leftLeg.position.set(-0.4, -1.15, 0.05);
    leftLeg.rotation.z = 0.06;
    leftLeg.castShadow = true;
    yetiRoot.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, furMaterial);
    rightLeg.position.set(0.4, -1.15, 0.05);
    rightLeg.rotation.z = -0.06;
    rightLeg.castShadow = true;
    yetiRoot.add(rightLeg);

    // Feet (Ankles in white fur + Soft Blue Toes planted firmly)
    const createFoot = (x: number, isLeft: boolean) => {
      const footGroup = new THREE.Group();
      footGroup.position.set(x, -1.32, 0.15);

      // Fluffy White Ankle Cuff
      const ankle = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 20, 20),
        furMaterial
      );
      ankle.scale.set(1.1, 0.7, 1.2);
      footGroup.add(ankle);

      // Soft Blue Toes
      const toeOffsets = [-0.12, -0.04, 0.04, 0.12];
      toeOffsets.forEach((toex) => {
        const toe = new THREE.Mesh(
          new THREE.SphereGeometry(0.065, 12, 12),
          skinMaterial
        );
        toe.scale.set(0.9, 0.8, 1.2);
        toe.position.set(toex, -0.06, 0.28);
        footGroup.add(toe);
      });

      // Dedicated Foot Contact Shadow Plane
      const shadowMat = new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      const footShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), shadowMat);
      footShadow.rotation.x = -Math.PI / 2;
      footShadow.position.set(0, -0.12, 0.05);
      footGroup.add(footShadow);

      return footGroup;
    };

    const leftFoot = createFoot(-0.42, true);
    const rightFoot = createFoot(0.42, false);
    yetiRoot.add(leftFoot);
    yetiRoot.add(rightFoot);

    // ── HEAD RIG (FLUFFY SILHOUETTE & FACIAL FEATURES) ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.55, 0.05);
    yetiRoot.add(headGroup);

    // Main Head Sphere
    const headGeo = new THREE.SphereGeometry(0.84, 32, 32);
    headGeo.scale(1.12, 0.98, 1.02);
    const headFur = new THREE.Mesh(headGeo, furMaterial);
    headFur.castShadow = true;
    headGroup.add(headFur);

    // ── CROWN OF FLUFFY FUR TUFTS (AS IN REFERENCE ANIMATION) ──
    const createFurTuft = (
      x: number,
      y: number,
      z: number,
      rx: number,
      ry: number,
      rz: number,
      sx: number,
      sy: number,
      sz: number
    ) => {
      const tuft = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        furMaterial
      );
      tuft.scale.set(sx, sy, sz);
      tuft.position.set(x, y, z);
      tuft.rotation.set(rx, ry, rz);
      headGroup.add(tuft);
      return tuft;
    };

    // 7 Asymmetric Organic Hair Tufts forming fluffy silhouette
    createFurTuft(0, 0.88, 0.02, -0.1, 0, 0.05, 0.75, 1.35, 0.7); // Main center crest
    createFurTuft(-0.25, 0.82, -0.04, -0.15, 0.1, 0.35, 0.65, 1.15, 0.6); // Left crest
    createFurTuft(0.24, 0.8, -0.04, -0.15, -0.1, -0.32, 0.65, 1.15, 0.6); // Right crest
    createFurTuft(-0.45, 0.65, -0.08, -0.2, 0.2, 0.55, 0.6, 0.95, 0.55); // Left lower tuft
    createFurTuft(0.45, 0.63, -0.08, -0.2, -0.2, -0.52, 0.6, 0.95, 0.55); // Right lower tuft
    createFurTuft(-0.12, 0.94, -0.06, -0.05, 0, 0.15, 0.55, 1.05, 0.5); // Top crown accent
    createFurTuft(0.14, 0.92, -0.06, -0.05, 0, -0.12, 0.55, 1.05, 0.5); // Top crown accent

    // Fluffy Cheek Fur Clusters
    createFurTuft(-0.72, -0.08, 0.3, 0.1, 0.4, 0.45, 0.7, 0.85, 0.65); // Left cheek ruff
    createFurTuft(0.72, -0.08, 0.3, 0.1, -0.4, -0.45, 0.7, 0.85, 0.65); // Right cheek ruff

    // ── ROUNDED EARS WITH INNER BLUE ──
    const earGeo = new THREE.SphereGeometry(0.26, 20, 20);
    earGeo.scale(0.7, 1.1, 0.6);

    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(-0.85, 0.35, -0.1);
    headGroup.add(leftEarGroup);

    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.rotation.z = -0.35;
    leftEarGroup.add(leftEar);

    const leftInnerEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      skinMaterial
    );
    leftInnerEar.position.set(0.03, 0, 0.07);
    leftInnerEar.scale.set(0.6, 0.9, 0.4);
    leftInnerEar.rotation.z = -0.35;
    leftEarGroup.add(leftInnerEar);

    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(0.85, 0.35, -0.1);
    headGroup.add(rightEarGroup);

    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.rotation.z = 0.35;
    rightEarGroup.add(rightEar);

    const rightInnerEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      skinMaterial
    );
    rightInnerEar.position.set(-0.03, 0, 0.07);
    rightInnerEar.scale.set(0.6, 0.9, 0.4);
    rightInnerEar.rotation.z = 0.35;
    rightEarGroup.add(rightInnerEar);

    // ── SOFT SKY BLUE FACE MASK ──
    const faceMaskGeo = new THREE.SphereGeometry(0.62, 32, 32);
    faceMaskGeo.scale(1.05, 0.88, 0.58);
    const faceMask = new THREE.Mesh(faceMaskGeo, skinMaterial);
    faceMask.position.set(0, -0.02, 0.54);
    headGroup.add(faceMask);

    // Cute Soft Blue Button Nose
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      noseMaterial
    );
    nose.scale.set(1.4, 0.8, 0.75);
    nose.position.set(0, -0.05, 0.86);
    headGroup.add(nose);

    // Rosy Cheeks
    const cheekGeo = new THREE.SphereGeometry(0.12, 16, 16);
    cheekGeo.scale(1.2, 0.7, 0.3);

    const leftCheek = new THREE.Mesh(cheekGeo, blushMaterial);
    leftCheek.position.set(-0.38, -0.15, 0.76);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, blushMaterial);
    rightCheek.position.set(0.38, -0.15, 0.76);
    headGroup.add(rightCheek);

    // Smiling Mouth
    const initialCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.24, -0.2, 0.79),
      new THREE.Vector3(-0.12, -0.26, 0.82),
      new THREE.Vector3(0, -0.27, 0.84),
      new THREE.Vector3(0.12, -0.26, 0.82),
      new THREE.Vector3(0.24, -0.2, 0.79),
    ]);
    const mouthGeo = new THREE.TubeGeometry(initialCurve, 24, 0.026, 8, false);
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMaterial);
    headGroup.add(mouthMesh);

    // ── EXPRESSIVE 3D EYES & DUAL GLINTS ──
    const eyeSocketL = new THREE.Group();
    eyeSocketL.position.set(-0.25, 0.1, 0.74);
    headGroup.add(eyeSocketL);

    const eyeSocketR = new THREE.Group();
    eyeSocketR.position.set(0.25, 0.1, 0.74);
    headGroup.add(eyeSocketR);

    // Glossy Eyeballs
    const eyeBallGeo = new THREE.SphereGeometry(0.155, 24, 24);
    const leftEyeBall = new THREE.Mesh(eyeBallGeo, eyeMaterial);
    eyeSocketL.add(leftEyeBall);

    const rightEyeBall = new THREE.Mesh(eyeBallGeo, eyeMaterial);
    eyeSocketR.add(rightEyeBall);

    // Crisp Specular Reflection Glints
    const glint1L = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), glintMaterial);
    glint1L.position.set(0.045, 0.05, 0.12);
    leftEyeBall.add(glint1L);

    const glint2L = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), glintMaterial);
    glint2L.position.set(-0.04, -0.04, 0.13);
    leftEyeBall.add(glint2L);

    const glint1R = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), glintMaterial);
    glint1R.position.set(0.045, 0.05, 0.12);
    rightEyeBall.add(glint1R);

    const glint2R = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), glintMaterial);
    glint2R.position.set(-0.04, -0.04, 0.13);
    rightEyeBall.add(glint2R);

    // Soft Eyelids for Blinking
    const eyelidGeo = new THREE.SphereGeometry(
      0.165,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.5
    );
    const leftEyelid = new THREE.Mesh(eyelidGeo, skinMaterial);
    leftEyelid.rotation.x = -Math.PI * 0.5;
    eyeSocketL.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, skinMaterial);
    rightEyelid.rotation.x = -Math.PI * 0.5;
    eyeSocketR.add(rightEyelid);

    // ── ARMS & DETAILED HAND RIG (4 FINGERS + THUMB IN HELLO WAVE) ──
    // 1. Right Arm (Resting naturally at side)
    const rightShoulderGroup = new THREE.Group();
    rightShoulderGroup.position.set(0.65, -0.1, 0);
    yetiRoot.add(rightShoulderGroup);

    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.55, 16),
      furMaterial
    );
    rightUpperArm.position.set(0.08, -0.25, 0.05);
    rightUpperArm.rotation.z = -0.12;
    rightShoulderGroup.add(rightUpperArm);

    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0.15, -0.5, 0.08);
    rightShoulderGroup.add(rightForearmGroup);

    // White fur wrist cuff
    const rightCuff = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), furMaterial);
    rightCuff.scale.set(1.1, 0.7, 1.0);
    rightForearmGroup.add(rightCuff);

    const rightWristGroup = new THREE.Group();
    rightWristGroup.position.set(0, -0.18, 0);
    rightForearmGroup.add(rightWristGroup);

    // Soft Blue Resting Paw
    const rightHandPalm = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 20, 20),
      skinMaterial
    );
    rightHandPalm.scale.set(1.05, 0.9, 0.7);
    rightWristGroup.add(rightHandPalm);

    const rightFingerDefs = [
      { x: -0.1, y: -0.14, rotZ: 0.1 },
      { x: -0.03, y: -0.16, rotZ: 0.05 },
      { x: 0.04, y: -0.15, rotZ: -0.05 },
      { x: 0.11, y: -0.12, rotZ: -0.15 },
    ];
    rightFingerDefs.forEach(({ x, y, rotZ }) => {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045, 0.09, 8, 8),
        skinMaterial
      );
      finger.position.set(x, y, 0.02);
      finger.rotation.z = rotZ;
      rightWristGroup.add(finger);
    });

    const rightThumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.045, 0.08, 8, 8),
      skinMaterial
    );
    rightThumb.position.set(-0.14, -0.05, 0.05);
    rightThumb.rotation.z = 0.8;
    rightWristGroup.add(rightThumb);

    // 2. Left Arm (Organic Greeting Wave)
    const leftShoulderGroup = new THREE.Group();
    leftShoulderGroup.position.set(-0.65, -0.05, 0.05);
    yetiRoot.add(leftShoulderGroup);

    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.55, 16),
      furMaterial
    );
    leftUpperArm.position.set(-0.15, 0.15, 0.05);
    leftUpperArm.rotation.z = 0.75;
    leftUpperArm.rotation.x = -0.1;
    leftShoulderGroup.add(leftUpperArm);

    const leftForearmGroup = new THREE.Group();
    leftForearmGroup.position.set(-0.3, 0.35, 0.12);
    leftShoulderGroup.add(leftForearmGroup);

    const leftForearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.17, 0.4, 16),
      furMaterial
    );
    leftForearm.position.set(0, 0.1, 0);
    leftForearm.rotation.z = -0.1;
    leftForearmGroup.add(leftForearm);

    // White fur wrist cuff
    const leftCuff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), furMaterial);
    leftCuff.scale.set(1.1, 0.7, 1.0);
    leftCuff.position.set(0, 0.22, 0);
    leftForearmGroup.add(leftCuff);

    const leftWristGroup = new THREE.Group();
    leftWristGroup.position.set(0, 0.26, 0);
    leftForearmGroup.add(leftWristGroup);

    // Soft Blue Waving Palm
    const leftHandPalm = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 20, 20),
      skinMaterial
    );
    leftHandPalm.scale.set(1.1, 1.0, 0.65);
    leftWristGroup.add(leftHandPalm);

    // 4 Articulated Fingers fanned upward
    const leftFingers: THREE.Mesh[] = [];
    const fingerDefs = [
      { x: -0.12, y: 0.18, rotZ: 0.3 },
      { x: -0.04, y: 0.21, rotZ: 0.1 },
      { x: 0.04, y: 0.2, rotZ: -0.1 },
      { x: 0.12, y: 0.15, rotZ: -0.3 },
    ];
    fingerDefs.forEach(({ x, y, rotZ }) => {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.048, 0.1, 8, 8),
        skinMaterial
      );
      finger.position.set(x, y, 0.02);
      finger.rotation.z = rotZ;
      leftWristGroup.add(finger);
      leftFingers.push(finger);
    });

    // Thumb angled naturally outward
    const leftThumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.048, 0.08, 8, 8),
      skinMaterial
    );
    leftThumb.position.set(-0.18, 0.05, 0.03);
    leftThumb.rotation.z = 1.0;
    leftWristGroup.add(leftThumb);
    leftFingers.push(leftThumb);

    // ── SHY / PASSWORD EYE COVERING PAWS OVERLAY ──
    const shyPawsGroup = new THREE.Group();
    shyPawsGroup.position.set(0, 0.55, 0.95);
    shyPawsGroup.visible = false;
    yetiRoot.add(shyPawsGroup);

    const createShyPaw = (x: number, rotZ: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0.05, 0);

      // Fluffy wrist cuff
      const cuff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), furMaterial);
      cuff.scale.set(1.0, 0.7, 0.8);
      g.add(cuff);

      // Blue palm covering eyes
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMaterial);
      paw.scale.set(1.1, 1.0, 0.65);
      paw.rotation.z = rotZ;
      g.add(paw);

      // Fingers
      [-0.1, -0.03, 0.04, 0.11].forEach((fx) => {
        const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.08, 8, 8), skinMaterial);
        f.position.set(fx, 0.14, 0.04);
        g.add(f);
      });

      return g;
    };

    const shyPawLGroup = createShyPaw(-0.28, -0.35);
    const shyPawRGroup = createShyPaw(0.28, 0.35);
    shyPawsGroup.add(shyPawLGroup);
    shyPawsGroup.add(shyPawRGroup);

    // ── SECOND-ORDER PHYSICS RIG INSTANCES ──
    const springHeadRotY = new SpringDamper(0, 110, 14, 1.0);
    const springHeadRotX = new SpringDamper(0, 110, 14, 1.0);
    const springHeadRotZ = new SpringDamper(0, 110, 14, 1.0);

    const springEyeX = new SpringDamper(0, 220, 18, 0.5);
    const springEyeY = new SpringDamper(0, 220, 18, 0.5);

    const springLeftEyelid = new SpringDamper(-Math.PI * 0.5, 340, 22, 0.4);
    const springRightEyelid = new SpringDamper(-Math.PI * 0.5, 340, 22, 0.4);

    const springLeftEarWiggle = new SpringDamper(0, 160, 10, 0.6);
    const springRightEarWiggle = new SpringDamper(0, 160, 10, 0.6);

    const springBodyLeanX = new SpringDamper(0, 80, 16, 1.5);
    const springBodyLeanY = new SpringDamper(0, 80, 16, 1.5);
    const springBodyLeanZ = new SpringDamper(0, 80, 16, 1.5);

    const springBlushOpacity = new SpringDamper(0.35, 100, 15, 1.0);
    const springBlushScale = new SpringDamper(1.0, 100, 15, 1.0);

    const springJumpY = new SpringDamper(0, 180, 12, 1.0);
    const springShyPawsY = new SpringDamper(-0.8, 140, 14, 1.0);
    const springShyPawsScale = new SpringDamper(0.2, 140, 14, 1.0);

    // ── INTERACTION STATE & POINTER TRACKING ──
    let mouseX = 0;
    let mouseY = 0;
    let isBlinking = false;
    let blinkTimeout: NodeJS.Timeout;
    let secondaryBlinkTimeout: NodeJS.Timeout;
    let celebrationTriggered = false;

    const scheduleBlink = () => {
      const delay = Math.random() * 3200 + 2000;
      blinkTimeout = setTimeout(() => {
        isBlinking = true;
        secondaryBlinkTimeout = setTimeout(() => {
          isBlinking = false;
          scheduleBlink();
        }, 140);
      }, delay);
    };
    scheduleBlink();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      mouseX = (clientX / rect.width) * 2 - 1;
      mouseY = -(clientY / rect.height) * 2 + 1;
    };

    window.addEventListener("pointermove", handlePointerMove);

    // ── ANIMATION & RENDER LOOP ──
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const currentTime = now * 0.001;

      const currentMode = modeRef.current;
      const currentTypingProgress = typingProgressRef.current;

      // ── TARGET SOLVER ──
      let tHeadY = 0;
      let tHeadX = 0;
      let tHeadZ = 0;

      let tEyeX = 0;
      let tEyeY = 0;

      let tBodyLeanX = 0;
      let tBodyLeanY = 0;
      let tBodyLeanZ = 0;

      let tBlushOp = 0.35;
      let tBlushSc = 1.0;

      let tShyPawsY = -0.8;
      let tShyPawsScale = 0.2;
      let shyPawsShouldBeVisible = false;

      if (currentMode === "idle") {
        tHeadY = mouseX * 0.35;
        tHeadX = -mouseY * 0.22;
        tHeadZ = -mouseX * 0.08;

        tEyeX = mouseX * 0.48;
        tEyeY = mouseY * 0.38;

        tBodyLeanX = mouseX * 0.08;
        tBodyLeanZ = -mouseX * 0.05;

        tBlushOp = 0.35;
        tBlushSc = 1.0;
        shyPawsShouldBeVisible = false;
        sparkleGroup.visible = false;
        celebrationTriggered = false;
      } else if (currentMode === "email_focused") {
        const trackingOffset = (currentTypingProgress - 0.5) * 0.38;
        tHeadY = -0.22 + trackingOffset;
        tHeadX = -0.25;
        tHeadZ = 0.05;

        tEyeX = -0.3 + trackingOffset * 0.8;
        tEyeY = -0.42;

        tBodyLeanX = -0.06;
        tBodyLeanY = -0.02;

        tBlushOp = 0.45;
        tBlushSc = 1.08;
        shyPawsShouldBeVisible = false;
        sparkleGroup.visible = false;
      } else if (currentMode === "password_focused") {
        tHeadY = 0;
        tHeadX = -0.15;
        tHeadZ = 0;

        tEyeX = 0;
        tEyeY = -0.3;

        tBlushOp = 0.85;
        tBlushSc = 1.35;

        tShyPawsY = 0.0;
        tShyPawsScale = 1.0;
        shyPawsShouldBeVisible = true;
        sparkleGroup.visible = false;
      } else if (currentMode === "password_peeking") {
        tHeadY = 0.22;
        tHeadX = -0.08;
        tHeadZ = 0.05;

        tEyeX = 0.38;
        tEyeY = 0.1;

        tBlushOp = 0.65;
        tBlushSc = 1.2;

        tShyPawsY = 0.0;
        tShyPawsScale = 1.0;
        shyPawsShouldBeVisible = true;
        sparkleGroup.visible = false;
      } else if (currentMode === "submitting" || currentMode === "success") {
        tHeadY = Math.sin(currentTime * 8) * 0.1;
        tHeadX = 0.15;
        tHeadZ = Math.sin(currentTime * 4) * 0.08;

        tEyeX = 0;
        tEyeY = 0.2;

        tBlushOp = 0.65;
        tBlushSc = 1.2;

        shyPawsShouldBeVisible = false;
        sparkleGroup.visible = true;

        if (!celebrationTriggered) {
          celebrationTriggered = true;
          springJumpY.impulse(4.5);
          springLeftEarWiggle.impulse(0.5);
          springRightEarWiggle.impulse(-0.5);
        }
      }

      // ── DUAL HARMONIC BREATHING ENGINE ──
      const breathPrimary = Math.sin(currentTime * 1.5) * 0.01;
      const breathSecondary = Math.sin(currentTime * 3.0 + 0.45) * 0.005;
      const breathTotal = breathPrimary + breathSecondary;

      // ── UPDATE SPRINGS ──
      springHeadRotY.setTarget(tHeadY);
      springHeadRotX.setTarget(tHeadX);
      springHeadRotZ.setTarget(tHeadZ);

      springEyeX.setTarget(tEyeX);
      springEyeY.setTarget(tEyeY);

      springBodyLeanX.setTarget(tBodyLeanX);
      springBodyLeanY.setTarget(tBodyLeanY);
      springBodyLeanZ.setTarget(tBodyLeanZ);

      springBlushOpacity.setTarget(tBlushOp);
      springBlushScale.setTarget(tBlushSc);

      springShyPawsY.setTarget(tShyPawsY);
      springShyPawsScale.setTarget(tShyPawsScale);

      // Blinking & Eyelid Targets
      if (currentMode === "password_focused") {
        springLeftEyelid.setTarget(0.14);
        springRightEyelid.setTarget(0.14);
      } else if (currentMode === "password_peeking") {
        springLeftEyelid.setTarget(-Math.PI * 0.18);
        springRightEyelid.setTarget(-Math.PI * 0.48);
      } else {
        if (isBlinking) {
          springLeftEyelid.setTarget(0.12);
          springRightEyelid.setTarget(0.12);
        } else {
          springLeftEyelid.setTarget(-Math.PI * 0.5);
          springRightEyelid.setTarget(-Math.PI * 0.5);
        }
      }

      const curHeadY = springHeadRotY.update(dt);
      const curHeadX = springHeadRotX.update(dt);
      const curHeadZ = springHeadRotZ.update(dt);

      const curEyeX = springEyeX.update(dt);
      const curEyeY = springEyeY.update(dt);

      const curLeftEyelid = springLeftEyelid.update(dt);
      const curRightEyelid = springRightEyelid.update(dt);

      const curBodyX = springBodyLeanX.update(dt);
      const curBodyY = springBodyLeanY.update(dt);
      const curBodyZ = springBodyLeanZ.update(dt);

      const curBlushOp = springBlushOpacity.update(dt);
      const curBlushSc = springBlushScale.update(dt);

      const curJumpY = Math.max(0, springJumpY.update(dt));
      const curShyY = springShyPawsY.update(dt);
      const curShySc = springShyPawsScale.update(dt);

      // Ears lag behind head rotation
      springLeftEarWiggle.setTarget(-curHeadY * 0.3);
      springRightEarWiggle.setTarget(-curHeadY * 0.3);

      const curLeftEarWiggle = springLeftEarWiggle.update(dt);
      const springRightEarWiggleVal = springRightEarWiggle.update(dt);

      // ── APPLY PHYSICS TO HEAD & RIG ──
      headGroup.rotation.y = curHeadY;
      headGroup.rotation.x = curHeadX + breathTotal * 0.8;
      headGroup.rotation.z = curHeadZ;

      leftEarGroup.rotation.z = curLeftEarWiggle + Math.sin(currentTime * 2.0) * 0.02;
      rightEarGroup.rotation.z = springRightEarWiggleVal - Math.sin(currentTime * 2.0) * 0.02;

      // Apply Breathing & Position
      yetiRoot.scale.y = 0.70 * (1.0 + breathTotal);
      yetiRoot.rotation.z = Math.sin(currentTime * 1.2) * 0.01;

      yetiRoot.position.set(curBodyX, 0.05 + curBodyY + curJumpY + breathTotal * 0.1, curBodyZ);
      bodyMesh.scale.set(
        1.08 + breathTotal * 0.2,
        1.18 + breathTotal * 0.1,
        0.96 + breathTotal * 0.2
      );

      // ── APPLY EYE SACCADES & EYELIDS ──
      leftEyeBall.rotation.y = curEyeX;
      leftEyeBall.rotation.x = -curEyeY;

      rightEyeBall.rotation.y = curEyeX;
      rightEyeBall.rotation.x = -curEyeY;

      leftEyelid.rotation.x = curLeftEyelid;
      rightEyelid.rotation.x = curRightEyelid;

      // ── APPLY BLUSH OPACITY & SCALE ──
      blushMaterial.opacity = curBlushOp;
      leftCheek.scale.set(1.2 * curBlushSc, 0.7 * curBlushSc, 0.3 * curBlushSc);
      rightCheek.scale.set(1.2 * curBlushSc, 0.7 * curBlushSc, 0.3 * curBlushSc);

      // ── SHY PAWS DISPLAY & PEEK TRANSITIONS ──
      shyPawsGroup.visible = shyPawsShouldBeVisible;
      if (shyPawsShouldBeVisible) {
        shyPawsGroup.position.y = curShyY;
        shyPawsGroup.scale.setScalar(curShySc);

        if (currentMode === "password_peeking") {
          shyPawRGroup.position.set(0.36, -0.15, 0.05);
          shyPawRGroup.rotation.z = 0.55;
          shyPawLGroup.position.set(-0.28, 0.05, 0);
          shyPawLGroup.rotation.z = -0.35;
        } else {
          shyPawRGroup.position.set(0.28, 0.05, 0);
          shyPawRGroup.rotation.z = 0.35;
          shyPawLGroup.position.set(-0.28, 0.05, 0);
          shyPawLGroup.rotation.z = -0.35;
        }
      }

      // ── FOREARM & WRIST KINEMATICS (HELLO WAVING GESTURE) ──
      if (currentMode === "password_focused" || currentMode === "password_peeking") {
        leftShoulderGroup.visible = false;
        rightShoulderGroup.visible = false;
      } else {
        leftShoulderGroup.visible = true;
        rightShoulderGroup.visible = true;

        if (currentMode === "idle" || currentMode === "email_focused") {
          const wavePhase = currentTime * 2.5;
          leftUpperArm.rotation.z = 0.75 + Math.sin(currentTime * 1.5) * 0.02;
          leftForearmGroup.rotation.z = -0.1;
          leftForearmGroup.rotation.y = 0;

          leftWristGroup.rotation.z = Math.sin(wavePhase) * 0.15;

          leftFingers.forEach((finger, i) => {
            finger.rotation.x = Math.sin(wavePhase - 0.5 + i * 0.1) * 0.05;
          });

          rightUpperArm.rotation.z = -0.12 + Math.sin(currentTime * 1.5) * 0.02;
          rightForearmGroup.rotation.z = 0;
        } else if (currentMode === "submitting" || currentMode === "success") {
          const cheerPhase = currentTime * 7.5;
          leftUpperArm.rotation.z = 1.1 + Math.sin(cheerPhase) * 0.2;
          leftForearmGroup.rotation.z = Math.sin(cheerPhase) * 0.45;
          leftWristGroup.rotation.z = Math.sin(cheerPhase - 0.4) * 0.35;

          rightUpperArm.rotation.z = -1.1 - Math.sin(cheerPhase) * 0.2;
          rightForearmGroup.rotation.z = -Math.sin(cheerPhase) * 0.45;
          rightWristGroup.rotation.z = -Math.sin(cheerPhase - 0.4) * 0.35;
        }
      }

      // ── CELEBRATION SPARKLE / CONFETTI PHYSICS ──
      if (sparkleGroup.visible) {
        sparkleMeshes.forEach((item) => {
          item.mesh.position.x += item.vx * dt;
          item.mesh.position.y += item.vy * dt;
          item.mesh.position.z += item.vz * dt;
          item.vy -= 4.2 * dt;

          item.mesh.rotation.x += item.rotV.x * dt;
          item.mesh.rotation.y += item.rotV.y * dt;
          item.mesh.rotation.z += item.rotV.z * dt;

          if (item.mesh.position.y < -1.8) {
            item.mesh.position.set(
              (Math.random() - 0.5) * 0.6,
              item.originY,
              (Math.random() - 0.5) * 0.6
            );
            item.vy = Math.random() * 2.8 + 1.5;
            item.vx = (Math.random() - 0.5) * 2.5;
          }
        });
      }

      // ── FLOATING CLOUDS DRIFT ──
      cloud1.position.x = -2.2 + Math.sin(currentTime * 0.22) * 0.25;
      cloud2.position.x = 2.4 + Math.cos(currentTime * 0.18) * 0.3;
      cloud3.position.x = -0.7 + Math.sin(currentTime * 0.15) * 0.2;

      renderer.render(scene, camera);
    };

    animate();

    // ── RESIZE OBSERVER & HANDLER ──
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || 440;
      const newHeight = container.clientHeight || 540;
      if (newWidth <= 0 || newHeight <= 0) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (secondaryBlinkTimeout) clearTimeout(secondaryBlinkTimeout);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[480px] sm:min-h-[580px] rounded-[28px] overflow-hidden select-none flex flex-col justify-between bg-[#9fd2f3]">
      {/* ── WebGL 3D Canvas Mounting Container ── */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* ── Top Spacer ── */}
      <div className="relative z-10 p-5 sm:p-6" />

      {/* ── Bottom Tracked Headline: EXPLORE. LEARN. GROW. ── */}
      <div className="relative z-10 p-5 sm:p-7 pointer-events-none bg-gradient-to-t from-black/25 via-black/10 to-transparent">
        <h2 className="text-2xl sm:text-[32px] font-black text-white leading-[1.08] tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] uppercase">
          EXPLORE.
          <br />
          <span className="tracking-tight text-white">LEARN. GROW.</span>
        </h2>
      </div>
    </div>
  );
}
