import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeProvider';

/**
 * Full-bleed ambient particle field behind the dashboard hero text —
 * a slow upward drift of soft glow points, pointer-transparent so it
 * never blocks UI. Color follows the live theme accent token.
 */
export const HeroParticleField: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const { theme } = useTheme();

  // Theme change → recolor from the CSS token.
  useEffect(() => {
    if (!materialRef.current) return;
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-indigo-bright')
      .trim();
    materialRef.current.color.set(token || '#6366F1');
  }, [theme]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0, 26);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const COUNT = 240;
    // Field bounds (world units) — particles wrap vertically.
    const W = 92;
    const H = 46;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let p = 0; p < COUNT; p++) {
      positions[p * 3] = (Math.random() - 0.5) * W;
      positions[p * 3 + 1] = (Math.random() - 0.5) * H;
      positions[p * 3 + 2] = (Math.random() - 0.5) * 8;
      speeds[p] = 0.2 + Math.random() * 0.55;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 32;
    glowCanvas.height = 32;
    const ctx = glowCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(glowCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.5,
      map: texture,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    materialRef.current = material;
    const initial = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-indigo-bright')
      .trim();
    material.color.set(initial || '#6366F1');

    scene.add(new THREE.Points(geometry, material));

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId: number;
    const render = (dt: number) => {
      for (let p = 0; p < COUNT; p++) {
        // Slow upward drift + a gentle lateral sway.
        positions[p * 3 + 1] += speeds[p] * dt;
        if (positions[p * 3 + 1] > H / 2) positions[p * 3 + 1] = -H / 2;
      }
      geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      render(0);
    } else {
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        render(Math.min(clock.getDelta(), 0.05));
      };
      animate();
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      materialRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default HeroParticleField;