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
      { path: '', redirect: '/cosmos' },
      {
        path: 'cosmos',
        name: 'cosmos',
        component: () => import('../views/CosmosView.vue'),
        meta: { public: true, immersive: true }
      },
      {
        path: 'wildlife',
        name: 'wildlife',
        component: () => import('../views/WildlifeView.vue'),
        meta: { public: true, immersive: true }
      },
      {
        path: 'micro',
        name: 'micro',
        component: () => import('../views/MicroView.vue'),
        meta: { public: true, immersive: true }
      },
      {
        path: 'home',
        name: 'home',
        component: () => import('../views/HomeGlobeView.vue'),
        meta: { public: true, immersive: true }
      },
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
      },
      {
        path: 'ai-cloudflare',
        name: 'ai-cloudflare',
        component: () => import('../views/AiCloudflareView.vue')
      },
      {
        path: 'ai-nvidia-nim',
        name: 'ai-nvidia-nim',
        component: () => import('../views/AiNvidiaNimView.vue')
      },
      {
        path: 'hub-entries',
        name: 'hub-entries',
        component: () => import('../views/HubEntriesView.vue')
      }
    ]
  }
]

const router = createRouter({
  // 与 vite base 一致：正式 /web/，体验 /web-trial/
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  if (to.meta.public) {
    if (getToken() && to.path === '/login') {
      return '/home'
    }
    return true
  }
  if (!getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
