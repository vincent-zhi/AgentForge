import type { Config } from 'tailwindcss';
import { colors, spacing, radii, shadows, fonts, fontSizes, fontWeights, lineHeights, transitions, zIndices } from './src/theme/tokens';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'forge-black': colors.forgeBlack,
        graphite: colors.graphite,
        'forged-steel': colors.forgedSteel,
        'bright-steel': colors.brightSteel,
        'ember-orange': colors.emberOrange,
        'deep-ember': colors.deepEmber,
        'text-gray': colors.textGray,
        'safe-green': colors.safeGreen,
        'warning-amber': colors.warningAmber,
        'risk-red': colors.riskRed,
        semantic: {
          verified: colors.safeGreen,
          partial: colors.warningAmber,
          blocked: colors.riskRed,
          analyzing: '#3B82F6',
          brain: '#8B5CF6',
          unverified: colors.forgedSteel,
        },
      },
      spacing: spacing,
      borderRadius: radii,
      boxShadow: shadows,
      fontFamily: {
        sans: fonts.sans.split(', '),
        mono: fonts.mono.split(', '),
      },
      fontSize: fontSizes,
      fontWeight: Object.fromEntries(Object.entries(fontWeights).map(([k, v]) => [k, String(v)])) as Record<string, string>,
      lineHeight: Object.fromEntries(Object.entries(lineHeights).map(([k, v]) => [k, String(v)])) as Record<string, string>,
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      zIndex: Object.fromEntries(Object.entries(zIndices).map(([k, v]) => [k, String(v)])) as Record<string, string>,
    },
  },
  plugins: [],
};

export default config;
