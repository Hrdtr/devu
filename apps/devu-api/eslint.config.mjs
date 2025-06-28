import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  ignores: [
    'node_modules/**',
    'database/migrations/**',
  ],
}, {
  rules: {
    'no-console': ['error', { allow: ['error', 'info', 'trace', 'warn'] }],
  },
})
