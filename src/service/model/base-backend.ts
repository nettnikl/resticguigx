import du from 'du';
import type { StatsResult, Output, Snapshot, ForgetResultOne } from '../types'
import child_process from 'child_process'
import Path from 'node:path'
import UserProfile, { BackupInfo, PruneSettings } from './profile';
import Process from './process';
import BatchProcess from './batch-process'
import os from 'node:os';
import fs from 'node:fs/promises'
import { openFolder, checkForProcessRunning } from '../node-api'

export default abstract class BaseBackend {

	protected runningProcess: BatchProcess|null = null
	protected currentMount: Process|null = null;

	constructor() {
		console.log('init: ', this.constructor.name, this.getFullBinPath());
	}

	protected createMountBasePath(): string {
		return Path.join(os.tmpdir(), 'restic-mount-'+Date.now());
	}

	protected getProcessEnv() {
		return process.env;
	}

	public hasRunningProcess(): boolean {
		return !!this.runningProcess;
	}

	public getRunningProcess(): BatchProcess|null {
		return this.runningProcess
	}

	public abstract getBinFile(): string

	protected getFullBinPath() {
		let file = this.getBinFile();
		if (os.platform() === 'win32') file = file + '.exe';
		return process.env.NODE_ENV === 'development' 
			? Path.join(process.cwd(), 'bin', file) 
			: Path.join(process.resourcesPath!, 'bin', file);
	}

	protected exec(args: string[], env: Record<string, string>): Promise<Output> {
		return new Promise((res, rej) => {
			const combinedEnv = {
				...process.env,
				...(env || {})
			};
			const binPath = this.getFullBinPath();
			console.log('exec', { binPath, args, combinedEnv })
			child_process.execFile(binPath, args, {
				env: combinedEnv
			}, (err: any, stdout: string|Buffer, stderr: string|Buffer) => {
				if (err) {
					rej(err)
				} else {
					res({
						stdout: Buffer.isBuffer(stdout) ? stdout.toString('utf8') : stdout,
						stderr: Buffer.isBuffer(stderr) ? stderr.toString('utf8') : stderr
					})
				}
			})
		})
	}

	public async assertRepoExists(repoDir: string, password: string, repoEnv: Record<string, string>): Promise<Snapshot[]> {
		try {
			let res = await this.getSnapshots(repoDir, password, repoEnv);
			return res;
		} catch (e) {
			await this.initRepo(repoDir, password, repoEnv);
			return []
		}
	}

	public abstract getSnapshots(repoDir: string, password: string, repoEnv: Record<string, string>): Promise<Snapshot[]>

	public abstract initRepo(repoDir: string, password: string, repoEnv: Record<string, string>)

	public abstract stats(profile: UserProfile): Promise<StatsResult>

	public abstract backup(profile: UserProfile, paths: BackupInfo[]): Promise<BatchProcess>

	public abstract unlock(repoDir: string, password: string): Promise<void>

	public abstract forget(profile: UserProfile, settings: Partial<PruneSettings>, dryRun: boolean, pathInfo?: BackupInfo[], snapshotId?: string): Promise<ForgetResultOne[]>

	public abstract mount(profile: UserProfile, path: string): Promise<Process>

	public unmount() {
		if (!this.currentMount || this.currentMount.isKilled()) throw new Error('not mounted')
		this.currentMount.stop();
	}

	public abstract restore(profile: UserProfile, path: string, targetPath: string): Promise<Process>

	protected async waitForPath(dir: string, retry=5): Promise<boolean> {
		try {
			let stat = await fs.stat(dir);
			if (stat.isDirectory()) return true;
			else throw new Error('is not a directory: '+dir);
		} catch (e: any) {
			if (e.code === 'ENOENT') {
				if (retry < 1) throw new Error('waitForPath timed out for: '+dir);
				await this.sleep(500);
				return this.waitForPath(dir, retry-1);
			}
			throw e;
		}
	}

	protected sleep(ms: number) {
		return new Promise(res => {
			setTimeout(res, ms)
		})
	}

	public checkForRunningProcess(): Promise<boolean> {
		return checkForProcessRunning(this.getFullBinPath());
	}
}
