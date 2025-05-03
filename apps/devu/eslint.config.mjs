import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  vue: true,
  ignores: ['tauri/gen/**', 'tauri/target/**', 'src/components/ui/**'],
}, {
  rules: {
    'no-console': ['error', { allow: ['error', 'info', 'warn'] }],
  },
})
