import { animate, stagger } from 'animejs';

export function animateStaggerCards(selector: string) {
  try {
    animate(selector, {
      opacity: [0, 1],
      translateY: [24, 0],
      delay: stagger(80, { start: 100 }),
      ease: 'outCubic',
      duration: 650
    });
  } catch (e) {
    // fallback gracefully
  }
}

export function animateTextReveal(target: HTMLElement | string) {
  try {
    animate(target, {
      opacity: [0, 1],
      translateY: [12, 0],
      ease: 'outExpo',
      duration: 800
    });
  } catch (e) {
    // fallback gracefully
  }
}

export function animatePulse(target: HTMLElement | string) {
  try {
    animate(target, {
      scale: [1, 1.05, 1],
      ease: 'inOutQuad',
      duration: 1200,
      loop: true
    });
  } catch (e) {
    // fallback gracefully
  }
}
