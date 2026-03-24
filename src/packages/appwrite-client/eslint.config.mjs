import baseConfig from '@zixdev/eslint-config/base.js';

export default [
  ...baseConfig,
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/build',
    ],
  },
];

