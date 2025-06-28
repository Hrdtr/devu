import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useSettingsGeneral } from '@/composables/use-settings-general'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('./pages/index.vue'),
    },
    {
      path: '/chats/:id',
      component: () => import('./pages/chats/[id].vue'),
    },
    {
      path: '/utilities/:id',
      component: () => import('./pages/utilities/[id].vue'),
    },
    {
      path: '/code-snippets/:id',
      component: () => import('./pages/code-snippets/[id].vue'),
    },
    {
      path: '/code-playgrounds/:id',
      component: () => import('./pages/code-playgrounds/[id].vue'),
    },
  ],
})

let isFirstNavigation = true
router.beforeEach((to, _from, next) => {
  if (isFirstNavigation) {
    isFirstNavigation = false
    const { defaultView } = useSettingsGeneral()
    if (defaultView.value !== to.path) {
      return next(defaultView.value)
    }
  }

  return next()
})

createApp(App).use(router).mount('#app')
