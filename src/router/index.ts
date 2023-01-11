import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/home.vue'
import ProfileView from '../views/profile.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/profile/:name',
			name: 'profile',
			component: ProfileView
		},
		{
			path: '/:any(.*)',
			name: 'home',
			component: HomeView
		}
	]
})

export default router
