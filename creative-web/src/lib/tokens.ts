/**
 * Design Token System
 * Single source of truth for motion, color, spacing, typography
 * Used across CSS, JavaScript, and GLSL shaders
 */

// ============================================
// MOTION TOKENS
// ============================================

export const motion = {
  // Easing curves - cubic-bezier values for CSS & GSAP
  easing: {
    // Standard Material easing - predictable, functional
    standard: [0.2, 0, 0.38, 0.9] as const,
    // Expressive brand easing - personality, delight
    expressive: [0.4, 0, 0.2, 1] as const,
    // Entrance - fast start, slow settle
    entrance: [0, 0, 0.2, 1] as const,
    // Exit - slow start, fast leave
    exit: [0.4, 0, 1, 1] as const,
    // Spring physics for organic feel
    spring: { type: 'spring', stiffness: 400, damping: 20 } as const,
    springGentle: { type: 'spring', stiffness: 300, damping: 25 } as const,
    springSnappy: { type: 'spring', stiffness: 500, damping: 15 } as const,
    // Micro-interaction specific
    micro: [0.05, 0.7, 0.1, 1] as const,
    magnetic: [0.16, 1, 0.3, 1] as const,
  },

  // Duration scale - consistent timing language
  duration: {
    instant: 0,
    micro: 80,
    fast: 150,
    normal: 300,
    slow: 500,
    cinematic: 800,
    epic: 1200,
  },

  // Stagger delays for sequential animations
  stagger: {
    tight: 0.03,
    normal: 0.06,
    loose: 0.12,
    section: 0.2,
  },

  // Reduced motion alternatives
  reduced: {
    duration: 0.01,
    easing: [0, 0, 1, 1] as const,
    stagger: 0,
  },
} as const;

// ============================================
// COLOR TOKENS (OKLCH - perceptual uniformity)
// ============================================

export const color = {
  // Brand palette
  brand: {
    50: 'oklch(0.96 0.04 260)',
    100: 'oklch(0.92 0.08 260)',
    200: 'oklch(0.84 0.12 260)',
    300: 'oklch(0.75 0.16 260)',
    400: 'oklch(0.68 0.19 260)',
    500: 'oklch(0.62 0.22 260)',
    600: 'oklch(0.55 0.24 260)',
    700: 'oklch(0.45 0.22 260)',
    800: 'oklch(0.35 0.18 260)',
    900: 'oklch(0.25 0.14 260)',
    950: 'oklch(0.15 0.08 260)',
  },

  // Accent palette (complementary)
  accent: {
    50: 'oklch(0.97 0.03 140)',
    100: 'oklch(0.93 0.06 140)',
    200: 'oklch(0.86 0.11 140)',
    300: 'oklch(0.78 0.15 140)',
    400: 'oklch(0.70 0.18 140)',
    500: 'oklch(0.63 0.20 140)',
    600: 'oklch(0.54 0.18 140)',
    700: 'oklch(0.44 0.15 140)',
    800: 'oklch(0.34 0.12 140)',
    900: 'oklch(0.26 0.09 140)',
    950: 'oklch(0.16 0.05 140)',
  },

  // Semantic colors - used in components
  semantic: {
    // Foreground
    fg: {
      primary: 'oklch(0.12 0 0)',
      secondary: 'oklch(0.35 0 0)',
      muted: 'oklch(0.5 0 0)',
      subtle: 'oklch(0.65 0 0)',
      inverse: 'oklch(0.98 0 0)',
      link: 'oklch(0.62 0.22 260)',
      linkHover: 'oklch(0.55 0.24 260)',
    },
    // Background
    bg: {
      base: 'oklch(0.99 0 0)',
      elevated: 'oklch(1 0 0)',
      sunken: 'oklch(0.96 0 0)',
      overlay: 'oklch(0.12 0 0 / 0.6)',
      brand: 'oklch(0.62 0.22 260)',
      brandSubtle: 'oklch(0.96 0.04 260)',
      accent: 'oklch(0.63 0.20 140)',
      accentSubtle: 'oklch(0.96 0.03 140)',
    },
    // Border
    border: {
      subtle: 'oklch(0.9 0 0)',
      default: 'oklch(0.85 0 0)',
      emphasis: 'oklch(0.75 0 0)',
      brand: 'oklch(0.62 0.22 260)',
      focus: 'oklch(0.62 0.22 260)',
    },
    // State
    state: {
      success: 'oklch(0.55 0.15 150)',
      successBg: 'oklch(0.95 0.03 150)',
      warning: 'oklch(0.72 0.18 70)',
      warningBg: 'oklch(0.97 0.04 70)',
      error: 'oklch(0.58 0.22 25)',
      errorBg: 'oklch(0.97 0.03 25)',
      info: 'oklch(0.55 0.18 240)',
      infoBg: 'oklch(0.95 0.03 240)',
    },
  },

  // Dark mode overrides
  dark: {
    fg: {
      primary: 'oklch(0.98 0 0)',
      secondary: 'oklch(0.75 0 0)',
      muted: 'oklch(0.6 0 0)',
      subtle: 'oklch(0.45 0 0)',
      inverse: 'oklch(0.12 0 0)',
      link: 'oklch(0.75 0.18 260)',
      linkHover: 'oklch(0.82 0.15 260)',
    },
    bg: {
      base: 'oklch(0.08 0 0)',
      elevated: 'oklch(0.1 0 0)',
      sunken: 'oklch(0.06 0 0)',
      overlay: 'oklch(0.98 0 0 / 0.6)',
      brand: 'oklch(0.58 0.20 260)',
      brandSubtle: 'oklch(0.15 0.06 260)',
      accent: 'oklch(0.58 0.18 140)',
      accentSubtle: 'oklch(0.15 0.05 140)',
    },
    border: {
      subtle: 'oklch(0.18 0 0)',
      default: 'oklch(0.22 0 0)',
      emphasis: 'oklch(0.3 0 0)',
      brand: 'oklch(0.58 0.20 260)',
      focus: 'oklch(0.75 0.18 260)',
    },
  },
} as const;

