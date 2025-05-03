import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
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
  ],
})

createApp(App).use(router).mount('#app')
