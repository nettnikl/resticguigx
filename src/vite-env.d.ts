/// <reference types="vite/client" />

declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<{}, {}, any>
	export default component
}

export {}

declare module 'vue' {
	interface ComponentCustomProperties {
		$filters: {
			dateTime(value?: string): string
		}
	}
}

