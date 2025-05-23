import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { codePlaygrounds } from '@/composables/use-code-playground'
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
      path: '/snippets/:id',
      component: () => import('./pages/snippets/[id].vue'),
    },
    // Playground
    ...codePlaygrounds.map(playground => ({
      path: `/playground/${playground.id}`,
      component: () => import(`./pages/playground/${playground.id}.vue`),
    })),
  ],
})

createApp(App).use(router).mount('#app')
