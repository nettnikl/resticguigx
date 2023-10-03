import {ipcRenderer} from 'electron'
import fs from 'node:fs/promises'
import psaux from 'psaux'
import router from '../router/index'

ipcRenderer.on('navigate', (_event, path) => {
	router.push({
		path: path
	})
})

export async function selectDirectory(multiple?: boolean) {
	let result = await ipcRenderer.invoke('select-dirs', { multiple })
	return result;
}

export async function selectFile() {
	return await ipcRenderer.invoke('open-file');
}

let storageDir = ''
export async function getStorageDir(): Promise<string> {
	if (!storageDir) {
		storageDir = await ipcRenderer.invoke('read-user-data')
	}
	return storageDir
}

export async function openFolder(path: string) {
	await ipcRenderer.send('open-folder', path)
}

export async function openLink(url: string) {
	await ipcRenderer.send('open-url', url)
}

export async function setWorking(working: boolean) {
	await ipcRenderer.send('set-working', working)
}

export async function pathIsDirectory(path: string): Promise<boolean> {
	try {
		let stat = await fs.stat(path);
		return stat.isDirectory();
	} catch (e) {
		return false;
	}
}

export async function checkForProcessRunning(binPath: string) {
	let list = await psaux();
	let restic = list.find(e => e.command && e.command.startsWith(binPath))
	if (restic) {
		console.log('process found', restic);
		return true;
	}
	return false;
}
