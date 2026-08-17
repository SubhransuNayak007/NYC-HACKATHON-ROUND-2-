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
  stiffness: number; // k (N/m)
  damping: number;   // c (N·s/m)
  mass: number;      // m (kg)

  constructor(initial = 0, stiffness = 130, damping = 15, mass = 1.0) {
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

    // 1. GUARANTEED SKY BACKGROUND GRADIENT (NEVER BLACK)
    const createSkyBackground = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 512;
      cvs.height = 512;
      const ctx = cvs.getContext("2d")!;
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, "#2ea5f5"); // Sunny alpine azure
      grad.addColorStop(0.45, "#70c3f8"); // Bright sky
      grad.addColorStop(0.8, "#bde4fd"); // Horizon soft blue
      grad.addColorStop(1.0, "#e0f2fe"); // Bright horizon glow
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      const tex = new THREE.CanvasTexture(cvs);
      return tex;
    };
    scene.background = createSkyBackground();

    // 2. CAMERA CALIBRATION (ZOOMED OUT FOR FULL BODY VISIBILITY)
    const camera = new THREE.PerspectiveCamera(40, Math.max(0.1, width / height), 0.1, 100);
    camera.position.set(0, 0.12, 4.9);
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
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    // ── PROCEDURAL TEXTURE GENERATION ──
    // 1. Fur Normal Map
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
          const strand =
            Math.sin(nx * 140 + Math.cos(ny * 70) * 3.5) * 0.35 +
            Math.sin(nx * 260 + ny * 130) * 0.2;
          const wave = Math.sin(ny * 35 + strand * 2.5) * 0.25;
          const val = 0.5 + strand * 0.3 + wave * 0.2;
          data[idx] = 128 + Math.sin(val * Math.PI * 2) * 55;
          data[idx + 1] = 128 + Math.cos(val * Math.PI * 2) * 55;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(cvs);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3.5, 3.5);
      return tex;
    };

    // 2. Soft Radial Shadow Texture for Grounding Feet
    const createContactShadowTex = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 256;
      cvs.height = 256;
      const ctx = cvs.getContext("2d")!;
      const grad = ctx.createRadialGradient(128, 128, 15, 128, 128, 120);
      grad.addColorStop(0, "rgba(20, 50, 20, 0.75)");
      grad.addColorStop(0.35, "rgba(30, 70, 30, 0.4)");
      grad.addColorStop(0.7, "rgba(40, 90, 40, 0.12)");
      grad.addColorStop(1, "rgba(50, 100, 50, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(cvs);
    };

    const furNormalTex = createFurNormal();
    const contactShadowTex = createContactShadowTex();

    // ── LIGHTING ──
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x48bb78, 1.25);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffdf5, 2.3);
    sunLight.position.set(3.5, 5.5, 4.0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0008;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 15;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 2.5);
    rimLight.position.set(-3.5, 3.8, -3.5);
    scene.add(rimLight);

    const bounceLight = new THREE.DirectionalLight(0x76c376, 0.65);
    bounceLight.position.set(0, -3.5, 2.0);
    scene.add(bounceLight);

    // ── ENVIRONMENT: PROPER LUSH MEADOW TERRAIN ──
    // 1. Rolling Green Meadow Ground Plane
    const groundGeo = new THREE.PlaneGeometry(16, 14, 36, 36);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const hillWave =
        Math.sin(x * 0.35 + 0.5) * 0.1 -
        (z + 1.5) * 0.05 -
        (x * x + (z + 2) * (z + 2)) * 0.01;
      pos.setY(i, hillWave);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x58aa58, // Lush meadow grass
      roughness: 0.82,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -0.92, -1.0);
    ground.receiveShadow = true;
    scene.add(ground);

    // 2. Distant Soft Rolling Hill in Background (Parallax depth)
    const backHillGeo = new THREE.SphereGeometry(7.5, 32, 32);
    const backHillMat = new THREE.MeshStandardMaterial({
      color: 0x489648,
      roughness: 0.88,
    });
    const backHill = new THREE.Mesh(backHillGeo, backHillMat);
    backHill.position.set(-2.8, -8.3, -4.5);
    scene.add(backHill);

    // 3. Grounded Contact Shadow Plane directly beneath Yeti's feet
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 1.3),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      })
    );
    shadowPlane.rotateX(-Math.PI / 2);
    shadowPlane.position.set(0, -0.91, 0.15);
    scene.add(shadowPlane);

    // 4. Wildflowers & Daisy Clusters on the Grass
    const flowerGroup = new THREE.Group();
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const centerMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3 });
    const flowerSpots = [
      { x: -1.2, z: 0.7, s: 0.08 },
      { x: -1.45, z: 0.4, s: 0.07 },
      { x: -0.95, z: 1.1, s: 0.075 },
      { x: 1.1, z: 0.6, s: 0.08 },
      { x: 1.35, z: 0.9, s: 0.075 },
      { x: 1.55, z: 0.3, s: 0.07 },
    ];
    flowerSpots.forEach(({ x, z, s }) => {
      const f = new THREE.Group();
      const center = new THREE.Mesh(new THREE.SphereGeometry(s * 0.7, 8, 8), centerMat);
      f.add(center);
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(s * 0.65, 8, 8), petalMat);
        petal.scale.set(0.6, 0.3, 1.2);
        petal.position.set(Math.cos(ang) * s * 1.1, 0, Math.sin(ang) * s * 1.1);
        f.add(petal);
      }
      f.position.set(x, -0.91, z);
      flowerGroup.add(f);
    });
    scene.add(flowerGroup);

    // 5. Stylized Volumetric Background Clouds
    const cloudMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xfffbeb),
    });

    const createCloud = (x: number, y: number, z: number, scale: number) => {
      const cloudGroup = new THREE.Group();
      const parts = [
        { r: 0.52, pos: [0, 0, 0] },
        { r: 0.4, pos: [-0.42, -0.1, 0] },
        { r: 0.44, pos: [0.44, -0.06, 0] },
        { r: 0.34, pos: [0.78, -0.16, 0] },
        { r: 0.3, pos: [-0.75, -0.18, 0] },
      ];
      parts.forEach(({ r, pos }) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), cloudMat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        cloudGroup.add(mesh);
      });
      cloudGroup.position.set(x, y, z);
      cloudGroup.scale.set(scale, scale * 0.72, scale);
      scene.add(cloudGroup);
      return cloudGroup;
    };

    const cloud1 = createCloud(-2.3, 1.7, -3.2, 1.15);
    const cloud2 = createCloud(2.5, 2.0, -4.2, 1.45);
    const cloud3 = createCloud(-0.8, 2.5, -5.2, 1.65);

    // ── CELEBRATION SPARKLES / CONFETTI SYSTEM ──
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

    // ── MASCOT RIG ROOT (SCALED TO 0.70 FOR FULL BODY VIEWPORT FIT) ──
    const yetiRoot = new THREE.Group();
    yetiRoot.position.set(0, 0.05, 0);
    yetiRoot.scale.setScalar(0.70);
    scene.add(yetiRoot);

    // ── MATERIALS ──
    const furMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.68,
      metalness: 0.0,
      sheen: 0.9,
      sheenColor: new THREE.Color(0xfffbeb),
      normalMap: furNormalTex,
      normalScale: new THREE.Vector2(0.28, 0.28),
    });

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0x9ed3f2, // Soft light baby blue face
      roughness: 0.52,
      metalness: 0.05,
    });

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x05070a, // Deep glossy black
      roughness: 0.02,
      metalness: 0.2,
    });

    const glintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const blushMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8fa3,
      roughness: 0.75,
      transparent: true,
      opacity: 0.32,
    });

    const noseMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // Cute vivid blue button nose
      roughness: 0.28,
      metalness: 0.1,
    });

    const pawPadMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.52,
    });

    // ── BODY / TORSO RIG ──
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.4, 0);
    yetiRoot.add(bodyGroup);

    const bodyGeo = new THREE.SphereGeometry(0.85, 32, 32);
    bodyGeo.scale(1.05, 1.15, 0.95);
    const bodyMesh = new THREE.Mesh(bodyGeo, furMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyGroup.add(bodyMesh);

    // Fluffy Chest Tuft
    const chestTuft = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 20, 20),
      furMaterial
    );
    chestTuft.scale.set(1.1, 1.2, 0.5);
    chestTuft.position.set(0, 0.2, 0.72);
    bodyGroup.add(chestTuft);

    // Chubby Legs & Feet planted firmly on the ground
    const legGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 20);
    const leftLeg = new THREE.Mesh(legGeo, furMaterial);
    leftLeg.position.set(-0.42, -1.15, 0.05);
    leftLeg.rotation.z = 0.08;
    leftLeg.castShadow = true;
    yetiRoot.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, furMaterial);
    rightLeg.position.set(0.42, -1.15, 0.05);
    rightLeg.rotation.z = -0.08;
    rightLeg.castShadow = true;
    yetiRoot.add(rightLeg);

    // Feet touching ground plane
    const footGeo = new THREE.SphereGeometry(0.26, 20, 20);
    footGeo.scale(1.1, 0.65, 1.4);
    const leftFoot = new THREE.Mesh(footGeo, furMaterial);
    leftFoot.position.set(-0.45, -1.32, 0.18);
    leftFoot.castShadow = true;
    yetiRoot.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, furMaterial);
    rightFoot.position.set(0.45, -1.32, 0.18);
    rightFoot.castShadow = true;
    yetiRoot.add(rightFoot);

    // ── HEAD RIG ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.55, 0.05);
    yetiRoot.add(headGroup);

    // Fluffy Head Sphere
    const headGeo = new THREE.SphereGeometry(0.82, 32, 32);
    headGeo.scale(1.1, 0.98, 1.0);
    const headFur = new THREE.Mesh(headGeo, furMaterial);
    headFur.castShadow = true;
    headGroup.add(headFur);

    // Top Fur Tufts (crown of 3 soft spikes)
    const tuft1 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.55, 16), furMaterial);
    tuft1.position.set(0, 0.85, 0);
    tuft1.rotation.z = 0.1;
    headGroup.add(tuft1);

    const tuft2 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 16), furMaterial);
    tuft2.position.set(-0.25, 0.8, -0.05);
    tuft2.rotation.z = 0.25;
    headGroup.add(tuft2);

    const tuft3 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 16), furMaterial);
    tuft3.position.set(0.25, 0.78, -0.05);
    tuft3.rotation.z = -0.22;
    headGroup.add(tuft3);

    // ── EARS WITH SPRING KINEMATICS ──
    const earGeo = new THREE.SphereGeometry(0.26, 20, 20);
    earGeo.scale(0.7, 1.1, 0.6);

    const leftEarGroup = new THREE.Group();
    leftEarGroup.position.set(-0.85, 0.35, -0.1);
    headGroup.add(leftEarGroup);

    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.rotation.z = -0.4;
    leftEarGroup.add(leftEar);

    const leftInnerEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      skinMaterial
    );
    leftInnerEar.position.set(0.03, 0, 0.07);
    leftInnerEar.scale.set(0.6, 0.9, 0.4);
    leftInnerEar.rotation.z = -0.4;
    leftEarGroup.add(leftInnerEar);

    const rightEarGroup = new THREE.Group();
    rightEarGroup.position.set(0.85, 0.35, -0.1);
    headGroup.add(rightEarGroup);

    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.rotation.z = 0.4;
    rightEarGroup.add(rightEar);

    const rightInnerEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      skinMaterial
    );
    rightInnerEar.position.set(-0.03, 0, 0.07);
    rightInnerEar.scale.set(0.6, 0.9, 0.4);
    rightInnerEar.rotation.z = 0.4;
    rightEarGroup.add(rightInnerEar);

    // Baby Blue Face Mask (recessed into fur)
    const faceMaskGeo = new THREE.SphereGeometry(0.6, 32, 32);
    faceMaskGeo.scale(1.02, 0.85, 0.55);
    const faceMask = new THREE.Mesh(faceMaskGeo, skinMaterial);
    faceMask.position.set(0, -0.02, 0.54);
    headGroup.add(faceMask);

    // Cute Button Nose
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      noseMaterial
    );
    nose.scale.set(1.4, 0.8, 0.7);
    nose.position.set(0, -0.05, 0.85);
    headGroup.add(nose);

    // Rosy Cheeks
    const cheekGeo = new THREE.SphereGeometry(0.12, 16, 16);
    cheekGeo.scale(1.2, 0.7, 0.3);

    const leftCheek = new THREE.Mesh(cheekGeo, blushMaterial);
    leftCheek.position.set(-0.4, -0.15, 0.76);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, blushMaterial);
    rightCheek.position.set(0.4, -0.15, 0.76);
    headGroup.add(rightCheek);

    // ── DYNAMIC PARAMETRIC SMILING MOUTH RIG ──
    const mouthMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.35,
    });
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, 0, 0);
    headGroup.add(mouthGroup);

    const initialCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, -0.21, 0.78),
      new THREE.Vector3(-0.12, -0.27, 0.81),
      new THREE.Vector3(0, -0.28, 0.83),
      new THREE.Vector3(0.12, -0.27, 0.81),
      new THREE.Vector3(0.25, -0.21, 0.78),
    ]);
    const mouthGeo = new THREE.TubeGeometry(initialCurve, 24, 0.026, 8, false);
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthGroup.add(mouthMesh);

    // Cute Little Fang Teeth
    const toothGeo = new THREE.ConeGeometry(0.04, 0.08, 8);
    const toothMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });

    const tooth1 = new THREE.Mesh(toothGeo, toothMat);
    tooth1.position.set(-0.15, -0.21, 0.8);
    tooth1.rotation.x = Math.PI;
    headGroup.add(tooth1);

    const tooth2 = new THREE.Mesh(toothGeo, toothMat);
    tooth2.position.set(0.15, -0.21, 0.8);
    tooth2.rotation.x = Math.PI;
    headGroup.add(tooth2);

    // ── EYE RIG (DYNAMIC 3D SACCADIC TRACKING) ──
    const eyeSocketL = new THREE.Group();
    eyeSocketL.position.set(-0.25, 0.1, 0.73);
    headGroup.add(eyeSocketL);

    const eyeSocketR = new THREE.Group();
    eyeSocketR.position.set(0.25, 0.1, 0.73);
    headGroup.add(eyeSocketR);

    // Eyeballs
    const eyeBallGeo = new THREE.SphereGeometry(0.15, 24, 24);
    const leftEyeBall = new THREE.Mesh(eyeBallGeo, eyeMaterial);
    eyeSocketL.add(leftEyeBall);

    const rightEyeBall = new THREE.Mesh(eyeBallGeo, eyeMaterial);
    eyeSocketR.add(rightEyeBall);

    // Specular Glints
    const glint1L = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 12, 12),
      glintMaterial
    );
    glint1L.position.set(0.045, 0.05, 0.12);
    leftEyeBall.add(glint1L);

    const glint2L = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 12),
      glintMaterial
    );
    glint2L.position.set(-0.04, -0.04, 0.13);
    leftEyeBall.add(glint2L);

    const glint1R = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 12, 12),
      glintMaterial
    );
    glint1R.position.set(0.045, 0.05, 0.12);
    rightEyeBall.add(glint1R);

    const glint2R = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 12, 12),
      glintMaterial
    );
    glint2R.position.set(-0.04, -0.04, 0.13);
    rightEyeBall.add(glint2R);

    // Eyelids (for Blinking & Squeezing eyes shut)
    const eyelidGeo = new THREE.SphereGeometry(
      0.162,
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

    // ── ARMS & SHOULDERS HIERARCHICAL RIG ──
    // 1. Right Arm (Resting with natural sway)
    const rightShoulderGroup = new THREE.Group();
    rightShoulderGroup.position.set(0.72, -0.15, 0);
    yetiRoot.add(rightShoulderGroup);

    const rightUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.65, 16),
      furMaterial
    );
    rightUpperArm.position.set(0.18, -0.25, 0.05);
    rightUpperArm.rotation.z = -0.3;
    rightShoulderGroup.add(rightUpperArm);

    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0.32, -0.55, 0.1);
    rightShoulderGroup.add(rightForearmGroup);

    const rightHand = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      furMaterial
    );
    rightForearmGroup.add(rightHand);

    const rightWristGroup = new THREE.Group();
    rightForearmGroup.add(rightWristGroup);

    // 2. Left Arm (Articulated Waving Hand Hierarchy)
    const leftShoulderGroup = new THREE.Group();
    leftShoulderGroup.position.set(-0.72, -0.15, 0);
    yetiRoot.add(leftShoulderGroup);

    const leftUpperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.65, 16),
      furMaterial
    );
    leftUpperArm.position.set(-0.25, 0.15, 0.1);
    leftUpperArm.rotation.z = 0.85;
    leftShoulderGroup.add(leftUpperArm);

    const leftForearmGroup = new THREE.Group();
    leftForearmGroup.position.set(-0.52, 0.45, 0.18);
    leftShoulderGroup.add(leftForearmGroup);

    const leftWristGroup = new THREE.Group();
    leftForearmGroup.add(leftWristGroup);

    // Left Palm
    const leftHandPalm = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      furMaterial
    );
    leftHandPalm.scale.set(1.1, 1.0, 0.6);
    leftWristGroup.add(leftHandPalm);

    // Cute Paw Pad
    const leftPad = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      pawPadMaterial
    );
    leftPad.scale.set(1.1, 0.9, 0.3);
    leftPad.position.set(0, 0, 0.12);
    leftWristGroup.add(leftPad);

    // 4 Articulated Fingers
    const leftFingers: THREE.Mesh[] = [];
    const fingerDefs = [
      { x: -0.14, y: 0.18, rotZ: 0.3 },
      { x: -0.05, y: 0.22, rotZ: 0.05 },
      { x: 0.06, y: 0.21, rotZ: -0.15 },
      { x: 0.15, y: 0.15, rotZ: -0.35 },
    ];

    fingerDefs.forEach(({ x, y, rotZ }) => {
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.055, 0.12, 8, 8),
        furMaterial
      );
      finger.position.set(x, y, 0.02);
      finger.rotation.z = rotZ;
      leftWristGroup.add(finger);
      leftFingers.push(finger);
    });

    // ── SHY / PASSWORD EYE COVERING PAWS OVERLAY ──
    const shyPawsGroup = new THREE.Group();
    shyPawsGroup.position.set(0, 0.55, 0.95);
    shyPawsGroup.visible = false;
    yetiRoot.add(shyPawsGroup);

    const shyPawLGroup = new THREE.Group();
    shyPawLGroup.position.set(-0.28, 0.05, 0);
    shyPawsGroup.add(shyPawLGroup);

    const shyPawL = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 16),
      furMaterial
    );
    shyPawL.scale.set(1.1, 1.0, 0.7);
    shyPawL.rotation.z = -0.35;
    shyPawLGroup.add(shyPawL);

    const shyPawLPads = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      pawPadMaterial
    );
    shyPawLPads.scale.set(1, 0.8, 0.2);
    shyPawLPads.position.set(0, -0.02, 0.16);
    shyPawLGroup.add(shyPawLPads);

    const shyPawRGroup = new THREE.Group();
    shyPawRGroup.position.set(0.28, 0.05, 0);
    shyPawsGroup.add(shyPawRGroup);

    const shyPawR = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 16, 16),
      furMaterial
    );
    shyPawR.scale.set(1.1, 1.0, 0.7);
    shyPawR.rotation.z = 0.35;
    shyPawRGroup.add(shyPawR);

    const shyPawRPads = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      pawPadMaterial
    );
    shyPawRPads.scale.set(1, 0.8, 0.2);
    shyPawRPads.position.set(0, -0.02, 0.16);
    shyPawRGroup.add(shyPawRPads);

    // ── SECOND-ORDER PHYSICS RIG INSTANCES ──
    const springHeadRotY = new SpringDamper(0, 110, 14, 1.0);
    const springHeadRotX = new SpringDamper(0, 120, 15, 1.0);
    const springHeadRotZ = new SpringDamper(0, 140, 16, 1.0);

    const springEyeX = new SpringDamper(0, 180, 18, 0.8);
    const springEyeY = new SpringDamper(0, 180, 18, 0.8);

    const springLeftEyelid = new SpringDamper(-Math.PI * 0.5, 160, 16, 0.9);
    const springRightEyelid = new SpringDamper(-Math.PI * 0.5, 160, 16, 0.9);

    const springBodyLeanX = new SpringDamper(0, 70, 12, 2.2);
    const springBodyLeanY = new SpringDamper(0, 90, 14, 2.2);
    const springBodyLeanZ = new SpringDamper(0, 70, 12, 2.2);

    const springBlushOpacity = new SpringDamper(0.32, 90, 14, 1.0);
    const springBlushScale = new SpringDamper(1.0, 90, 14, 1.0);

    const springSmileCorners = new SpringDamper(0.015, 100, 14, 1.0);
    const springSmileWidth = new SpringDamper(0.25, 100, 14, 1.0);

    const springJumpY = new SpringDamper(0, 150, 12, 1.2);
    const springShyPawsY = new SpringDamper(0.1, 140, 15, 1.0);
    const springShyPawsScale = new SpringDamper(0.4, 140, 15, 1.0);

    const springLeftEarWiggle = new SpringDamper(0, 120, 10, 0.8);
    const springRightEarWiggle = new SpringDamper(0, 120, 10, 0.8);

    // ── POINTER TRACKING STATE ──
    const targetPointer = new THREE.Vector2(0, 0);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetPointer.set(
        Math.max(-1.4, Math.min(1.4, nx)),
        Math.max(-1.1, Math.min(1.1, ny))
      );
    };

    window.addEventListener("pointermove", handlePointerMove);

    // ── POISSON STOCHASTIC BLINKING TIMING ENGINE ──
    let isBlinking = false;
    let blinkTimeout: NodeJS.Timeout | null = null;
    let secondaryBlinkTimeout: NodeJS.Timeout | null = null;

    const schedulePoissonBlink = () => {
      const u = Math.random();
      const delayMs = (-Math.log(1 - u) * 3200 + 1000);
      blinkTimeout = setTimeout(() => {
        isBlinking = true;
        setTimeout(() => {
          isBlinking = false;
          if (Math.random() < 0.18) {
            secondaryBlinkTimeout = setTimeout(() => {
              isBlinking = true;
              setTimeout(() => {
                isBlinking = false;
                schedulePoissonBlink();
              }, 110);
            }, 120);
          } else {
            schedulePoissonBlink();
          }
        }, 140);
      }, delayMs);
    };
    schedulePoissonBlink();

    // ── RENDER & ANIMATION PHYSICS LOOP ──
    let animationFrameId: number;
    let lastTime = performance.now();
    const startTime = performance.now();
    let celebrationTriggered = false;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const currentTime = (now - startTime) / 1000;
      const currentMode = modeRef.current;
      const currentTypingProgress = typingProgressRef.current;

      // ── SOLVE TARGETS BASED ON MASCOT MODE ──
      let tHeadY = 0;
      let tHeadX = 0;
      let tHeadZ = 0;
      let tEyeX = 0;
      let tEyeY = 0;
      let tBodyLeanX = 0;
      let tBodyLeanY = 0;
      let tBodyLeanZ = 0;
      let tBlushOp = 0.32;
      let tBlushSc = 1.0;
      let tSmileCorners = 0.015;
      let tSmileWidth = 0.25;

      let tShyPawsY = 0.1;
      let tShyPawsScale = 0.4;
      let shyPawsShouldBeVisible = false;

      // 1. Idle state
      if (currentMode === "idle") {
        tHeadY = targetPointer.x * 0.32;
        tHeadX = -targetPointer.y * 0.22;
        tHeadZ = -targetPointer.x * 0.06;
        tEyeX = targetPointer.x * 0.48;
        tEyeY = targetPointer.y * 0.42;
        tBlushOp = 0.32;
        tBlushSc = 1.0;
        tSmileCorners = 0.02;
        tSmileWidth = 0.25;
        shyPawsShouldBeVisible = false;
        sparkleGroup.visible = false;
        celebrationTriggered = false;
      }
      // 2. Email Focus state (leans in, tracks form inputs / typing progress)
      else if (currentMode === "email_focused") {
        const typingOffset = (currentTypingProgress - 0.5) * 0.25;
        tHeadY = 0.36 + typingOffset;
        tHeadX = -0.14;
        tHeadZ = 0.06;

        tEyeX = 0.56 + typingOffset * 0.5;
        tEyeY = -0.22;

        tBodyLeanX = 0.14;
        tBodyLeanZ = 0.35;
        tBodyLeanY = -0.08;

        tSmileCorners = 0.015;
        tSmileWidth = 0.24;
        tBlushOp = 0.38;
        shyPawsShouldBeVisible = false;
        sparkleGroup.visible = false;
        celebrationTriggered = false;
      }
      // 3. Password Focus (Shy peek-a-boo: covers eyes completely)
      else if (currentMode === "password_focused") {
        tHeadY = 0.02;
        tHeadX = -0.22;
        tHeadZ = 0.0;

        tEyeX = 0;
        tEyeY = -0.45;

        tBodyLeanX = 0;
        tBodyLeanZ = -0.08;

        tBlushOp = 0.82;
        tBlushSc = 1.35;

        tSmileCorners = -0.02;
        tSmileWidth = 0.22;

        shyPawsShouldBeVisible = true;
        tShyPawsY = 0.55;
        tShyPawsScale = 1.02;
        sparkleGroup.visible = false;
        celebrationTriggered = false;
      }
      // 4. Password Peeking (Playful wink through paws)
      else if (currentMode === "password_peeking") {
        tHeadY = 0.24;
        tHeadX = 0.08;
        tHeadZ = 0.16;

        tEyeX = 0.42;
        tEyeY = 0.08;

        tBodyLeanX = 0.08;
        tBodyLeanZ = 0.18;

        tBlushOp = 0.72;
        tBlushSc = 1.25;

        tSmileCorners = 0.055;
        tSmileWidth = 0.26;

        shyPawsShouldBeVisible = true;
        tShyPawsY = 0.42;
        tShyPawsScale = 0.94;
        sparkleGroup.visible = false;
        celebrationTriggered = false;
      }
      // 5. Submit / Success Celebration
      else if (currentMode === "submitting" || currentMode === "success") {
        tHeadY = Math.sin(currentTime * 5.5) * 0.14;
        tHeadX = Math.abs(Math.sin(currentTime * 7.0)) * 0.18;
        tHeadZ = Math.sin(currentTime * 4.0) * 0.08;

        tEyeX = Math.sin(currentTime * 3.0) * 0.15;
        tEyeY = 0.2;

        tSmileCorners = 0.09;
        tSmileWidth = 0.29;

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
      const breathPrimary = Math.sin(currentTime * 1.9) * 0.036;
      const breathSecondary = Math.sin(currentTime * 3.8 + 0.45) * 0.012;
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

      springSmileCorners.setTarget(tSmileCorners);
      springSmileWidth.setTarget(tSmileWidth);

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

      const curSmileCorners = springSmileCorners.update(dt);
      const curSmileWidth = springSmileWidth.update(dt);

      const curJumpY = Math.max(0, springJumpY.update(dt));
      const curShyY = springShyPawsY.update(dt);
      const curShySc = springShyPawsScale.update(dt);

      const curLeftEarWiggle = springLeftEarWiggle.update(dt);
      const springRightEarWiggleVal = springRightEarWiggle.update(dt);

      // ── APPLY PHYSICS TO HEAD & RIG ──
      headGroup.rotation.y = curHeadY;
      headGroup.rotation.x = curHeadX;
      headGroup.rotation.z = curHeadZ;

      leftEarGroup.rotation.z = curLeftEarWiggle + Math.sin(currentTime * 2.0) * 0.03;
      rightEarGroup.rotation.z = springRightEarWiggleVal - Math.sin(currentTime * 2.0) * 0.03;

      // Apply Breathing & Position
      yetiRoot.position.set(curBodyX, 0.05 + curBodyY + curJumpY + breathTotal * 0.35, curBodyZ);
      bodyMesh.scale.set(
        1.05 + breathTotal * 0.5,
        1.15 + breathTotal * 0.35,
        0.95 + breathTotal * 0.6
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

      // ── DYNAMIC MOUTH MORPH (TRANSFORM BASED, ZERO GC STALL) ──
      if (mouthMesh) {
        mouthMesh.position.y = curSmileCorners * 0.4;
        mouthMesh.scale.set(
          Math.max(0.7, curSmileWidth / 0.25),
          1.0 + curSmileCorners * 2.5,
          1.0
        );
      }

      tooth1.position.y = -0.21 + curSmileCorners * 0.5;
      tooth2.position.y = -0.21 + curSmileCorners * 0.5;

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

      // ── FOREARM & WRIST KINEMATICS (HI WAVING GESTURE) ──
      if (currentMode === "password_focused" || currentMode === "password_peeking") {
        leftShoulderGroup.visible = false;
        rightShoulderGroup.visible = false;
      } else {
        leftShoulderGroup.visible = true;
        rightShoulderGroup.visible = true;

        if (currentMode === "idle" || currentMode === "email_focused") {
          const wavePhase = currentTime * 3.4;
          leftUpperArm.rotation.z = 0.85 + Math.sin(currentTime * 1.8) * 0.05;
          leftForearmGroup.rotation.z = Math.sin(wavePhase) * 0.32;
          leftForearmGroup.rotation.y = Math.cos(wavePhase * 0.8) * 0.15;

          leftWristGroup.rotation.z = Math.sin(wavePhase - 0.45) * 0.28;

          leftFingers.forEach((finger, i) => {
            finger.rotation.x = Math.sin(wavePhase - 0.65 + i * 0.1) * 0.14;
          });

          rightUpperArm.rotation.z = -0.3 + Math.sin(currentTime * 1.9) * 0.04;
          rightForearmGroup.rotation.z = Math.sin(currentTime * 1.9 + 0.5) * 0.05;
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
      cloud1.position.x = -2.3 + Math.sin(currentTime * 0.22) * 0.25;
      cloud2.position.x = 2.5 + Math.cos(currentTime * 0.18) * 0.3;
      cloud3.position.x = -0.8 + Math.sin(currentTime * 0.15) * 0.2;

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

      {/* ── Overlay Tag at Top Left ── */}
      <div className="relative z-10 p-5 sm:p-6 flex items-center gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/80 text-[11px] font-bold text-slate-900 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Interactive 3D Mascot</span>
        </div>
      </div>

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
