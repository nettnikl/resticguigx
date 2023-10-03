import BaseBackend from './base-backend'
import du from 'du';
import type { StatsResult, Snapshot, ForgetResultOne } from '../types'
import Path from 'node:path'
import UserProfile, { BackupInfo, PruneSettings } from './profile';
import Process from './process';
import BatchProcess from './batch-process'
import fs from 'node:fs/promises'
import { openFolder, checkForProcessRunning } from '../node-api'

export default class ResticBackend extends BaseBackend {

	public getBinFile() {
		return 'restic';
	}

	public async getSnapshots(repoDir: string, repoEnv: Record<string, string>, repoAuthEnv: Record<string, string>): Promise<Snapshot[]> {
		let res = await this.exec([
			'snapshots',
			`-r=${repoDir}`,
			'--json'
		], {
			...this.getProcessEnv(),
			...repoEnv,
			...repoAuthEnv,
		});
		console.log('snapshots output', res);
		return res.stdout ? JSON.parse(res.stdout) : []
	}

	public async initRepo(repoDir: string, repoEnv: Record<string, string>, repoAuthEnv: Record<string, string>) {
		let res = await this.exec([
			'init',
			'--json',
			`-r=${repoDir}`
		], {
			...this.getProcessEnv(),
			...repoEnv,
			...repoAuthEnv,
		})
		return res.stdout;
	}

	public async stats(profile: UserProfile): Promise<StatsResult> {
		let res = await this.exec([
			'stats',
			'--json',
			`-r=${profile.getRepoPath()}`
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
		let exclude: string[] = [`--iexclude=${profile.repoPath}`];
		if (profile.excludeSettings) {
			if (profile.excludeSettings.largerThanSize && profile.excludeSettings.largerThanSize > 0) {
				exclude.push(`--exclude-larger-than=${profile.excludeSettings.largerThanSize}${profile.excludeSettings.largerThanType}`)
			}
			if (profile.excludeSettings.excludeMethod==="exclude-list" && profile.excludeSettings.paths) {
				profile.excludeSettings.paths.forEach(path => {
					exclude.push(`--iexclude=${path}`)
				})
			}
			if (profile.excludeSettings.excludeMethod==="exclude-file" && profile.excludeSettings.excludeFile) {
				exclude.push(`--iexclude-file=${profile.excludeSettings.excludeFile}`)
			}
		}
		const baseParams = [
			'--json',
			'backup',
			'--group-by=tags',
			'--exclude-caches'
		]
		if (profile.backupSettings.ignoreCtime) {
			baseParams.push('--ignore-ctime')
		}
		if (profile.backupSettings.ignoreInode) {
			baseParams.push('--ignore-inode')
		}
		for (let info of paths) {
			let params = exclude.concat(...baseParams).concat(...[
				`--tag=${info.path}`,
				`-r=${profile.repoPath}`,
				`${info.path}`
			]);
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
		],  repoAuthEnv)
	}

	public async forget(profile: UserProfile, settings: Partial<PruneSettings>, dryRun: boolean, pathInfo?: BackupInfo[] | undefined, snapshotId?: string | undefined): Promise<ForgetResultOne[]> {
		let params = [
			'--json',
			'forget',
			`-r=${profile.repoPath}`
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
		if (this.currentMount) {
			if (!this.currentMount.isConnected()) {
				this.currentMount = null
			} else {
				if (this.currentMount.info.path !== path) {
					this.currentMount.stop();
					this.currentMount = null;
				}
			}
		}
		const mountPath = this.createMountBasePath();
		if (!this.currentMount) {
			await fs.mkdir(mountPath, { recursive: true, mode: 0o770 })
	
			let process = new Process(this.getFullBinPath(), [
				'--json',
				'mount',
				`--tag=${path}`,
				`-r=${profile.repoPath}`,
				mountPath
			], {
				...this.getProcessEnv(),
				...profile.getRepoEnv(),
				...profile.getRepoAuthEnv(),
			}, { path });
			this.currentMount = process;
			process.start();
			process.waitForFinish()!
				.catch(() => {})
				.then(() => {
					this.currentMount = null;
				})
		}
	
		let fullPath = Path.join(mountPath, 'tags', path.substring(1), 'latest', path.substring(1));
		await this.waitForPath(fullPath, 5);
		await openFolder(fullPath);
		
		return this.currentMount;
	}

	public async restore(profile: UserProfile, path: string, targetPath: string): Promise<Process> {
		await fs.mkdir(targetPath, { recursive: true })
		let params = [
			'--json',
			'restore',
			`--tag=${path}`,
			`-r=${profile.repoPath}`,
			`--target=${targetPath}`,
			'latest'
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
