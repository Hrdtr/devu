import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  ignores: [
    'database/migrations/**',
  ],
}, {
  rules: {
    'no-console': ['error', { allow: ['error', 'info', 'warn'] }],
  },
})
