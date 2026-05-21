import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/views/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/demo/01',
        },
        // 第一阶段 - 基础
        { path: 'demo/01', name: 'Demo01', component: () => import('@/views/demos/Demo01.vue'), meta: { title: '几何体展示' } },
        { path: 'demo/02', name: 'Demo02', component: () => import('@/views/demos/Demo02.vue'), meta: { title: '材质与纹理' } },
        { path: 'demo/03', name: 'Demo03', component: () => import('@/views/demos/Demo03.vue'), meta: { title: '灯光系统' } },
        { path: 'demo/04', name: 'Demo04', component: () => import('@/views/demos/Demo04.vue'), meta: { title: '相机控制' } },
        { path: 'demo/05', name: 'Demo05', component: () => import('@/views/demos/Demo05.vue'), meta: { title: '动画基础' } },
        // 第二阶段 - 进阶
        { path: 'demo/06', name: 'Demo06', component: () => import('@/views/demos/Demo06.vue'), meta: { title: '模型加载' } },
        { path: 'demo/07', name: 'Demo07', component: () => import('@/views/demos/Demo07.vue'), meta: { title: '铁路轨道生成' } },
        { path: 'demo/08', name: 'Demo08', component: () => import('@/views/demos/Demo08.vue'), meta: { title: '火车沿轨道运动' } },
        { path: 'demo/09', name: 'Demo09', component: () => import('@/views/demos/Demo09.vue'), meta: { title: '场景环境' } },
        { path: 'demo/10', name: 'Demo10', component: () => import('@/views/demos/Demo10.vue'), meta: { title: '粒子系统' } },
        // 第三阶段 - 交互
        { path: 'demo/11', name: 'Demo11', component: () => import('@/views/demos/Demo11.vue'), meta: { title: '射线拾取' } },
        { path: 'demo/12', name: 'Demo12', component: () => import('@/views/demos/Demo12.vue'), meta: { title: '模型高亮描边' } },
        { path: 'demo/13', name: 'Demo13', component: () => import('@/views/demos/Demo13.vue'), meta: { title: '信息卡片弹窗' } },
        { path: 'demo/14', name: 'Demo14', component: () => import('@/views/demos/Demo14.vue'), meta: { title: '动态标签' } },
        { path: 'demo/15', name: 'Demo15', component: () => import('@/views/demos/Demo15.vue'), meta: { title: '调试面板' } },
        // 第四阶段 - 综合
        { path: 'demo/16', name: 'Demo16', component: () => import('@/views/demos/Demo16.vue'), meta: { title: '火车站场景' } },
        { path: 'demo/17', name: 'Demo17', component: () => import('@/views/demos/Demo17.vue'), meta: { title: '服务器机柜交互' } },
        { path: 'demo/18', name: 'Demo18', component: () => import('@/views/demos/Demo18.vue'), meta: { title: '路网巡游' } },
        { path: 'demo/19', name: 'Demo19', component: () => import('@/views/demos/Demo19.vue'), meta: { title: '数据可视化叠加' } },
        { path: 'demo/20', name: 'Demo20', component: () => import('@/views/demos/Demo20.vue'), meta: { title: '综合教培场景' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return '/login'
  }
  if (to.path === '/login' && userStore.isLoggedIn) {
    return '/'
  }
})

export default router
