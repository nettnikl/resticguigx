import BaseBackend from './base-backend'
import du from 'du';
import type { StatsResult, Snapshot, ForgetResultOne } from '../types'
import Path from 'node:path'
import UserProfile, { BackupInfo, PruneSettings } from './profile';
import Process from './process';
import BatchProcess from './batch-process'
import fs from 'node:fs/promises'
import { openFolder, checkForProcessRunning } from '../node-api'

export default class RusticBackend extends BaseBackend {

	public getBinFile() {
		return 'rustic';
	}

	public async getSnapshots(repoDir: string, repoParams: string[], repoEnv: Record<string, string>, repoAuthEnv: Record<string, string>): Promise<Snapshot[]> {
		let res = await this.exec([
			'snapshots',
			`-r=${repoDir}`,
			'--json',
			...repoParams
		], {
			...this.getProcessEnv(),
			...repoEnv,
			...repoAuthEnv
		});
		console.log('snapshots output', res);
		return res.stdout ? JSON.parse(res.stdout) : []
	}

	public async initRepo(repoDir: string, repoParams: string[], repoEnv: Record<string, string>, repoAuthEnv: Record<string, string>) {
		let res = await this.exec([
			'init',
			'--json',
			`-r=${repoDir}`,
			...repoParams
		], {
			...this.getProcessEnv(),
			...repoEnv,
			...repoAuthEnv
		})
		return res.stdout;
	}

	public async stats(profile: UserProfile): Promise<StatsResult> {
		let res = await this.exec([
			'repoinfo',
			'--json',
			`-r=${profile.getRepoPath()}`,
			...profile.repoParams
		], {
			...this.getProcessEnv(),
			...profile.getRepoEnv(),
			...profile.getRepoAuthEnv(),
		})
		console.log('stats output', res);
		let stats = JSON.parse(res.stdout)
		if (profile.isLocalRepo()) {
			stats.total_size = await du(profile.getRepoPath());
		}
		return stats;
	}

	public async backup(profile: UserProfile, paths: BackupInfo[]): Promise<BatchProcess> {
		if (this.runningProcess) throw new Error('a restic process is already running')
		if (paths.length === 0) throw new Error('no paths specified')
		await checkForProcessRunning(this.getFullBinPath());
		let processes: Process[] = [];
		let exclude: string[] = [`--iglob=!${profile.repoPath}`];
		if (profile.excludeSettings) {
			if (profile.excludeSettings.largerThanSize && profile.excludeSettings.largerThanSize > 0) {
				exclude.push(`--exclude-larger-than=${profile.excludeSettings.largerThanSize}${profile.excludeSettings.largerThanType}`)
			}
			if (profile.excludeSettings.paths) {
				profile.excludeSettings.paths.forEach(path => {
					exclude.push(`--iglob=!${path}`)
				})
			}
		}
		for (let info of paths) {
			let params = [
				'backup',
				'--json',
				...exclude,
				'--exclude-caches',
				`--tag=${info.path}`,
				`-r=${profile.repoPath}`,
				`${info.path}`,
				...profile.repoParams
			];
			let process = new Process(this.getFullBinPath(), params, {
				...this.getProcessEnv(),
				...profile.getRepoEnv(),
				...profile.getRepoAuthEnv(),
			}, info)
			processes.push(process);
		}
		let batch = new BatchProcess(processes);
		batch.start();
		this.runningProcess = batch;
		batch.waitForFinish()
		.catch(() => {})
		.then(() => {
			this.runningProcess = null;
		})
		return batch;
	}

	public async unlock(repoDir: string, repoAuthEnv: Record<string, string>): Promise<void> {
		await this.exec([
			'unlock',
			`-r=${repoDir}`
		], repoAuthEnv)
	}

	public async forget(profile: UserProfile, settings: Partial<PruneSettings>, dryRun: boolean, pathInfo?: BackupInfo[] | undefined, snapshotId?: string | undefined): Promise<ForgetResultOne[]> {
		let params = [
			'forget',
			'--json',
			`-r=${profile.repoPath}`,
			...profile.repoParams
		];
		params.push(dryRun ? '--dry-run' : '--prune');
		let keep: string[] = [];
		if (settings.keepLast) keep.push('--keep-last='+settings.keepLast)
		if (settings.keepHourly) keep.push('--keep-hourly='+settings.keepHourly)
		if (settings.keepDaily) keep.push('--keep-daily='+settings.keepDaily)
		if (settings.keepWeekly) keep.push('--keep-weekly='+settings.keepWeekly)
		if (settings.keepMonthly) keep.push('--keep-monthly='+settings.keepMonthly)
		if (keep.length) {
			params = params.concat(...keep)
		}
		if (pathInfo && pathInfo.length) {
			pathInfo.forEach(i => {
				params.push('--tag='+i.path+'')
			})
		} else {
			if (!snapshotId) throw new Error('must provide paths or snapshotId')
			params.push(snapshotId)
		}
		// console.log(params, keep);
		let res = await this.exec(params, {
			...this.getProcessEnv(),
			...profile.getRepoEnv(),
			...profile.getRepoAuthEnv(),
		});
		console.log('forget output', res);
		if (!res.stdout) {
			return []
		}
		let firstLine = res.stdout.split('\n')[0]
		return firstLine[0] === '[' ? JSON.parse(firstLine) : []
	}

	public async mount(profile: UserProfile, path: string): Promise<Process> {
		throw new Error('not implemented in rustic')
	}

	public async restore(profile: UserProfile, path: string, targetPath: string): Promise<Process> {
		await fs.mkdir(targetPath, { recursive: true })
		let params = [
			'restore',
			`--filter-tags=${path}`,
			`-r=${profile.repoPath}`,
			'latest',
			`${targetPath}`,
			...profile.repoParams
		]
		let process = new Process(this.getFullBinPath(), params, {
			...this.getProcessEnv(),
			...profile.getRepoEnv(),
			...profile.getRepoAuthEnv(),
		}, { path })
		process.start();

		return process;
	}

	

}
