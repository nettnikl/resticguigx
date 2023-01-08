import type { StatsResult } from '../types'

export type BackupInfo = {
	path: string
}

export type RepoInfo = {
	lastBackupStart: string,
	lastBackupFinished: string
}

export default class UserProfile {

	profileName: string
	repoPath: string = ''
	repoStats: Partial<StatsResult> = {}
	repoInfo: Partial<RepoInfo> = {}
	backupDirs: BackupInfo[] = []
	passwordStrategy = 'file'
	storedSecred: string = ''

	constructor(profileName: string) {
		this.profileName = profileName
	}

	setStoredSecret(pw: string) {
		this.storedSecred = pw;
	}

	toStorage() {
		return Object.fromEntries(Object.entries(this).filter(([k, v]) => k[0] !== '_'))
	}

	fromStorage(data: any) {
		let keys: any = Object.keys(this);
		keys.forEach((key: keyof this) => {
			if (key in data) {
				this[key] = data[key]
			}
		})
	}

}
