

export default function setup(app: any) {
	app.config.globalProperties.$filters = {
		dateTime(value: string): string {
			if (!value) return '';
			let d = new Date(value);
			return d.toLocaleDateString()+' '+d.toLocaleTimeString()
		}
	}
}
