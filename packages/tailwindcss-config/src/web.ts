import type { Config } from 'tailwindcss';

import { baseConfig } from './base.js';

export default {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
} satisfies Config;
