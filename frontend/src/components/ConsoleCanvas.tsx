import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeProvider';

interface ConsoleCanvasProps {
  /**
   * Shared typing-energy cell (0..1). The console bumps it on every
   * keystroke; the render loop decays it each frame and drives the
   * wave amplitude / brightness from the live value.
   */
  energyRef: React.MutableRefObject<number>;
}

/**
 * Ambient particle sheet behind the prompt console. Calm at rest,
 * pulses and warps harder as the user types (Phase 4 keystroke
 * reactivity). Color follows the live theme accent token.
 */
export const ConsoleCanvas: React.FC<ConsoleCanvasProps> = ({ energyRef }) => {
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
      50,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, -14, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const COLS = 64;
    const ROWS = 10;
    const COUNT = (COLS + 1) * (ROWS + 1);
    const GRID_W = 80;
    const GRID_H = 12;
    const positions = new Float32Array(COUNT * 3);
    const base = new Float32Array(COUNT * 2);
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
      size: 0.7,
      map: texture,
      transparent: true,
      opacity: 0.35,
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
    const render = (energy: number, elapsed: number) => {
      for (let p = 0; p < COUNT; p++) {
        const x = base[p * 2];
        const y = base[p * 2 + 1];
        // Rest: gentle ripple. Typing: faster, taller waves.
        const amp = 0.35 + energy * 2.2;
        const speed = 0.5 + energy * 2.0;
        positions[p * 3 + 2] =
          Math.sin(x * 0.25 + elapsed * speed) *
          Math.cos(y * 0.6 + elapsed * speed * 0.7) * amp;
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = 0.25 + energy * 0.55;
      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      render(0, 0);
    } else {
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        // Decay typing energy so the field settles when the user pauses.
        energyRef.current = Math.max(0, energyRef.current * 0.94);
        render(energyRef.current, clock.getElapsedTime());
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
  }, [energyRef]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default ConsoleCanvas;