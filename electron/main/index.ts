import {app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, shell} from 'electron'
import {release} from 'node:os'
import {join} from 'node:path'

process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
	? join(process.env.DIST_ELECTRON, '../public')
	: process.env.DIST
const dev = !!process.env.VITE_DEV_SERVER_URL;

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
	app.quit()
	process.exit(0)
}

let resticWorking = false;

let win: BrowserWindow | null = null
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
	win = new BrowserWindow({
		title: 'Main window',
		icon: join(process.env.PUBLIC, 'favicon.ico'),
		webPreferences: {
			preload,
			nodeIntegration: true,
			contextIsolation: false,
		},
		width: 960,
		height: 800
	})

	const menu = new Menu();
	menu.append(new MenuItem({
		id: 'main-menu',
		label: 'Restic',
		enabled: true,
		submenu: [
			{
				label: 'Profile List',
				click() {
					win.webContents.send('navigate', '/home')
				}
			},
			{
				label: 'About',
				click() {
					win.webContents.send('navigate', '/about')
				}
			},
			{
				label: 'Quit',
				click() {
					app.exit(0);
				}
			}
		]
	}))
	if (dev) {
		menu.append(new MenuItem({
			label: 'Reload',
			click() {
				win.reload()
			}
		}))
	}
	Menu.setApplicationMenu(menu);

	if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
		win.loadURL(url)
		// Open devTool if the app is not packaged
		win.webContents.openDevTools()
	} else {
		win.loadFile(indexHtml)
	}

	// Test actively push message to the Electron-Renderer
	// win.webContents.on('did-finish-load', () => {
	// 	win?.webContents.send('main-process-message', new Date().toLocaleString())
	// })

	// Make all links open with the browser, not with the application
	win.webContents.setWindowOpenHandler(({ url }) => {
		if (url.startsWith('https:')) shell.openExternal(url)
		return { action: 'deny' }
	})

	win.on('close', (event) => {
		if(resticWorking){
			event.preventDefault();
			win.minimize();
		}
	
		return false;
	})
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
	win = null
	if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
	if (win) {
		// Focus on the main window if the user tried to open another
		if (win.isMinimized()) win.restore()
		win.focus()
	}
})

app.on('activate', () => {
	const allWindows = BrowserWindow.getAllWindows()
	if (allWindows.length) {
		allWindows[0].focus()
	} else {
		createWindow()
	}
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
	const childWindow = new BrowserWindow({
		webPreferences: {
			preload,
			nodeIntegration: true,
			contextIsolation: false,
		},
	})

	if (process.env.VITE_DEV_SERVER_URL) {
		childWindow.loadURL(`${url}#${arg}`)
	} else {
		childWindow.loadFile(indexHtml, { hash: arg })
	}
})

ipcMain.handle('select-dirs', async (event, arg) => {
	const properties: ("openDirectory" | "openFile" | "multiSelections" | "showHiddenFiles" | "createDirectory" | "promptToCreate" | "noResolveAliases" | "treatPackageAsDirectory" | "dontAddToRecent")[] 
		= ['openDirectory', 'createDirectory'];
	if (arg && arg.multiple) {
		properties.push('multiSelections')
	}
	const result = await dialog.showOpenDialog(win, {
		properties
	})
	// console.log('directories selected', result.filePaths)
	return result;
})

ipcMain.handle('open-file', async (event, arg) => {
	const properties: ("openDirectory" | "openFile" | "multiSelections" | "showHiddenFiles" | "createDirectory" | "promptToCreate" | "noResolveAliases" | "treatPackageAsDirectory" | "dontAddToRecent")[]
		= ['openFile'];
	return await dialog.showOpenDialog(win, {
		properties
	});
})

ipcMain.handle('read-user-data', async (event, fileName) => {
	return join(app.getPath('userData'), 'profiles');
})

ipcMain.on('open-folder', async(event, fullPath: string) => {
	await shell.showItemInFolder(fullPath)
})
ipcMain.on('open-url', async(event, url: string) => {
	await shell.openExternal(url)
})

ipcMain.on('set-working', (event, workingState) => {
	resticWorking = workingState;
	//disabling the dropdown does not work
	Menu.getApplicationMenu().getMenuItemById('main-menu').submenu.items.forEach(item => {
		item.enabled = !resticWorking;
	});
})
