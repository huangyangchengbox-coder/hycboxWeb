import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '../api/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    children: [
      { path: '', redirect: '/cockpit' },
      {
        path: 'cockpit',
        name: 'cockpit',
        component: () => import('../views/CockpitView.vue')
      },
      {
        path: 'nation-cockpit',
        name: 'nation-cockpit',
        component: () => import('../views/NationCockpitView.vue')
      },
      {
        path: 'ai-image',
        name: 'ai-image',
        component: () => import('../views/AiImageView.vue')
      },
      {
        path: 'ai-video',
        name: 'ai-video',
        component: () => import('../views/AiVideoView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory('/web/'),
  routes
})

router.beforeEach((to) => {
  if (to.meta.public) {
    if (getToken() && to.path === '/login') {
      return '/cockpit'
    }
    return true
  }
  if (!getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
