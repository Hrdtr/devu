import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  vue: true,
  ignores: ['tauri/gen/**', 'tauri/target/**', 'tauri/resources/**', 'src/components/ui/**'],
}, {
  rules: {
    'no-console': ['error', { allow: ['error', 'info', 'warn'] }],
    'vue/max-attributes-per-line': ['error', { singleline: { max: 3 }, multiline: { max: 1 } }],
  },
})
