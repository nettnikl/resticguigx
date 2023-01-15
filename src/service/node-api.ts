import { ipcRenderer } from 'electron'
import fs from 'node:fs/promises'
import psaux from 'psaux'

// ipcRenderer.on('main-process-message', (_event, ...args) => {
// 	console.log('[Receive Main-process message]:', ...args)
// })

export async function selectDirectory(multiple?: boolean) {
	let result = await ipcRenderer.invoke('select-dirs', { multiple })
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

export async function checkForProcessRunning(binPath: string) {
	let list = await psaux();
	let restic = list.find(e => e.command.startsWith(binPath))
	if (restic) {
		console.log('process found', restic);
		return true;
	}
	return false;
}
