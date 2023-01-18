import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './service/user-storage'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import setup from './service/global-props'
import { openLink } from './service/node-api'

import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import "./assets/style.css"

const app = createApp(App)
	
app.use(router)
app.use(ElementPlus)
setup(app)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(key, component)
}

app.mount('#app')
	.$nextTick(() => {
		postMessage({ payload: 'removeLoading' }, '*')
	})

console.log('app loaded', app);


document.addEventListener('click', (event) => {
	let target: HTMLElement = event.target! as any;
	let href = target.getAttribute('href');
	// console.log('click', href);
	if (href && href.startsWith('http')) {
		event.preventDefault();
		openLink(href);
	}
})
