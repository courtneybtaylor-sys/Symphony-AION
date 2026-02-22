/**
 * Design Tokens for Symphony AION
 * Extracted from Tailwind configuration and extended with custom tokens
 * Used throughout components for consistent styling
 */

// AION Color Palette
export const colors = {
  // Primary dark theme
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',

  // Primary brand (purple-ish dark)
  primary: 'hsl(var(--primary))',
  primaryForeground: 'hsl(var(--primary-foreground))',

  // Secondary accent
  secondary: 'hsl(var(--secondary))',
  secondaryForeground: 'hsl(var(--secondary-foreground))',

  // Accent (amber/gold)
  accent: 'hsl(var(--accent))',
  accentForeground: 'hsl(var(--accent-foreground))',

  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Extended palette for visualizations
  cyan: '#06b6d4',
  purple: '#a855f7',
  amber: '#fbbf24',
  rose: '#f43f5e',

  // Neutral scale for borders and dividers
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  destructive: 'hsl(var(--destructive))',
  destructiveForeground: 'hsl(var(--destructive-foreground))',
}

// Typography
export const typography = {
  fontFamily: {
    mono: '"JetBrains Mono", monospace',
    sans: 'system-ui, sans-serif',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '6xl': '3.75rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
}

// Spacing
export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
}

// Border Radius
export const borderRadius = {
  none: '0',
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  full: '9999px',
}

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
}

// Z-Index scale
export const zIndex = {
  auto: 'auto',
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  offcanvas: 1050,
  modal: 1060,
  popover: 1070,
  tooltip: 1080,
}

// Animation/Transition
export const animation = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
}

// Component specific tokens
export const components = {
  // Card
  card: {
    bg: 'bg-secondary/10',
    border: 'border-accent/20',
    className: 'rounded-lg p-6 bg-secondary/10 border border-accent/20',
  },

  // Button
  button: {
    primary: 'px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors font-mono font-bold',
    secondary: 'px-4 py-2 border border-accent/40 text-accent rounded-md hover:border-accent/60 transition-colors font-mono',
    ghost: 'px-4 py-2 text-foreground hover:bg-muted/20 transition-colors rounded-md',
  },

  // Badge
  badge: {
    success: 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/40',
    warning: 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40',
    error: 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/40',
    info: 'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40',
  },

  // Input
  input: 'w-full px-3 py-2 bg-muted/20 border border-accent/20 rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50',

  // Tabs
  tabs: {
    tab: 'px-3 py-2 font-mono text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors',
    tabActive: 'px-3 py-2 font-mono text-sm font-medium border-b-2 border-accent text-foreground',
  },
}

// Metrics card styling
export const metricCard = {
  base: 'rounded-lg p-6 bg-secondary/10 border border-accent/20',
  title: 'text-accent font-mono font-bold text-sm mb-2',
  value: 'text-2xl font-bold text-foreground',
  subtitle: 'text-muted-foreground text-sm mt-2',
}

// Grid system constants
export const grid = {
  columns: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    6: 6,
  },
  gap: spacing,
}

// Responsive breakpoints
export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

/**
 * Helper to create gradient backgrounds
 */
export const gradients = {
  primaryToBg: 'from-primary to-primary/80',
  accentToCyan: 'from-amber-400 via-yellow-300 to-amber-300',
  purpleToBlue: 'from-purple-600 via-blue-500 to-cyan-400',
}
