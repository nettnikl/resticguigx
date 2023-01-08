import type { StatsResult } from '../types'

type BackupInfo = {
	path: string
}

type RepoInfo = {
	lastBackupStart: string,
	lastBackupFinished: string
}

enum PasswordStrategy {
	"ask",
	"file"
}

export default class UserProfile {

	profileName: string
	repoPath: string = ''
	repoStats: Partial<StatsResult> = {}
	repoInfo: Partial<RepoInfo> = {}
	backupDirs: BackupInfo[] = []
	passwordStrategy: PasswordStrategy = PasswordStrategy.file


	constructor(profileName: string) {
		this.profileName = profileName
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
