import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  ignores: [
    'node_modules/**',
  ],
}, {
  rules: {
    'no-console': ['error', { allow: ['error', 'info', 'warn'] }],
  },
})
