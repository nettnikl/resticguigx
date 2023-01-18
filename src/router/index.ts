import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/home.vue'
import ProfileView from '../views/profile.vue'
import AboutView from '../views/about.vue'

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/profile/:name',
			name: 'profile',
			component: ProfileView
		},
		{
			path: '/about',
			name: 'about',
			component: AboutView
		},
		{
			path: '/:any(.*)',
			name: 'home',
			component: HomeView
		}
	]
})

export default router
