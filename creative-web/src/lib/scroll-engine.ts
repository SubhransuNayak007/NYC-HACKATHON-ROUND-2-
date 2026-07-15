'use client';

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from '@/lib/tokens';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// TYPES
// ============================================

export interface LenisOptions {
  lerp?: number;
  duration?: number;
  easing?: (t: number) => number;
  direction?: 'vertical' | 'horizontal';
  gestureDirection?: 'vertical' | 'horizontal';
  smooth?: boolean;
  smoothTouch?: boolean;
  touchMultiplier?: number;
  infinite?: boolean;
  wrapper?: HTMLElement | null;
  content?: HTMLElement | null;
}

export interface ScrollEngineConfig {
  lenis?: LenisOptions;
  scrollTrigger?: {
    autoRefresh?: boolean;
    limitCallbacks?: boolean;
    ignoreMobileResize?: boolean;
  };
  reducedMotion?: boolean;
  useNativeFallback?: boolean;
}

export interface ScrollTimelineOptions {
  source?: 'auto' | 'element' | 'view';
  axis?: 'x' | 'y' | 'block' | 'inline';
  start?: string;
  end?: string;
  scrub?: number | boolean;
}

export interface ScrubValues {
  start: number;
  end: number;
  progress: number;
  velocity: number;
  direction: 1 | -1;
}

export interface PinHelperOptions {
  pin: boolean | HTMLElement;
  pinSpacing?: boolean | 'auto' | number;
  pinReparent?: boolean;
  pinType?: 'fixed' | 'transform';
}

export type LenisInstance = Lenis & {
  scrollTo: (target: string | number | HTMLElement, options?: LenisScrollToOptions) => void;
};

export interface LenisScrollToOptions {
  offset?: number;
  immediate?: boolean;
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
}

// ============================================
// LERP & EASING UTILITIES
// ============================================

/**
 * Creates a lerp function using motion token easing curves
 */
export function createLerp(easing: readonly number[] = motion.easing.expressive) {
  const [x1, y1, x2, y2] = easing;
  return (t: number) => {
    // Cubic bezier implementation
    const u = 1 - t;
    return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
  };
}

/**
 * Default lerp value from tokens (0.075 ≈ 1/13.3)
 */
export const DEFAULT_LERP = 0.075;

/**
 * Creates a spring config from motion tokens
 */
export function createSpringConfig(preset: keyof typeof motion.easing = 'spring') {
  const spring = motion.easing[preset];
  if (typeof spring === 'object' && 'type' in spring && spring.type === 'spring') {
    return { stiffness: spring.stiffness, damping: spring.damping };
  }
  return { stiffness: 400, damping: 20 };
}

// ============================================
// SCROLL ENGINE CLASS
// ============================================

class ScrollEngine {
  private lenis: LenisInstance | null = null;
  private config: ScrollEngineConfig;
  private isInitialized = false;
  private rafId: number | null = null;
  private scrollTriggerInstances: ScrollTrigger[] = [];
  private prefersReducedMotion = false;

  constructor(config: ScrollEngineConfig = {}) {
    this.config = {
      lenis: {
        lerp: DEFAULT_LERP,
        duration: 1.2,
        easing: createLerp(motion.easing.expressive),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        smoothTouch: true,
        touchMultiplier: 2,
        infinite: true,
        ...config.lenis,
      },
      scrollTrigger: {
        autoRefresh: true,
        limitCallbacks: true,
        ignoreMobileResize: true,
        ...config.scrollTrigger,
      },
      reducedMotion: config.reducedMotion ?? false,
      useNativeFallback: config.useNativeFallback ?? true,
    };

    // Check for reduced motion preference
    if (typeof window !== 'undefined') {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Listen for changes
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener?.('change', (e) => {
        this.prefersReducedMotion = e.matches;
        this.updateReducedMotion(e.matches);
      });
    }
  }

  /**
   * Initialize Lenis smooth scroll
   */
  init(): LenisInstance {
    if (this.isInitialized && this.lenis) {
      return this.lenis;
    }

    // Use native scroll if reduced motion or fallback enabled
    if (this.prefersReducedMotion || (this.config.useNativeFallback && this.config.reducedMotion)) {
      this.initNativeFallback();
      return this.lenis!;
    }

    this.lenis = new Lenis(this.config.lenis as Lenis.Options) as LenisInstance;

    // Bind ScrollTrigger to Lenis
    this.bindScrollTrigger();

    // Start RAF loop
    this.rafId = requestAnimationFrame(this.raf.bind(this));

    this.isInitialized = true;
    return this.lenis;
  }

