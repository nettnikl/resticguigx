import { ipcRenderer } from 'electron'
import fs from 'node:fs/promises'

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

export async function openFolder(path: string) {
	console.log('open-folder', path);
	await ipcRenderer.send('open-folder', path)
}

export async function pathIsDirectory(path: string): Promise<boolean> {
	try {
		let stat = await fs.stat(path);
		return stat.isDirectory();
	} catch (e) {
		return false;
	}
}
