import type { StatsResult } from '../types'
import { pathIsDirectory } from '../node-api'
import type { Snapshot } from '../types'
import os from 'node:os'

export type BackupInfo = {
	path: string,
	lastBackupStart?: string,
	lastBackupFinished?: string,
	lastCleanup?: string
}

export type RepoInfo = {
	lastStatsUpdate: string,
	lastFullBackup: string
}

export type PruneSettings = {
	keepLast: number,
	keepHourly: number,
	keepDaily: number,
	keepWeekly: number,
	keepMonthly: number
}

export type ExcludeSettings = {
	excludeMethod: string,
	excludeFile: string,
	paths: string[],
	largerThanSize: number,
	largerThanType: string
}

export type BackupSettings = {
	ignoreInode: boolean,
	ignoreCtime: boolean,
	groupBy: string
}

export default class UserProfile {

	static PW_STRAT_PROFILE = 'profile'
	static PW_STRAT_ASK = 'ask'

	profileName: string
	repoPath: string = ''
	repoEnv: Record<string, string> = {}
	repoStats: Partial<StatsResult> = {}
	repoInfo: Partial<RepoInfo> = {}
	backupDirs: BackupInfo[] = []
	pruneSettings: Partial<PruneSettings> = {}
	excludeSettings: Partial<ExcludeSettings> = {}
	backupSettings: Partial<BackupSettings> = {}
	passwordStrategy = UserProfile.PW_STRAT_PROFILE
	storedSecret: string = ''
	_tempSecret: string = ''

	constructor(profileName: string) {
		this.profileName = profileName
	}

	setSecret(pw: string) {
		if (this.passwordStrategy === UserProfile.PW_STRAT_PROFILE) {
			this.storedSecret = pw;
		} else {
			this._tempSecret = pw;
		}
	}

	getSecret(): string {
		if (this._tempSecret) return this._tempSecret;
		if (this.storedSecret) return this.storedSecret;
		throw new Error('no password found')
	}

	hasSecret(): boolean {
		if (this._tempSecret || this.storedSecret) return true;
		return false;
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

	async setPathsFromSnapshots(snapshots: Snapshot[]) {
		let myhost = os.hostname()
		let snaps = snapshots.filter(e => e.hostname === myhost);
		let paths = new Set<string>(snaps.flatMap(e => e.paths));
		for (let p of paths) {
			let isDir = await pathIsDirectory(p);
			if (!isDir) continue;
			let lastStamp = snapshots.reduce((c, v) => {
				if (v.paths.includes(p) && v.time > c) return v.time;
				else return c;
			}, '')
			let exists = this.backupDirs.find(e => e.path === p);
			if (exists) {
				exists.lastBackupFinished = lastStamp
			} else {
				this.backupDirs.push({ path: p, lastBackupFinished: lastStamp })
			}
		}
	}

	getRepoEnv(): Record<string, string> {
		return this.repoEnv || {};
	}

	getRepoPath(): string {
		return this.repoPath;
	}

	isLocalRepo(): boolean {
		return this.repoPath.startsWith('/');
	}

}
