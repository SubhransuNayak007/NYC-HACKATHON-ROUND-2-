/**
 * Variable Font Animation System
 * Animates font-variation-settings via GSAP tied to scroll/interaction
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, typography } from '@/lib/tokens';

gsap.registerPlugin(ScrollTrigger);

// ============================================
// VARIABLE FONT CONFIGURATION
// ============================================

export interface VariableFontConfig {
  // Font CSS variable name
  cssVariable: string;
  // Axes to animate
  axes: {
    wght?: { min: number; max: number; default: number };
    wdth?: { min: number; max: number; default: number };
    slnt?: { min: number; max: number; default: number };
    opsz?: { min: number; max: number; default: number };
    [key: string]: { min: number; max: number; default: number } | undefined;
  };
  // Element selector or element
  target: string | Element;
}

export interface FontAnimationOptions {
  // ScrollTrigger config
  scrollTrigger?: ScrollTrigger.Vars;
  // GSAP tween config
  tween?: gsap.TweenVars;
  // Whether to animate on hover
  hover?: boolean;
  // Hover target (defaults to target)
  hoverTarget?: string | Element;
  // Axis to animate on hover
  hoverAxis?: keyof VariableFontConfig['axes'];
  // Hover range
  hoverRange?: [number, number];
}

// ============================================
// CORE VARIABLE FONT ANIMATOR
// ============================================

export class VariableFontAnimator {
  private config: VariableFontConfig;
  private ctx: gsap.Context | null = null;
  private currentValues: Record<string, number> = {};

  constructor(config: VariableFontConfig) {
    this.config = config;
    this.initializeValues();
  }

  private initializeValues() {
    this.currentValues = {};
    Object.entries(this.config.axes).forEach(([axis, range]) => {
      if (range) {
        this.currentValues[axis] = range.default;
      }
    });
    this.applyValues();
  }

  private applyValues() {
    const element = typeof this.config.target === 'string'
      ? document.querySelector(this.config.target)
      : this.config.target;

    if (!element) return;

    const settings = Object.entries(this.currentValues)
      .map(([axis, value]) => `"${axis}" ${value.toFixed(0)}`)
      .join(', ');

    element.style.setProperty(this.config.cssVariable, settings);
  }

  // Animate to specific values
  animateTo(values: Record<string, number>, options: gsap.TweenVars = {}) {
    Object.entries(values).forEach(([axis, value]) => {
      if (this.config.axes[axis] && this.currentValues[axis] !== undefined) {
        const range = this.config.axes[axis]!;
        // Clamp to range
        this.currentValues[axis] = Math.max(range.min, Math.min(range.max, value));
      }
    });

    gsap.to(this.currentValues, {
      ...values,
      duration: options.duration || motion.duration.normal / 1000,
      ease: options.ease || motion.easing.expressive,
      onUpdate: () => this.applyValues(),
      onComplete: options.onComplete,
    });
  }

  // Animate single axis
  animateAxis(axis: string, value: number, options: gsap.TweenVars = {}) {
    this.animateTo({ [axis]: value }, options);
  }

  // Reset to defaults
  reset(options: gsap.TweenVars = {}) {
    const defaults: Record<string, number> = {};
    Object.entries(this.config.axes).forEach(([axis, range]) => {
      if (range) defaults[axis] = range.default;
    });
    this.animateTo(defaults, options);
  }

  // Create scroll-linked animation
  linkToScroll(options: FontAnimationOptions = {}) {
    const { scrollTrigger, tween, ...rest } = options;

    this.ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: this.config.target,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1,
          ...scrollTrigger,
        },
        ...tween,
      });

      // Animate each axis based on scroll progress
      Object.entries(this.config.axes).forEach(([axis, range]) => {
        if (!range) return;

        const startValue = range.default;
        const endValue = range.max; // Can be customized per axis

        timeline.to(this.currentValues, {
          [axis]: endValue,
          duration: 1, // Normalized by scrub
          ease: 'none',
          onUpdate: () => this.applyValues(),
        }, 0);
      });

      return timeline;
    });

    return this.ctx;
  }

  // Create hover animation
  enableHover(options: FontAnimationOptions = {}) {
    const { hoverAxis = 'wght', hoverRange, hoverTarget } = options;
    const target = hoverTarget || this.config.target;
    const element = typeof target === 'string' ? document.querySelector(target) : target;

    if (!element || !this.config.axes[hoverAxis]) return;

    const range = this.config.axes[hoverAxis]!;
    const [from, to] = hoverRange || [range.default, range.max];

    const enter = () => {
      this.animateAxis(hoverAxis, to, {
        duration: motion.duration.fast / 1000,
        ease: motion.easing.micro,
      });
    };

    const leave = () => {
      this.animateAxis(hoverAxis, from, {
        duration: motion.duration.normal / 1000,
        ease: motion.easing.expressive,
      });
    };

    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);

    return () => {
      element.removeEventListener('mouseenter', enter);
      element.removeEventListener('mouseleave', leave);
    };
  }

  // Cleanup
  destroy() {
    this.ctx?.revert();
    this.ctx = null;
  }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create a variable font animator for display text
 */
