import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../context/ThemeProvider';

/**
 * Ambient backdrop for the generation stage — port of the Stitch
 * "Main workspace" ANIMATION_50: wireframe icosahedra, a floating ring
 * and a drifting particle field. Theme-reactive (colors read the CSS
 * tokens), renders a single static frame under prefers-reduced-motion,
 * and fully disposes GPU resources on unmount (HeroParticleField pattern).
 */
export const StageWireframe: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const outerMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const innerMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const ringMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const pointsMatRef = useRef<THREE.PointsMaterial | null>(null);
  const { theme } = useTheme();

  // Theme change → recolor every material from the CSS tokens.
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent-indigo-bright').trim() || '#6366F1';
    const line = css.getPropertyValue('--text-muted').trim() || '#71717A';
    const dim = css.getPropertyValue('--text-subtle').trim() || '#A1A1AA';
    outerMatRef.current?.color.set(accent);
    innerMatRef.current?.color.set(line);
    ringMatRef.current?.color.set(dim);
    pointsMatRef.current?.color.set(line);
  }, [theme]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      1000
    );
    camera.position.set(0, 0, 45);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent-indigo-bright').trim() || '#6366F1';
    const line = css.getPropertyValue('--text-muted').trim() || '#71717A';
    const dim = css.getPropertyValue('--text-subtle').trim() || '#A1A1AA';

    // Wireframe icosahedra (outer accent + inner monochrome)
    const icosaGeo = new THREE.IcosahedronGeometry(14, 2);
    const outerWire = new THREE.WireframeGeometry(icosaGeo);
    const outerMat = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.22
    });
    const icosaMesh = new THREE.LineSegments(outerWire, outerMat);
    scene.add(icosaMesh);

    const innerIcosaGeo = new THREE.IcosahedronGeometry(9, 1);
    const innerWire = new THREE.WireframeGeometry(innerIcosaGeo);
    const innerMat = new THREE.LineBasicMaterial({
      color: line,
      transparent: true,
      opacity: 0.18
    });
    const innerMesh = new THREE.LineSegments(innerWire, innerMat);
    scene.add(innerMesh);

    // Concentric floating ring
    const ringGeo = new THREE.RingGeometry(18, 18.08, 64);
    const ringWire = new THREE.WireframeGeometry(ringGeo);
    const ringMat = new THREE.LineBasicMaterial({
      color: dim,
      transparent: true,
      opacity: 0.6
    });
    const ringMesh = new THREE.LineSegments(ringWire, ringMat);
    ringMesh.rotation.x = Math.PI / 2.3;
    scene.add(ringMesh);

    // Particle field
    const PARTICLE_COUNT = 700;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 85;
      positions[i + 1] = (Math.random() - 0.5) * 65;
      positions[i + 2] = (Math.random() - 0.5) * 70;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({
      size: 0.18,
      color: line,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    outerMatRef.current = outerMat;
    innerMatRef.current = innerMat;
    ringMatRef.current = ringMat;
    pointsMatRef.current = particlesMat;

    // Gentle pointer parallax
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

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
    const render = (elapsed: number) => {
      icosaMesh.rotation.x = elapsed * 0.08 + mouseY * 0.15;
      icosaMesh.rotation.y = elapsed * 0.1 + mouseX * 0.15;
      innerMesh.rotation.x = -elapsed * 0.12 - mouseY * 0.1;
      innerMesh.rotation.y = -elapsed * 0.15 - mouseX * 0.1;
      ringMesh.rotation.z = elapsed * 0.04;
      particlesMesh.rotation.y = elapsed * 0.02 + mouseX * 0.05;
      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      render(0);
    } else {
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        render(clock.getElapsedTime());
      };
      animate();
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      outerWire.dispose();
      innerWire.dispose();
      ringWire.dispose();
      icosaGeo.dispose();
      innerIcosaGeo.dispose();
      ringGeo.dispose();
      particlesGeo.dispose();
      outerMat.dispose();
      innerMat.dispose();
      ringMat.dispose();
      particlesMat.dispose();
      renderer.dispose();
      outerMatRef.current = null;
      innerMatRef.current = null;
      ringMatRef.current = null;
      pointsMatRef.current = null;
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

export default StageWireframe;