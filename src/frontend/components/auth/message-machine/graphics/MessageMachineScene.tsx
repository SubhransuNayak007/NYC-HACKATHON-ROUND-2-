"use client";

/**
 * ============================================================
 *  QuickReply — 3D Message Machine WebGL Scene
 *  src/frontend/components/auth/message-machine/graphics/MessageMachineScene.tsx
 *
 *  Three.js central Command Core & instanced communication particles.
 * ============================================================
 */

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { PhysicsEngine } from "../physicsEngine";
import { MM_CHANNELS, MM_COLORS } from "../tokens";

interface MessageMachineSceneProps {
  physics: PhysicsEngine;
  contractionProgress: number; // 0 (expanded) -> 1 (auth panel mode)
  selectedChannel: string | null;
  isReducedMotion?: boolean;
}

export function MessageMachineScene({
  physics,
  contractionProgress,
  selectedChannel,
  isReducedMotion = false,
}: MessageMachineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 0, 580);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Lighting (Clean High-Contrast Studio)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(200, 300, 400);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffe885, 1.8);
    dirLight2.position.set(-250, -150, 200);
    scene.add(dirLight2);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8);
    rimLight.position.set(0, -300, -200);
    scene.add(rimLight);

    // 4. Central 3D "COMMAND CORE" Sphere
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Main Core Sphere (Rich Instrument Yellow)
    const coreGeometry = new THREE.SphereGeometry(38, 64, 64);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(MM_COLORS.yellowPrimary),
      metalness: 0.18,
      roughness: 0.28,
      emissive: new THREE.Color(MM_COLORS.yellowDeep),
      emissiveIntensity: 0.12,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreGroup.add(coreMesh);

    // Inner Signal Core (Slightly Pulsing Inner White Shell)
    const innerGeometry = new THREE.SphereGeometry(22, 32, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    coreGroup.add(innerMesh);

    // 5. Instanced Communication Particles
    const particleCount = physics.state.particles.length;
    const particleGeom = new THREE.SphereGeometry(1, 16, 16);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.2,
    });

    const instancedParticles = new THREE.InstancedMesh(
      particleGeom,
      particleMat,
      particleCount
    );
    instancedParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedParticles);

    const dummy = new THREE.Object3D();
    const colorObj = new THREE.Color();

    // Set initial particle colors
    for (let i = 0; i < particleCount; i++) {
      const p = physics.state.particles[i];
      colorObj.set(p.color);
      instancedParticles.setColorAt(i, colorObj);
    }
    if (instancedParticles.instanceColor) {
      instancedParticles.instanceColor.needsUpdate = true;
    }

    // 6. Connection Lines & Signal Pulses Group
    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    // Create line segments to channel nodes
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(MM_COLORS.border),
      transparent: true,
      opacity: 0.7,
      linewidth: 1,
    });

    const lineObjects: THREE.Line[] = [];
    MM_CHANNELS.forEach((channel) => {
      const targetX = Math.cos(channel.angle) * channel.distance;
      const targetY = Math.sin(channel.angle) * (channel.distance * 0.75);
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(targetX, targetY, 0)];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, lineMat);
      linesGroup.add(line);
      lineObjects.push(line);
    });

    // Signal Pulses (Instanced Spheres traveling on lines)
    const pulseGeom = new THREE.SphereGeometry(3.5, 16, 16);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(MM_COLORS.yellowPrimary),
    });
    const pulseMeshPool: THREE.Mesh[] = [];
    for (let i = 0; i < 20; i++) {
      const pMesh = new THREE.Mesh(pulseGeom, pulseMat);
      pMesh.visible = false;
      scene.add(pMesh);
      pulseMeshPool.push(pMesh);
    }

    // 7. Animation Loop
    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update physics
      physics.setContraction(contractionProgress);
      physics.tick(delta, isReducedMotion);

      // Core rotation & scale
      coreGroup.rotation.y += 0.004;
      coreGroup.rotation.x = Math.sin(now * 0.001) * 0.08;

      const scale = physics.state.coreScale * (1.0 - contractionProgress * 0.35);
      coreGroup.scale.set(scale, scale, scale);

      // Camera parallax reacting smoothly to mouse
      const targetCamX = (physics.state.mouseX * 0.08);
      const targetCamY = (-physics.state.mouseY * 0.08);
      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      // Update instanced particles
      const particles = physics.state.particles;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        dummy.position.set(p.x, p.y, p.z);
        const pScale = p.size * (1.0 - contractionProgress * 0.5);
        dummy.scale.set(pScale, pScale, pScale);
        dummy.updateMatrix();
        instancedParticles.setMatrixAt(i, dummy.matrix);
      }
      instancedParticles.instanceMatrix.needsUpdate = true;

      // Update signal pulses on lines
      const activePulses = physics.state.pulses;
      for (let i = 0; i < pulseMeshPool.length; i++) {
        const pMesh = pulseMeshPool[i];
        if (i < activePulses.length) {
          const pulse = activePulses[i];
          const channel = MM_CHANNELS[pulse.fromChannelIndex];
          const startX = Math.cos(channel.angle) * channel.distance * (1.0 - contractionProgress);
          const startY = Math.sin(channel.angle) * (channel.distance * 0.75) * (1.0 - contractionProgress);
          
          // Lerp towards center (0,0,0)
          const px = startX * (1.0 - pulse.progress);
          const py = startY * (1.0 - pulse.progress);

          pMesh.position.set(px, py, 5);
          pMesh.visible = true;
        } else {
          pMesh.visible = false;
        }
      }

      // Hide lines when contracted into auth panel
      linesGroup.visible = contractionProgress < 0.8;

      renderer.render(scene, camera);
      reqIdRef.current = requestAnimationFrame(animate);
    };

    reqIdRef.current = requestAnimationFrame(animate);

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    // 9. Cleanup
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener("resize", handleResize);

      coreGeometry.dispose();
      coreMaterial.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      pulseGeom.dispose();
      pulseMat.dispose();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [physics, contractionProgress, isReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
}