export function createDisplayFontAnimator(
  target: string | Element,
  cssVariable = '--font-variations'
): VariableFontAnimator {
  return new VariableFontAnimator({
    cssVariable,
    target,
    axes: {
      wght: { min: 100, max: 900, default: 700 },
      wdth: { min: 50, max: 200, default: 100 },
      slnt: { min: -10, max: 10, default: 0 },
    },
  });
}

/**
 * Create a variable font animator for body text
 */
export function createBodyFontAnimator(
  target: string | Element,
  cssVariable = '--font-variations'
): VariableFontAnimator {
  return new VariableFontAnimator({
    cssVariable,
    target,
    axes: {
      wght: { min: 300, max: 600, default: 400 },
      wdth: { min: 75, max: 125, default: 100 },
    },
  });
}

/**
 * Create a variable font animator for interactive UI elements
 */
export function createInteractiveFontAnimator(
  target: string | Element,
  cssVariable = '--font-variations'
): VariableFontAnimator {
  return new VariableFontAnimator({
    cssVariable,
    target,
    axes: {
      wght: { min: 400, max: 700, default: 500 },
      wdth: { min: 80, max: 120, default: 100 },
      slnt: { min: -5, max: 5, default: 0 },
    },
  });
}

// ============================================
// REACT HOOKS
// ============================================

import { useEffect, useRef, useCallback } from 'react';

export function useVariableFont(config: VariableFontConfig) {
  const animatorRef = useRef<VariableFontAnimator | null>(null);

  useEffect(() => {
    animatorRef.current = new VariableFontAnimator(config);
    return () => animatorRef.current?.destroy();
  }, [config.target, config.cssVariable]);

  const animateTo = useCallback((values: Record<string, number>, options?: gsap.TweenVars) => {
    animatorRef.current?.animateTo(values, options);
  }, []);

  const animateAxis = useCallback((axis: string, value: number, options?: gsap.TweenVars) => {
    animatorRef.current?.animateAxis(axis, value, options);
  }, []);

  const reset = useCallback((options?: gsap.TweenVars) => {
    animatorRef.current?.reset(options);
  }, []);

  const linkToScroll = useCallback((options?: FontAnimationOptions) => {
    return animatorRef.current?.linkToScroll(options);
  }, []);

  const enableHover = useCallback((options?: FontAnimationOptions) => {
    return animatorRef.current?.enableHover(options);
  }, []);

  return {
    animateTo,
    animateAxis,
    reset,
    linkToScroll,
    enableHover,
    animator: animatorRef.current,
  };
}

// ============================================
// CSS VARIABLE GENERATOR (for stylesheets)
// ============================================

export function generateFontVariationCSS(
  fontFamily: string,
  axes: VariableFontConfig['axes']
): string {
  const settings = Object.entries(axes)
    .filter(([, range]) => range !== undefined)
    .map(([axis, range]) => `"${axis}" ${range!.default}`)
    .join(', ');

  return `
@font-face {
  font-family: '${fontFamily}';
  src: url('/fonts/${fontFamily.toLowerCase()}.woff2') format('woff2-variations');
  font-weight: ${axes.wght?.min || 100} ${axes.wght?.max || 900};
  font-stretch: ${axes.wdth?.min || 50}% ${axes.wdth?.max || 200}%;
  font-style: oblique ${axes.slnt?.min || -10}deg ${axes.slnt?.max || 10}deg;
}

.${fontFamily.toLowerCase()}-variable {
  font-family: '${fontFamily}';
  font-variation-settings: ${settings};
}
  `.trim();
}

// ============================================
// PRESET ANIMATIONS
// ============================================

export const fontAnimations = {
  // Weight shift on scroll
  weightShift: (animator: VariableFontAnimator, trigger: string | Element) => {
    return animator.linkToScroll({
      scrollTrigger: { trigger },
      tween: { ease: 'none' },
    });
  },

  // Width expansion on hover
  widthExpand: (animator: VariableFontAnimator, target: string | Element) => {
    return animator.enableHover({
      hoverAxis: 'wdth',
      hoverRange: [100, 150],
      hoverTarget: target,
    });
  },

  // Slant on interaction
  slantInteraction: (animator: VariableFontAnimator, target: string | Element) => {
    return animator.enableHover({
      hoverAxis: 'slnt',
      hoverRange: [0, 8],
      hoverTarget: target,
    });
  },

  // Multi-axis entrance
  entrance: (animator: VariableFontAnimator) => {
    return animator.animateTo(
      {
        wght: animator['config'].axes.wght?.max || 700,
        wdth: animator['config'].axes.wdth?.max || 120,
      },
      {
        duration: motion.duration.cinematic / 1000,
        ease: motion.easing.entrance,
      }
    );
  },
};

export default VariableFontAnimator;