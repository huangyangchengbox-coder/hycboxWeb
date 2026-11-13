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
      { path: '', redirect: '/games' },
      {
        path: 'games',
        name: 'games',
        component: () => import('../views/GamesView.vue'),
        meta: { public: true, immersive: true }
      },
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
        path: 'tennis',
        name: 'tennis',
        component: () => import('../views/TennisView.vue'),
        meta: { public: true, immersive: true }
      },
      {
        path: 'saltline',
        name: 'saltline',
        component: () => import('../views/SaltlineView.vue'),
        meta: { public: true, immersive: true }
      },
      {
        path: 'terrain',
        name: 'terrain',
        component: () => import('../views/ExhibitView.vue'),
        props: { file: 'terrain/index.html', title: '地形岛' },
        meta: { public: true, immersive: true }
      },
      {
        path: 'spectra',
        name: 'spectra',
        component: () => import('../views/ExhibitView.vue'),
        props: { file: 'spectra/index.html', title: '光谱' },
        meta: { public: true, immersive: true }
      },
      {
        path: 'formula',
        name: 'formula',
        component: () => import('../views/ExhibitView.vue'),
        props: { file: 'formula/index.html?lang=zh', title: '公式像素' },
        meta: { public: true, immersive: true }
      },
      {
        path: 'kerr',
        name: 'kerr',
        component: () => import('../views/ExhibitView.vue'),
        props: { file: 'kerr/index.html', title: '旋转黑洞' },
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
      },
      {
        path: 'publish',
        name: 'publish',
        component: () => import('../views/PublishView.vue')
      }
    ]
  }
]

const router = createRouter({
  // 与 vite base 一致：正式站 /web/
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
