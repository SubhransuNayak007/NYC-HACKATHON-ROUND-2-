'use client';

import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import type { LenisInstance, LenisOptions, LenisScrollToOptions } from '@/lib/scroll-engine';
import { getScrollEngine, initScrollEngine, destroyScrollEngine } from '@/lib/scroll-engine';

// ============================================
// TYPES
// ============================================

export interface UseLenisOptions extends LenisOptions {
  autoInit?: boolean;
  immediate?: boolean;
}

export interface UseLenisReturn {
  lenis: LenisInstance | null;
  scrollTo: (target: string | number | HTMLElement, options?: LenisScrollToOptions) => void;
  stop: () => void;
  start: () => void;
  refresh: () => void;
  destroy: () => void;
  isInitialized: boolean;
  scroll: number;
  velocity: number;
  direction: 1 | -1;
  progress: number;
  limit: number;
  isScrolling: boolean;
  isStopped: boolean;
  wrapper: HTMLElement | Window | null;
  content: HTMLElement | null;
}

// ============================================
// SUBSCRIPTION FOR REACT 18+ CONCURRENT FEATURES
// ============================================

function createLenisStore(lenis: LenisInstance | null) {
  let subscribers = new Set<() => void>();
  let snapshot = {
    scroll: 0,
    velocity: 0,
    direction: 1 as 1 | -1,
    progress: 0,
    limit: 0,
    isScrolling: false,
    isStopped: true,
    wrapper: null as HTMLElement | Window | null,
    content: null as HTMLElement | null,
  };

  const updateSnapshot = () => {
    if (!lenis) return;
    snapshot = {
      scroll: lenis.scroll,
      velocity: lenis.velocity,
      direction: lenis.direction,
      progress: lenis.progress,
      limit: lenis.limit,
      isScrolling: lenis.isScrolling,
      isStopped: lenis.isStopped,
      wrapper: lenis.wrapper,
      content: lenis.content,
    };
    subscribers.forEach((cb) => cb());
  };

  // Subscribe to Lenis scroll events
  if (lenis) {
    lenis.on('scroll', updateSnapshot);
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => snapshot,
    subscribe: (callback: () => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    destroy: () => {
      if (lenis) {
        lenis.off('scroll', updateSnapshot);
      }
      subscribers.clear();
    },
  };
}

// ============================================
// HOOK
// ============================================

export function useLenis(options: UseLenisOptions = {}): UseLenisReturn {
  const {
    autoInit = true,
    immediate = false,
    ...lenisOptions
  } = options;

  const engineRef = useRef<ReturnType<typeof getScrollEngine> | null>(null);
  const lenisRef = useRef<LenisInstance | null>(null);
  const storeRef = useRef<ReturnType<typeof createLenisStore> | null>(null);
  const initializedRef = useRef(false);

  // Initialize engine on mount
  useEffect(() => {
    if (autoInit && !initializedRef.current) {
      engineRef.current = getScrollEngine({ lenis: lenisOptions });
      lenisRef.current = engineRef.current.init();
      storeRef.current = createLenisStore(lenisRef.current);
      initializedRef.current = true;
    }

    return () => {
      // Cleanup on unmount if we own the engine
      if (autoInit && initializedRef.current) {
        storeRef.current?.destroy();
        destroyScrollEngine();
        engineRef.current = null;
        lenisRef.current = null;
        storeRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [autoInit, immediate, lenisOptions.lerp, lenisOptions.duration, lenisOptions.direction]);

  // Subscribe to Lenis updates for reactive values
  const snapshot = useSyncExternalStore(
    storeRef.current?.subscribe ?? (() => () => {}),
    storeRef.current?.getSnapshot ?? (() => ({
      scroll: 0,
      velocity: 0,
      direction: 1 as 1 | -1,
      progress: 0,
      limit: 0,
      isScrolling: false,
      isStopped: true,
      wrapper: null,
      content: null,
    })),
    storeRef.current?.getServerSnapshot ?? (() => ({
      scroll: 0,
      velocity: 0,
      direction: 1 as 1 | -1,
      progress: 0,
      limit: 0,
      isScrolling: false,
      isStopped: true,
      wrapper: null,
      content: null,
    }))
  );

  // Scroll to method
  const scrollTo = useCallback(
    (target: string | number | HTMLElement, scrollOptions?: LenisScrollToOptions) => {
      lenisRef.current?.scrollTo(target, { ...scrollOptions, immediate: scrollOptions?.immediate ?? immediate });
    },
    [immediate]
  );

  // Control methods
  const stop = useCallback(() => {
    lenisRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    lenisRef.current?.start();
  }, []);

  const refresh = useCallback(() => {
    engineRef.current?.refresh();
  }, []);

  const destroy = useCallback(() => {
    storeRef.current?.destroy();
    destroyScrollEngine();
    engineRef.current = null;
    lenisRef.current = null;
    storeRef.current = null;
    initializedRef.current = false;
  }, []);

  return {
    lenis: lenisRef.current,
    scrollTo,
    stop,
    start,
    refresh,
    destroy,
    isInitialized: initializedRef.current,
    ...snapshot,
  };
}

// ============================================
// SIMPLIFIED HOOK FOR QUICK ACCESS
// ============================================

export function useLenisInstance(): LenisInstance | null {
  const { lenis } = useLenis({ autoInit: true });
  return lenis;
}

export function useScrollPosition(): number {
  const { scroll } = useLenis({ autoInit: true });
  return scroll;
}

export function useScrollVelocity(): number {
  const { velocity } = useLenis({ autoInit: true });
  return velocity;
}

export function useScrollDirection(): 1 | -1 {
  const { direction } = useLenis({ autoInit: true });
  return direction;
}

export function useScrollProgress(): number {
  const { progress } = useLenis({ autoInit: true });
  return progress;
}

export function useIsScrolling(): boolean {
  const { isScrolling } = useLenis({ autoInit: true });
  return isScrolling;
}

// ============================================
// CONTEXT FOR PROVIDER PATTERN
// ============================================

import { createContext, useContext, ReactNode } from 'react';

interface LenisContextValue extends UseLenisReturn {}

const LenisContext = createContext<LenisContextValue | null>(null);

export function LenisProvider({
  children,
  options = {},
}: {
  children: ReactNode;
  options?: UseLenisOptions;
}) {
  const lenis = useLenis({ ...options, autoInit: true });

  return (
    <LenisContext.Provider value={lenis}>
      {children}
    </LenisContext.Provider>
  );
}

export function useLenisContext(): LenisContextValue {
  const context = useContext(LenisContext);
  if (!context) {
    throw new Error('useLenisContext must be used within a LenisProvider');
  }
  return context;
}

export default useLenis;