// ============================================
// SPACING TOKENS
// ============================================

export const spacing = {
  // Base unit: 4px
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  7: '1.75rem',  // 28px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
  32: '8rem',    // 128px

  // Semantic spacing
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
    '5xl': '8rem',
  },

  // Container max widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  },
} as const;

// ============================================
// TYPOGRAPHY TOKENS
// ============================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'var(--font-sans, "Inter Variable", system-ui, sans-serif)',
    mono: 'var(--font-mono, "JetBrains Mono Variable", monospace)',
    display: 'var(--font-display, "Space Grotesk Variable", sans-serif)',
  },

  // Font sizes - modular scale (ratio 1.25)
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
    sm: ['0.875rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
    base: ['1rem', { lineHeight: '1.6', letterSpacing: '0' }],
    lg: ['1.125rem', { lineHeight: '1.6', letterSpacing: '0' }],
    xl: ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
    '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.02em' }],
    '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
    '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
    '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
    '6xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
    '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
    '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
    '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
  },

  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  // Variable font settings
  variableFont: {
    weight: { min: 100, max: 900, default: 400 },
    width: { min: 50, max: 200, default: 100 },
    slant: { min: -10, max: 10, default: 0 },
    opticalSize: { min: 8, max: 144, default: 16 },
  },

  // Text styles - semantic combinations
  styles: {
    display: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(2.5rem, 8vw, 8rem)',
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: '-0.05em',
    },
    headline: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(1.875rem, 5vw, 3.75rem)',
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
    },
    title: {
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(1.25rem, 3vw, 2.25rem)',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    body: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0',
    },
    bodyLarge: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1.125rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0',
    },
    caption: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
    label: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    code: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0',
    },
    mono: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
      letterSpacing: '0',
    },
  },
} as const;

// ============================================
// BREAKPOINT TOKENS
// ============================================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

// ============================================
// Z-INDEX TOKENS
// ============================================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
  cursor: 9999,
} as const;

// ============================================
// BORDER RADIUS TOKENS
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

// ============================================
// SHADOW TOKENS
// ============================================

export const shadow = {
  xs: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1)',
  md: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px oklch(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 oklch(0 0 0 / 0.05)',
  // Brand shadows
  brand: '0 10px 40px -10px oklch(0.62 0.22 260 / 0.4)',
  brandLg: '0 20px 60px -15px oklch(0.62 0.22 260 / 0.5)',
  glow: '0 0 40px oklch(0.62 0.22 260 / 0.3)',
  glowAccent: '0 0 40px oklch(0.63 0.20 140 / 0.3)',
} as const;

// ============================================
// TRANSITION TOKENS
// ============================================

export const transition = {
  // Property-specific transitions
  all: 'all var(--duration-normal) var(--ease-standard)',
  colors: 'color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
  transform: 'transform var(--duration-normal) var(--ease-expressive)',
  opacity: 'opacity var(--duration-fast) var(--ease-standard)',
  shadow: 'box-shadow var(--duration-normal) var(--ease-standard)',
  filter: 'filter var(--duration-normal) var(--ease-standard)',

  // Semantic transitions
  enter: 'opacity var(--duration-fast) var(--ease-entrance), transform var(--duration-normal) var(--ease-entrance)',
  exit: 'opacity var(--duration-fast) var(--ease-exit), transform var(--duration-fast) var(--ease-exit)',
  micro: 'all var(--duration-micro) var(--ease-micro)',
} as const;

// ============================================
// EXPORT ALL TOKENS
// ============================================

export const tokens = {
  motion,
  color,
  spacing,
  typography,
  breakpoints,
  zIndex,
  borderRadius,
  shadow,
  transition,
} as const;

export type Tokens = typeof tokens;
export type MotionTokens = typeof motion;
export type ColorTokens = typeof color;
export type SpacingTokens = typeof spacing;
export type TypographyTokens = typeof typography;