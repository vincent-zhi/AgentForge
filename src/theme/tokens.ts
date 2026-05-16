export const colors = {
  forgeBlack: '#0B0D10',
  graphite: '#1A1D22',
  forgedSteel: '#6F7782',
  brightSteel: '#F2F4F6',
  emberOrange: '#FF7A1A',
  deepEmber: '#B9470D',
  textGray: '#A7AFBA',
  safeGreen: '#22C55E',
  warningAmber: '#F59E0B',
  riskRed: '#EF4444',
} as const;

export const semanticColors = {
  verified: colors.safeGreen,
  partial: colors.warningAmber,
  blocked: colors.riskRed,
  analyzing: '#3B82F6',
  brain: '#8B5CF6',
  unverified: colors.forgedSteel,
} as const;

export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radii = {
  none: '0px',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0,0,0,0.3)',
  md: '0 4px 6px -1px rgba(0,0,0,0.4)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.5)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.6)',
  glow: `0 0 12px ${colors.emberOrange}40`,
  emberGlow: `0 0 20px ${colors.emberOrange}60`,
} as const;

export const fonts = {
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
} as const;

export const fontSizes = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeights = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

export const zIndices = {
  base: 0,
  panel: 10,
  overlay: 20,
  modal: 30,
  popover: 40,
  toast: 50,
} as const;
