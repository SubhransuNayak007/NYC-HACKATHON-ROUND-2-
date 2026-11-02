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

interface UltraYeti3DProps {
  mode?: MascotMode;
}

export function UltraYeti3D({ mode = "idle" }: UltraYeti3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<MascotMode>(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 560;

    // ═══════════════════════ 1. SCENE & CAMERA ═══════════════════════
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ═══════════════════════ 2. PROCEDURAL TEXTURES ═══════════════════════
    // A. Fur Normal Map (Directional micro-strands)
    const createFurNormalTexture = () => {
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
            Math.sin(nx * 120 + Math.cos(ny * 60) * 3) * 0.4 +
            Math.sin(nx * 240 + ny * 120) * 0.25;
          const wave = Math.sin(ny * 30 + strand * 2) * 0.35;
          const n = 0.5 + strand * 0.3 + wave * 0.2;

          // Normal Map RGB
          data[idx] = 128 + Math.sin(n * Math.PI * 2) * 60; // Red (X slope)
          data[idx + 1] = 128 + Math.cos(n * Math.PI * 2) * 60; // Green (Y slope)
          data[idx + 2] = 255; // Blue (Z up)
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const tex = new THREE.CanvasTexture(cvs);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      return tex;
    };

    // B. Pixar Glossy Eye Texture (Amber/Sapphire collarette)
    const createPixarEyeTexture = () => {
      const cvs = document.createElement("canvas");
      cvs.width = 512;
      cvs.height = 512;
      const ctx = cvs.getContext("2d")!;
      const cx = 256;
      const cy = 256;

      // Sclera base
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);

      // Iris Outer Limbal Ring
      const irisRadius = 180;
      const irisGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, irisRadius);
      irisGrad.addColorStop(0.0, "#0f172a"); // Deep dark pupil center
      irisGrad.addColorStop(0.35, "#1e293b"); // Pupil edge
      irisGrad.addColorStop(0.45, "#0284c7"); // Vibrant ocean sapphire
      irisGrad.addColorStop(0.75, "#38bdf8"); // Luminous azure iris
      irisGrad.addColorStop(0.92, "#0369a1"); // Outer iris
      irisGrad.addColorStop(1.0, "#082f49"); // Dark Limbal Ring

      ctx.beginPath();
      ctx.arc(cx, cy, irisRadius, 0, Math.PI * 2);
      ctx.fillStyle = irisGrad;
      ctx.fill();

      // Striated Radial Iris Fibers
      for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const len = 60 + Math.random() * 90;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * 45, cy + Math.sin(angle) * 45);
        ctx.lineTo(cx + Math.cos(angle) * (45 + len), cy + Math.sin(angle) * (45 + len));
        ctx.strokeStyle = i % 2 === 0 ? "rgba(186, 230, 253, 0.45)" : "rgba(254, 240, 138, 0.35)";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Deep Black Pupil
      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.fillStyle = "#090d16";
      ctx.fill();

      // Specular Glints / Highlights
      ctx.beginPath();
      ctx.arc(cx + 42, cy - 42, 28, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx - 32, cy + 32, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.fill();

      return new THREE.CanvasTexture(cvs);
    };

    const furNormalTex = createFurNormalTexture();
    const eyeIrisTex = createPixarEyeTexture();

    // ═══════════════════════ 3. CINEMATIC LIGHTING RIG ═══════════════════════
    // Sky/Ground Ambient
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x4ade80, 1.2);
    scene.add(hemiLight);

    // Warm Directional Sun
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(3.5, 5.0, 4.0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    // Pixar Golden Rim Light (silhouette edge glow)
    const rimLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    rimLight.position.set(-4.0, 3.5, -3.5);
    scene.add(rimLight);

    // Soft Meadow Bounce Light
    const bounceLight = new THREE.DirectionalLight(0x86efac, 0.75);
    bounceLight.position.set(0, -3.5, 2.5);
    scene.add(bounceLight);

    // ═══════════════════════ 4. ENVIRONMENT: SKY & HILLS ═══════════════════════
    // Sky Dome with Gradient Shader
    const skyGeo = new THREE.SphereGeometry(40, 32, 32);
    skyGeo.scale(-1, 1, 1);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0284c7) },
        midColor: { value: new THREE.Color(0x38bdf8) },
        horizonColor: { value: new THREE.Color(0xbae6fd) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 sky = mix(horizonColor, midColor, max(pow(max(h, 0.0), 0.6), 0.0));
          sky = mix(sky, topColor, max(pow(max(h - 0.3, 0.0), 1.2), 0.0));
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Rolling Grassy Hills (Layered emerald meadows)
    const mainHill = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 36, 36),
      new THREE.MeshStandardMaterial({
        color: 0x48bb78,
        roughness: 0.8,
        metalness: 0.05,
      })
    );
    mainHill.position.set(0, -6.1, 0);
    mainHill.receiveShadow = true;
    scene.add(mainHill);

    // Back Hill (Parallax Depth)
    const backHill = new THREE.Mesh(
      new THREE.SphereGeometry(7.0, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x38a169,
        roughness: 0.9,
      })
    );
    backHill.position.set(-2.5, -7.5, -3.5);
    scene.add(backHill);

    // Floating Puffy 3D Clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      transparent: true,
      opacity: 0.9,
    });

    const createCloudCluster = (x: number, y: number, z: number, scale: number) => {
      const cloudGroup = new THREE.Group();
      const parts = [
        { r: 0.6, pos: [0, 0, 0] },
        { r: 0.45, pos: [-0.5, -0.1, 0] },
        { r: 0.5, pos: [0.5, -0.05, 0] },
        { r: 0.35, pos: [0.9, -0.2, 0] },
      ];
      parts.forEach(({ r, pos }) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), cloudMat);
        mesh.position.set(pos[0], pos[1], pos[2]);
        cloudGroup.add(mesh);
      });
      cloudGroup.position.set(x, y, z);
      cloudGroup.scale.set(scale, scale * 0.7, scale);
      scene.add(cloudGroup);
      return cloudGroup;
    };

    const cloud1 = createCloudCluster(-2.6, 1.8, -3.5, 1.2);
    const cloud2 = createCloudCluster(2.8, 2.1, -4.5, 1.5);
    const cloud3 = createCloudCluster(-0.8, 2.6, -5.5, 1.8);

    // ═══════════════════════ 5. PIXAR YETI CHARACTER RIG ═══════════════════════
    const yetiRoot = new THREE.Group();
    yetiRoot.position.set(0, -0.1, 0);
    scene.add(yetiRoot);

    // High-End Materials
    const furMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.0,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xfef08a), // Golden rim sheen
      sheenRoughness: 0.4,
      transmission: 0.08,
      thickness: 1.2,
      normalMap: furNormalTex,
      normalScale: new THREE.Vector2(0.35, 0.35),
    });

    const faceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd, // Baby-blue velvet
      roughness: 0.45,
      metalness: 0.0,
      sheen: 0.8,
      sheenColor: new THREE.Color(0xbfdbfe),
      transmission: 0.15,
      thickness: 0.8,
    });

    const noseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      roughness: 0.15,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });

    const corneaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      opacity: 1.0,
      transparent: true,
      roughness: 0.01,
      metalness: 0.0,
      clearcoat: 1.0,
    });

    const eyeIrisMaterial = new THREE.MeshStandardMaterial({
      map: eyeIrisTex,
      roughness: 0.25,
    });

    const blushMaterial = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.8,
      transparent: true,
      opacity: 0.35,
    });

    const pawPadMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.5,
    });

    // ── BODY ──
    const bodyGeo = new THREE.SphereGeometry(0.9, 32, 32);
    bodyGeo.scale(1.05, 1.15, 0.95);
    const body = new THREE.Mesh(bodyGeo, furMaterial);
    body.position.set(0, -0.4, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    yetiRoot.add(body);

    // Chubby Legs & Feet
    const legGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 20);
    const leftLeg = new THREE.Mesh(legGeo, furMaterial);
    leftLeg.position.set(-0.42, -1.15, 0.05);
    leftLeg.rotation.z = 0.08;
    yetiRoot.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, furMaterial);
    rightLeg.position.set(0.42, -1.15, 0.05);
    rightLeg.rotation.z = -0.08;
    yetiRoot.add(rightLeg);

    const footGeo = new THREE.SphereGeometry(0.26, 20, 20);
    footGeo.scale(1.1, 0.65, 1.4);
    const leftFoot = new THREE.Mesh(footGeo, furMaterial);
    leftFoot.position.set(-0.45, -1.35, 0.18);
    yetiRoot.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, furMaterial);
    rightFoot.position.set(0.45, -1.35, 0.18);
    yetiRoot.add(rightFoot);

    // ── HEAD GROUP ──
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.55, 0.05);
    yetiRoot.add(headGroup);

    // Fluffy Head Sphere
    const headGeo = new THREE.SphereGeometry(0.85, 32, 32);
    headGeo.scale(1.1, 0.98, 1.0);
    const headMesh = new THREE.Mesh(headGeo, furMaterial);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Fluffy Hair Tufts on Top
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

    // Cute Ears
    const earGeo = new THREE.SphereGeometry(0.26, 20, 20);
    earGeo.scale(0.7, 1.1, 0.6);
    
    const leftEar = new THREE.Mesh(earGeo, furMaterial);
    leftEar.position.set(-0.85, 0.35, -0.1);
    leftEar.rotation.z = -0.4;
    headGroup.add(leftEar);

    const leftInnerEar = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), faceMaterial);
    leftInnerEar.position.set(-0.82, 0.35, -0.03);
    leftInnerEar.scale.set(0.6, 0.9, 0.4);
    leftInnerEar.rotation.z = -0.4;
    headGroup.add(leftInnerEar);

    const rightEar = new THREE.Mesh(earGeo, furMaterial);
    rightEar.position.set(0.85, 0.35, -0.1);
    rightEar.rotation.z = 0.4;
    headGroup.add(rightEar);

    const rightInnerEar = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), faceMaterial);
    rightInnerEar.position.set(0.82, 0.35, -0.03);
    rightInnerEar.scale.set(0.6, 0.9, 0.4);
    rightInnerEar.rotation.z = 0.4;
    headGroup.add(rightInnerEar);

    // Baby-Blue Velvet Face Mask
    const faceMaskGeo = new THREE.SphereGeometry(0.62, 32, 32);
    faceMaskGeo.scale(1.02, 0.85, 0.55);
    const faceMask = new THREE.Mesh(faceMaskGeo, faceMaterial);
    faceMask.position.set(0, -0.02, 0.54);
    headGroup.add(faceMask);

    // Button Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), noseMaterial);
    nose.scale.set(1.4, 0.85, 0.75);
    nose.position.set(0, -0.06, 0.86);
    headGroup.add(nose);

    // Happy Smiling Mouth Arc
    const mouthCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, -0.22, 0.78),
      new THREE.Vector3(0, -0.29, 0.82),
      new THREE.Vector3(0.25, -0.22, 0.78),
    ]);
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 20, 0.025, 8, false);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    headGroup.add(mouth);

    // Cute Little Fangs
    const toothGeo = new THREE.ConeGeometry(0.04, 0.08, 8);
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const tooth1 = new THREE.Mesh(toothGeo, toothMat);
    tooth1.position.set(-0.15, -0.21, 0.8);
    tooth1.rotation.x = Math.PI;
    headGroup.add(tooth1);

    const tooth2 = new THREE.Mesh(toothGeo, toothMat);
    tooth2.position.set(0.15, -0.21, 0.8);
    tooth2.rotation.x = Math.PI;
    headGroup.add(tooth2);

    // Rosy Cheeks
    const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), blushMaterial);
    leftCheek.scale.set(1.2, 0.7, 0.3);
    leftCheek.position.set(-0.4, -0.15, 0.76);
    headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), blushMaterial);
    rightCheek.scale.set(1.2, 0.7, 0.3);
    rightCheek.position.set(0.4, -0.15, 0.76);
    headGroup.add(rightCheek);

    // ── EYE SOCKETS & PIXAR EYES ──
    const eyeSocketL = new THREE.Group();
    eyeSocketL.position.set(-0.25, 0.1, 0.73);
    headGroup.add(eyeSocketL);

    const eyeSocketR = new THREE.Group();
    eyeSocketR.position.set(0.25, 0.1, 0.73);
    headGroup.add(eyeSocketR);

    // Eyeballs with sapphire iris texture
    const eyeBallGeo = new THREE.SphereGeometry(0.15, 24, 24);
    const leftEyeBall = new THREE.Mesh(eyeBallGeo, eyeIrisMaterial);
    leftEyeBall.rotation.y = -Math.PI * 0.5;
    eyeSocketL.add(leftEyeBall);

    const rightEyeBall = new THREE.Mesh(eyeBallGeo, eyeIrisMaterial);
    rightEyeBall.rotation.y = -Math.PI * 0.5;
    eyeSocketR.add(rightEyeBall);

    // Cornea Glass Refraction Overlays
    const corneaGeo = new THREE.SphereGeometry(0.155, 24, 24);
    const leftCornea = new THREE.Mesh(corneaGeo, corneaMaterial);
    eyeSocketL.add(leftCornea);
    const rightCornea = new THREE.Mesh(corneaGeo, corneaMaterial);
    eyeSocketR.add(rightCornea);

    // Eyelids
    const eyelidGeo = new THREE.SphereGeometry(0.165, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const leftEyelid = new THREE.Mesh(eyelidGeo, faceMaterial);
    leftEyelid.rotation.x = -Math.PI * 0.5;
    eyeSocketL.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(eyelidGeo, faceMaterial);
    rightEyelid.rotation.x = -Math.PI * 0.5;
    eyeSocketR.add(rightEyelid);

    // ── ARMS RIG ──
    // Right Arm (Resting)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.75, -0.15, 0);
    yetiRoot.add(rightArmGroup);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 16), furMaterial);
    rightArm.position.set(0.2, -0.28, 0.05);
    rightArm.rotation.z = -0.3;
    rightArmGroup.add(rightArm);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), furMaterial);
    rightHand.position.set(0.35, -0.65, 0.1);
    rightArmGroup.add(rightHand);

    // Left Arm (Friendly Waving "Hi" Hand)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.75, -0.15, 0);
    yetiRoot.add(leftArmGroup);

    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 16), furMaterial);
    leftArm.position.set(-0.25, 0.15, 0.1);
    leftArm.rotation.z = 0.85;
    leftArmGroup.add(leftArm);

    const leftHandGroup = new THREE.Group();
    leftHandGroup.position.set(-0.52, 0.45, 0.18);
    leftArmGroup.add(leftHandGroup);

    const leftHandPalm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), furMaterial);
    leftHandPalm.scale.set(1.1, 1.0, 0.6);
    leftHandGroup.add(leftHandPalm);

    const palmPad = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), pawPadMaterial);
    palmPad.scale.set(1.1, 0.9, 0.3);
    palmPad.position.set(0, 0, 0.12);
    leftHandGroup.add(palmPad);

    const createFinger = (x: number, y: number, rotZ: number) => {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.12, 8, 8), furMaterial);
      finger.position.set(x, y, 0.02);
      finger.rotation.z = rotZ;
      return finger;
    };
    leftHandGroup.add(createFinger(-0.15, 0.18, 0.3));
    leftHandGroup.add(createFinger(-0.05, 0.22, 0.05));
    leftHandGroup.add(createFinger(0.06, 0.21, -0.15));
    leftHandGroup.add(createFinger(0.16, 0.15, -0.35));

    // ── SHY / PASSWORD COVERING PAWS ──
    const shyPawsGroup = new THREE.Group();
    shyPawsGroup.position.set(0, 0.55, 0.95);
    shyPawsGroup.visible = false;
    yetiRoot.add(shyPawsGroup);

    const shyPawL = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), furMaterial);
    shyPawL.scale.set(1.1, 1.0, 0.7);
    shyPawL.position.set(-0.28, 0.05, 0);
    shyPawL.rotation.z = -0.3;
    shyPawsGroup.add(shyPawL);

    const shyPawR = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), furMaterial);
    shyPawR.scale.set(1.1, 1.0, 0.7);
    shyPawR.position.set(0.28, 0.05, 0);
    shyPawR.rotation.z = 0.3;
    shyPawsGroup.add(shyPawR);

    // ═══════════════════════ 6. MOUSE TRACKING & PHYSICS ═══════════════════════
    const targetLookAt = new THREE.Vector2(0, 0);
    const currentLookAt = new THREE.Vector2(0, 0);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetLookAt.set(Math.max(-1.4, Math.min(1.4, nx)), Math.max(-1.1, Math.min(1.1, ny)));
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // Natural Spontaneous Blinking
    let isBlinking = false;
    const scheduleBlink = () => {
      const delay = Math.random() * 3000 + 2000;
      setTimeout(() => {
        isBlinking = true;
        setTimeout(() => {
          isBlinking = false;
          scheduleBlink();
        }, 150);
      }, delay);
    };
    scheduleBlink();

    // ═══════════════════════ 7. RENDER & ANIMATION LOOP ═══════════════════════
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const currentMode = modeRef.current;

      // Spring lerp mouse interpolation
      currentLookAt.lerp(targetLookAt, 0.08);

      let targetHeadRotY = currentLookAt.x * 0.32;
      let targetHeadRotX = -currentLookAt.y * 0.25;
      let targetEyeX = currentLookAt.x * 0.45;
      let targetEyeY = currentLookAt.y * 0.38;

      if (currentMode === "email_focused") {
        targetHeadRotY = 0.35;
        targetHeadRotX = -0.15;
        targetEyeX = 0.55;
        targetEyeY = -0.25;
      } else if (currentMode === "password_focused") {
        targetHeadRotY = 0;
        targetHeadRotX = -0.2;
        targetEyeX = 0;
        targetEyeY = -0.5;
      } else if (currentMode === "password_peeking") {
        targetHeadRotY = 0.25;
        targetHeadRotX = 0.1;
        targetEyeX = 0.4;
        targetEyeY = 0.1;
      } else if (currentMode === "submitting" || currentMode === "success") {
        targetHeadRotY = Math.sin(time * 6) * 0.12;
        targetHeadRotX = Math.abs(Math.sin(time * 8)) * 0.15;
      }

      // Head rotation
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, targetHeadRotY, 0.08);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, targetHeadRotX, 0.08);

      // Breathing bobbing
      yetiRoot.position.y = -0.1 + Math.sin(time * 2.2) * 0.035;
      body.scale.y = 1.15 + Math.sin(time * 2.2) * 0.02;

      // Floating clouds
      cloud1.position.x = -2.6 + Math.sin(time * 0.2) * 0.25;
      cloud2.position.x = 2.8 + Math.cos(time * 0.18) * 0.3;
      cloud3.position.x = -0.8 + Math.sin(time * 0.15) * 0.2;

      // Eye tracking
      leftEyeBall.rotation.y = THREE.MathUtils.lerp(leftEyeBall.rotation.y, -Math.PI * 0.5 + targetEyeX, 0.15);
      leftEyeBall.rotation.x = THREE.MathUtils.lerp(leftEyeBall.rotation.x, -targetEyeY, 0.15);

      rightEyeBall.rotation.y = THREE.MathUtils.lerp(rightEyeBall.rotation.y, -Math.PI * 0.5 + targetEyeX, 0.15);
      rightEyeBall.rotation.x = THREE.MathUtils.lerp(rightEyeBall.rotation.x, -targetEyeY, 0.15);

      // Blinking & Password covering
      if (currentMode === "password_focused") {
        leftEyelid.rotation.x = THREE.MathUtils.lerp(leftEyelid.rotation.x, 0.1, 0.2);
        rightEyelid.rotation.x = THREE.MathUtils.lerp(rightEyelid.rotation.x, 0.1, 0.2);
        shyPawsGroup.visible = true;
        shyPawsGroup.position.y = THREE.MathUtils.lerp(shyPawsGroup.position.y, 0.55, 0.15);
        shyPawsGroup.scale.setScalar(THREE.MathUtils.lerp(shyPawsGroup.scale.x, 1.0, 0.15));
      } else if (currentMode === "password_peeking") {
        leftEyelid.rotation.x = THREE.MathUtils.lerp(leftEyelid.rotation.x, -Math.PI * 0.45, 0.2);
        rightEyelid.rotation.x = THREE.MathUtils.lerp(rightEyelid.rotation.x, -Math.PI * 0.15, 0.2);
        shyPawsGroup.visible = true;
        shyPawsGroup.position.y = THREE.MathUtils.lerp(shyPawsGroup.position.y, 0.35, 0.15);
        shyPawsGroup.scale.setScalar(THREE.MathUtils.lerp(shyPawsGroup.scale.x, 0.9, 0.15));
      } else {
        shyPawsGroup.visible = false;
        shyPawsGroup.position.y = 0.1;
        shyPawsGroup.scale.setScalar(0.5);

        if (isBlinking) {
          leftEyelid.rotation.x = THREE.MathUtils.lerp(leftEyelid.rotation.x, 0.1, 0.4);
          rightEyelid.rotation.x = THREE.MathUtils.lerp(rightEyelid.rotation.x, 0.1, 0.4);
        } else {
          leftEyelid.rotation.x = THREE.MathUtils.lerp(leftEyelid.rotation.x, -Math.PI * 0.5, 0.2);
          rightEyelid.rotation.x = THREE.MathUtils.lerp(rightEyelid.rotation.x, -Math.PI * 0.5, 0.2);
        }
      }

      // Waving "Hi" Gesture (Left Hand)
      if (currentMode === "idle" || currentMode === "email_focused") {
        leftHandGroup.rotation.z = Math.sin(time * 3.5) * 0.35;
        leftHandGroup.rotation.y = Math.cos(time * 2.5) * 0.15;
      } else if (currentMode === "submitting" || currentMode === "success") {
        leftHandGroup.rotation.z = Math.sin(time * 8.0) * 0.55;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] sm:min-h-[580px] rounded-[28px] overflow-hidden select-none flex flex-col justify-between bg-[#bae6fd]">
      {/* ── 3D WebGL Canvas ── */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* ── Top Badge ── */}
      <div className="relative z-10 p-6 flex items-center gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/70 text-xs font-bold text-[#0f172a] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Pixar 3D Mascot
        </div>
      </div>

      {/* ── Bottom Tracked Headline: EXPLORE. LEARN. GROW. ── */}
      <div className="relative z-10 p-6 sm:p-8 pointer-events-none">
        <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] uppercase">
          EXPLORE.
          <br />
          <span className="tracking-tight text-white">LEARN. GROW.</span>
        </h2>
      </div>
    </div>
  );
}