  /**
   * Initialize native CSS scroll-timeline fallback
   */
  private initNativeFallback(): void {
    this.lenis = {
      // Mock Lenis API for native scroll
      scrollTo: (target: string | number | HTMLElement, options?: LenisScrollToOptions) => {
        const element = typeof target === 'string'
          ? document.querySelector(target)
          : target instanceof HTMLElement
            ? target
            : null;

        if (element) {
          element.scrollIntoView({
            behavior: options?.immediate ? 'auto' : 'smooth',
            block: 'start',
          });
        } else if (typeof target === 'number') {
          window.scrollTo({
            top: target,
            behavior: options?.immediate ? 'auto' : 'smooth',
          });
        }

        options?.onComplete?.();
      },
      on: () => {},
      off: () => {},
      destroy: () => {},
      stop: () => {},
      start: () => {},
      isStopped: false,
      isSmooth: false,
      wrapper: window,
      content: document.documentElement,
    } as LenisInstance;

    // Enable native scroll-timeline animations
    this.enableNativeScrollTimeline();
  }

  /**
   * Enable native CSS scroll-timeline animations
   */
  private enableNativeScrollTimeline(): void {
    if (typeof document === 'undefined') return;

    // Add CSS custom properties for scroll progress
    const style = document.createElement('style');
    style.textContent = `
      @supports (animation-timeline: scroll()) {
        :root {
          --scroll-progress: 0;
          --scroll-y: 0;
          --scroll-x: 0;
        }

        [data-scroll-timeline] {
          animation-timeline: scroll(root);
        }

        [data-scroll-timeline="element"] {
          animation-timeline: view();
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Bind GSAP ScrollTrigger to Lenis
   */
  private bindScrollTrigger(): void {
    if (!this.lenis || typeof window === 'undefined') return;

    // Proxy scroll for ScrollTrigger
    ScrollTrigger.scrollerProxy(this.lenis.wrapper || window, {
      scrollTop(value: number) {
        if (arguments.length) {
          this.lenis?.scrollTo(value, { immediate: true });
        }
        return this.lenis?.scroll || window.scrollY;
      },
      scrollLeft(value: number) {
        if (arguments.length) {
          this.lenis?.scrollTo(value, { immediate: true });
        }
        return this.lenis?.scroll || window.scrollX;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType: this.lenis.wrapper ? 'transform' : 'fixed',
    });

    // Refresh ScrollTrigger on Lenis scroll
    this.lenis.on('scroll', () => {
      ScrollTrigger.update();
    });

    // Refresh on resize
    if (this.config.scrollTrigger?.autoRefresh) {
      window.addEventListener('resize', () => {
        ScrollTrigger.refresh();
      });
    }
  }

  /**
   * RAF loop for Lenis
   */
  private raf = (time: number): void => {
    this.lenis?.raf(time);
    this.rafId = requestAnimationFrame(this.raf);
  };

  /**
   * Update reduced motion state
   */
  updateReducedMotion(reduced: boolean): void {
    if (this.lenis) {
      if (reduced) {
        this.lenis.stop();
      } else {
        this.lenis.start();
      }
    }
  }

  /**
   * Get Lenis instance
   */
  getLenis(): LenisInstance | null {
    return this.lenis;
  }

  /**
   * Create a GSAP ScrollTrigger with proper defaults
   */
  createScrollTrigger(vars: gsap.plugins.ScrollTriggerVars): ScrollTrigger {
    const trigger = ScrollTrigger.create({
      ...vars,
      scroller: this.lenis?.wrapper || window,
    });

    this.scrollTriggerInstances.push(trigger);
    return trigger;
  }

  /**
   * Create a scroll timeline animation (native CSS or GSAP)
   */
  createScrollTimeline(
    element: HTMLElement | string,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: ScrollTimelineOptions = {}
  ): Animation | ScrollTrigger {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) throw new Error('Element not found for scroll timeline');

    const {
      source = 'auto',
      axis = 'block',
      start = 'top bottom',
      end = 'bottom top',
      scrub = 1,
    } = options;

    // Try native scroll-timeline first
    if (this.config.useNativeFallback && this.supportsScrollTimeline()) {
      return this.createNativeScrollTimeline(el, keyframes, { source, axis, start, end, scrub });
    }

    // Fallback to GSAP ScrollTrigger
    return this.createGSScrollTimeline(el, keyframes, { start, end, scrub });
  }

  /**
   * Check if native scroll-timeline is supported
   */
  private supportsScrollTimeline(): boolean {
    if (typeof window === 'undefined') return false;
    return CSS.supports('animation-timeline', 'scroll()');
  }

  /**
   * Create native CSS scroll-timeline animation
   */
  private createNativeScrollTimeline(
    element: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: ScrollTimelineOptions
  ): Animation {
    const { source, axis, start, end, scrub } = options;

    // Create scroll timeline
    const timeline = new ScrollTimeline({
      source: source === 'element' ? element : document.documentElement,
      axis,
      timeRange: 1,
    });

    // Create animation
    const animation = element.animate(keyframes, {
      timeline,
      duration: 'auto',
      fill: 'both',
    });

    // Handle scrub
    if (typeof scrub === 'number') {
      animation.playbackRate = scrub;
    }

    return animation;
  }

  /**
   * Create GSAP ScrollTrigger-based scroll timeline
   */
  private createGSScrollTimeline(
    element: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes,
    options: { start: string; end: string; scrub: number | boolean }
  ): ScrollTrigger {
    const { start, end, scrub } = options;

    // Convert keyframes to GSAP format
    const gsapVars: gsap.TweenVars = {};
    if (Array.isArray(keyframes)) {
      keyframes.forEach((frame, i) => {
        Object.entries(frame).forEach(([prop, value]) => {
          if (prop !== 'offset' && prop !== 'easing' && prop !== 'composite') {
            gsapVars[prop] = i === keyframes.length - 1 ? value : value;
          }
        });
      });
    } else {
      Object.assign(gsapVars, keyframes);
    }

    const trigger = this.createScrollTrigger({
      trigger: element,
      start,
      end,
      scrub: scrub === true ? 1 : scrub,
      animation: gsap.to(element, gsapVars),
      invalidateOnRefresh: true,
    });

    return trigger;
  }

  /**
   * Create scrub values helper for custom animations
   */
  createScrubValues(): ScrubValues {
    return {
      start: 0,
      end: 1,
      progress: 0,
      velocity: 0,
      direction: 1,
    };
  }

  /**
   * Update scrub values from ScrollTrigger
   */
  updateScrubValues(trigger: ScrollTrigger, values: ScrubValues): ScrubValues {
    return {
      start: trigger.start,
      end: trigger.end,
      progress: trigger.progress,
      velocity: trigger.getVelocity(),
      direction: trigger.direction,
    };
  }

  /**
   * Pin helper - creates a pin configuration
   */
  createPinHelper(options: PinHelperOptions): gsap.plugins.ScrollTriggerVars {
    const { pin, pinSpacing = true, pinReparent = false, pinType = 'fixed' } = options;

    return {
      pin,
      pinSpacing,
      pinReparent,
      pinType,
      scroller: this.lenis?.wrapper || window,
    };
  }

  /**
   * Scroll to target with Lenis or native fallback
   */
  scrollTo(target: string | number | HTMLElement, options?: LenisScrollToOptions): void {
    this.lenis?.scrollTo(target, options);
  }

  /**
   * Get current scroll position
   */
  getScroll(): number {
    return this.lenis?.scroll || window.scrollY;
  }

  /**
   * Get scroll velocity
   */
  getVelocity(): number {
    return this.lenis?.velocity || 0;
  }

  /**
   * Check if scrolling
   */
  isScrolling(): boolean {
    return this.lenis?.isScrolling || false;
  }

  /**
   * Stop smooth scroll
   */
  stop(): void {
    this.lenis?.stop();
  }

  /**
   * Start smooth scroll
   */
  start(): void {
    this.lenis?.start();
  }

  /**
   * Refresh all ScrollTriggers
   */
  refresh(): void {
    ScrollTrigger.refresh();
  }

  /**
   * Destroy engine and cleanup
   */
  destroy(): void {
    // Cancel RAF
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Kill all ScrollTrigger instances
    this.scrollTriggerInstances.forEach((trigger) => trigger.kill());
    this.scrollTriggerInstances = [];

    // Destroy Lenis
    this.lenis?.destroy();
    this.lenis = null;

    // Revert ScrollTrigger scrollerProxy
    ScrollTrigger.scrollerProxy(window);

    this.isInitialized = false;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let scrollEngineInstance: ScrollEngine | null = null;

export function getScrollEngine(config?: ScrollEngineConfig): ScrollEngine {
  if (!scrollEngineInstance) {
    scrollEngineInstance = new ScrollEngine(config);
  }
  return scrollEngineInstance;
}

export function initScrollEngine(config?: ScrollEngineConfig): LenisInstance {
  const engine = getScrollEngine(config);
  return engine.init();
}

export function destroyScrollEngine(): void {
  scrollEngineInstance?.destroy();
  scrollEngineInstance = null;
}

// ============================================
// EXPORT UTILITIES
// ============================================

export const scrollEngine = {
  init: initScrollEngine,
  get: getScrollEngine,
  destroy: destroyScrollEngine,
};

export default scrollEngine;