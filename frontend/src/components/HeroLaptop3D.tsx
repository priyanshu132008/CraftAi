import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import laptopImg from '../assets/laptop-3d-spaceblack-mono.jpg';

export const HeroLaptop3D: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  // Smooth 3D mouse tilt tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for buttery tilt response
  const springX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 20 });

  const rotateX = useTransform(springY, [-150, 150], [6, -6]);
  const rotateY = useTransform(springX, [-150, 150], [-8, 8]);
  const translateZ = useTransform(springY, [-150, 150], [10, -10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '620px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1400px',
        cursor: 'grab'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Ambient Halo Light behind the laptop */}
      <motion.div
        animate={{
          scale: isHovered ? 1.15 : 1,
          opacity: isHovered ? 0.35 : 0.2
        }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          inset: '-30px',
          background: 'radial-gradient(ellipse 65% 55% at 50% 45%, rgba(255, 255, 255, 0.18), transparent 75%)',
          filter: 'blur(45px)',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Floating Levitation Container */}
      <motion.div
        animate={{
          y: [0, -12, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        style={{
          width: '100%',
          position: 'relative',
          zIndex: 1,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* 3D Tilted Wrapper */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            z: translateZ,
            transformStyle: 'preserve-3d',
            position: 'relative',
            borderRadius: '16px'
          }}
        >
          {/* Photorealistic 3D Space Black Laptop */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              WebkitMaskImage: 'radial-gradient(ellipse 96% 94% at 50% 50%, #000 80%, transparent 100%)',
              maskImage: 'radial-gradient(ellipse 96% 94% at 50% 50%, #000 80%, transparent 100%)',
              filter: isHovered ? 'drop-shadow(0 25px 45px rgba(255,255,255,0.06))' : 'drop-shadow(0 20px 35px rgba(0,0,0,0.8))',
              transition: 'filter 0.4s ease'
            }}
          >
            <img
              src={laptopImg}
              alt="CraftAi 3D Laptop Workspace"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
                transform: 'scale(1.02)'
              }}
            />
          </div>

          {/* Minimalist Live Telemetry Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '20px',
              background: 'rgba(10, 10, 10, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '9999px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: '#A1A1AA',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              pointerEvents: 'none'
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ color: '#FFFFFF', fontWeight: 600 }}>CraftAi Studio</span>
            <span style={{ color: '#52525B' }}>•</span>
            <span>Edge Ready</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};
