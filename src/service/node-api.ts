import { ipcRenderer } from 'electron'

ipcRenderer.on('main-process-message', (_event, ...args) => {
	console.log('[Receive Main-process message]:', ...args)
})

export async function selectDirectory() {
	let result = await ipcRenderer.invoke('select-dirs')
	return result;
}

let storageDir = ''
export async function getStorageDir(): Promise<string> {
	if (!storageDir) {
		storageDir = await ipcRenderer.invoke('read-user-data')
	}
	return storageDir
}
