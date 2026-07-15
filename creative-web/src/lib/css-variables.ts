/**
 * CSS Custom Properties Generator
 * Converts design tokens to CSS custom properties
 * Used in global CSS and runtime theming
 */

import { tokens } from './tokens';

// ============================================
// FLATTEN TOKENS TO CSS VARIABLES
// ============================================

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(obj).forEach(([key, value]) => {
    const newKey = prefix ? `${prefix}-${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      // Handle arrays (like cubic-bezier values)
      result[`--${newKey}`] = value.join(' ');
    } else {
      result[`--${newKey}`] = String(value);
    }
  });

  return result;
}

// Generate all CSS variables
const cssVariables = {
  ...flattenObject(tokens.motion, 'motion'),
  ...flattenObject(tokens.color, 'color'),
  ...flattenObject(tokens.spacing, 'spacing'),
  ...flattenObject(tokens.typography, 'typography'),
  ...flattenObject(tokens.breakpoints, 'bp'),
  ...flattenObject(tokens.zIndex, 'z'),
  ...flattenObject(tokens.borderRadius, 'radius'),
  ...flattenObject(tokens.shadow, 'shadow'),
  ...flattenObject(tokens.transition, 'transition'),
};

// ============================================
// GENERATE CSS STRING
// ============================================

export function generateCSSVariables(mode: 'light' | 'dark' = 'light'): string {
  let css = ':root {\n';

  Object.entries(cssVariables).forEach(([key, value]) => {
    css += `  --${key}: ${value};\n`;
  });

  // Add dark mode overrides
  if (mode === 'dark') {
    css += '\n  /* Dark mode overrides */\n';
    const darkVars = flattenObject(tokens.color.dark, 'color');
    Object.entries(darkVars).forEach(([key, value]) => {
      css += `  --${key}: ${value};\n`;
    });
  }

  css += '}\n';

  // Add media query for dark mode
  css += `
@media (prefers-color-scheme: dark) {
  :root {
`;
  const darkVars = flattenObject(tokens.color.dark, 'color');
  Object.entries(darkVars).forEach(([key, value]) => {
    css += `    --${key}: ${value};\n`;
  });
  css += `  }\n}\n`;

  // Reduced motion
  css += `
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-normal: ${tokens.motion.reduced.duration}ms;
    --motion-duration-fast: ${tokens.motion.reduced.duration}ms;
    --motion-duration-slow: ${tokens.motion.reduced.duration}ms;
    --motion-duration-cinematic: ${tokens.motion.reduced.duration}ms;
    --motion-duration-epic: ${tokens.motion.reduced.duration}ms;
    --motion-easing-standard: ${tokens.motion.reduced.easing.join(' ')};
    --motion-easing-expressive: ${tokens.motion.reduced.easing.join(' ')};
    --motion-easing-entrance: ${tokens.motion.reduced.easing.join(' ')};
    --motion-easing-exit: ${tokens.motion.reduced.easing.join(' ')};
    --motion-stagger-normal: ${tokens.motion.reduced.stagger};
  }
}
`;

  return css;
}

// ============================================
// EXPORT FOR RUNTIME USE
// ============================================

export const cssVars = cssVariables;

export function injectCSSVariables(mode: 'light' | 'dark' = 'light') {
  if (typeof window === 'undefined') return;

  const styleId = 'design-tokens';
  let style = document.getElementById(styleId) as HTMLStyleElement;

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = generateCSSVariables(mode);
}

export function setColorScheme(mode: 'light' | 'dark' | 'system') {
  if (typeof window === 'undefined') return;

  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
  }

  injectCSSVariables(mode === 'dark' ? 'dark' : 'light');
}

// ============================================
// TAILWIND CONFIG HELPER
// ============================================

export const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        brand: Object.fromEntries(
          Object.entries(tokens.color.brand).map(([k, v]) => [k, `var(--color-brand-${k})`])
        ),
        accent: Object.fromEntries(
          Object.entries(tokens.color.accent).map(([k, v]) => [k, `var(--color-accent-${k})`])
        ),
        fg: Object.fromEntries(
          Object.entries(tokens.color.semantic.fg).map(([k, v]) => [k, `var(--color-semantic-fg-${k})`])
        ),
        bg: Object.fromEntries(
          Object.entries(tokens.color.semantic.bg).map(([k, v]) => [k, `var(--color-semantic-bg-${k})`])
        ),
        border: Object.fromEntries(
          Object.entries(tokens.color.semantic.border).map(([k, v]) => [k, `var(--color-semantic-border-${k})`])
        ),
      },
      fontFamily: {
        sans: ['var(--typography-fontFamily-sans)'],
        mono: ['var(--typography-fontFamily-mono)'],
        display: ['var(--typography-fontFamily-display)'],
      },
      fontSize: Object.fromEntries(
        Object.entries(tokens.typography.fontSize).map(([k, v]) => [
          k,
          Array.isArray(v) ? v[0] : v,
        ])
      ),
      spacing: Object.fromEntries(
        Object.entries(tokens.spacing.space).map(([k, v]) => [k, v])
      ),
      borderRadius: Object.fromEntries(
        Object.entries(tokens.borderRadius).map(([k, v]) => [k, v])
      ),
      boxShadow: Object.fromEntries(
        Object.entries(tokens.shadow).map(([k, v]) => [k, v])
      ),
      transitionDuration: Object.fromEntries(
        Object.entries(tokens.motion.duration).map(([k, v]) => [k, `${v}ms`])
      ),
      transitionTimingFunction: {
        standard: `cubic-bezier(${tokens.motion.easing.standard.join(', ')})`,
        expressive: `cubic-bezier(${tokens.motion.easing.expressive.join(', ')})`,
        entrance: `cubic-bezier(${tokens.motion.easing.entrance.join(', ')})`,
        exit: `cubic-bezier(${tokens.motion.easing.exit.join(', ')})`,
        micro: `cubic-bezier(${tokens.motion.easing.micro.join(', ')})`,
        magnetic: `cubic-bezier(${tokens.motion.easing.magnetic.join(', ')})`,
      },
      zIndex: Object.fromEntries(
        Object.entries(tokens.zIndex).map(([k, v]) => [k, String(v)])
      ),
    },
  },
} as const;

export default {
  generateCSSVariables,
  injectCSSVariables,
  setColorScheme,
  cssVars,
  tailwindConfig,
};