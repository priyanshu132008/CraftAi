import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeProvider';

/**
 * Interactive particle wave field for the auth visual pane.
 *
 * A sine-displaced point grid whose nodes drift gently away from the
 * cursor. The particle color reads the live theme accent token
 * (--accent-indigo-bright), so the canvas restyles instantly when the
 * ThemeProvider flips light/dark — no hardcoded hex.
 */
export const AuthCanvas: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const { theme } = useTheme();

  // Theme change → recolor the particles from the CSS token.
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
      50,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, -18, 36);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Point grid on the x/y plane — z is the wave/repulsion axis.
    const COLS = 96;
    const ROWS = 48;
    const COUNT = (COLS + 1) * (ROWS + 1);
    const GRID_W = 92;
    const GRID_H = 46;
    const positions = new Float32Array(COUNT * 3);
    const base = new Float32Array(COUNT * 2); // flat x/y for the wave math
    let i = 0;
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        const x = (c / COLS - 0.5) * GRID_W;
        const y = (r / ROWS - 0.5) * GRID_H;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;
        base[i * 2] = x;
        base[i * 2 + 1] = y;
        i++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Soft radial glow sprite (matches the ThreeCanvas stardust idiom).
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
      size: 0.9,
      map: texture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    materialRef.current = material;
    // Apply the current theme token immediately (the [theme] effect only
    // fires on change).
    const initial = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-indigo-bright')
      .trim();
    material.color.set(initial || '#6366F1');

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Cursor tracking (pane-local, NDC → grid coords, smoothed).
    const mouse = { x: 0, y: 0 };
    const mouseTarget = { x: 0, y: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      mouseTarget.x = ndcX * (GRID_W / 2) * 1.15;
      mouseTarget.y = ndcY * (GRID_H / 2) * 1.15;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    const applyWave = (elapsed: number, repulse: number) => {
      for (let p = 0; p < COUNT; p++) {
        const x = base[p * 2];
        const y = base[p * 2 + 1];
        let z = Math.sin(x * 0.32 + elapsed * 0.9)
          * Math.cos(y * 0.42 + elapsed * 0.6) * 2.4;
        // Nodes drift away from the cursor (falls off with distance²).
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        z += repulse / (dx * dx + dy * dy + 1);
        positions[p * 3 + 2] = z;
      }
      geometry.attributes.position.needsUpdate = true;
    };

    let frameId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      mouse.x += (mouseTarget.x - mouse.x) * 0.06;
      mouse.y += (mouseTarget.y - mouse.y) * 0.06;
      applyWave(elapsed, 16);
      points.rotation.z = mouse.x * 0.02;
      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      applyWave(0, 0); // static field — no animation loop
      renderer.render(scene, camera);
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
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
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  );
};

export default AuthCanvas;