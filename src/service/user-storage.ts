import os from 'node:os';
import Path from 'node:path'
import FS from 'node:fs/promises';
import UserProfile from './model/profile'

const userinfo = os.userInfo({ encoding: 'utf-8' })
const MainDirName = process.env.NODE_ENV === 'development' ? 'ResticGuiDev' : 'ResticGuiGX'
// source: https://stackoverflow.com/questions/19275776/node-js-how-to-get-the-os-platforms-user-data-folder
const storageBaseDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
const storageDir = Path.join(storageBaseDir, MainDirName)
// console.log(userinfo, process.env);
const ProfileFile = 'profile.json';

function getProfilePath(profileName: string): string {
	return Path.join(storageDir, profileName)
}

async function initStorage(profileName?: string) {
	let profileDir = profileName ? getProfilePath(profileName) : storageDir
	await FS.mkdir(profileDir, { recursive: true, mode: 0o700 })
}

export async function listProfiles(): Promise<string[]> {
	await initStorage();
	let list = await FS.readdir(storageDir, { withFileTypes: true })
	return list.filter(e => e.isDirectory()).map(e => e.name)
}

const validProfileName = /[0-9a-z-._]{3,32}/

export async function createProfile(profileName: string) {
	if (!validProfileName.test(profileName)) throw new Error('invalid profileName')
	let existing = await listProfiles();
	if (existing.includes(profileName)) throw new Error('profile already exists: '+profileName)
	await initStorage(profileName);
	let model = new UserProfile(profileName)
	await saveProfile(model)
	return model;
}

export async function saveProfile(model: UserProfile) {
	let str = JSON.stringify(model.toStorage());
	let path = Path.join(getProfilePath(model.profileName), ProfileFile)
	await FS.writeFile(path, str, { encoding: 'utf8' })
}

export async function loadProfile(profileName: string): Promise<UserProfile> {
	let path = Path.join(getProfilePath(profileName), ProfileFile)
	let str = await FS.readFile(path, { encoding: 'utf8' })
	let model = new UserProfile(profileName);
	model.fromStorage(JSON.parse(str))
	return model;
}

export async function deleteProfile(profileName: string) {
	if (!validProfileName.test(profileName)) throw new Error('invalid profileName')
	let existing = await listProfiles();
	if (!existing.includes(profileName)) throw new Error('profile does not exist: '+profileName)
	let path = getProfilePath(profileName);
	await FS.rm(path, { recursive: true, force: true })
}
