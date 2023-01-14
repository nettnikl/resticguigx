import type { StatsResult } from './types'
import child_process from 'child_process'
import Path from 'node:path'
import UserProfile, { BackupInfo, PruneSettings } from './model/profile';
import Process from './model/process';
import BatchProcess from './model/batch-process'
import os from 'node:os';
import fs from 'node:fs/promises'
import { openFolder } from './node-api'

const binPath = process.env.NODE_ENV === 'development' 
	? Path.join(process.cwd(), 'bin', 'linux', 'restic') 
	: Path.join(process.resourcesPath!, 'bin', os.platform() === 'win32' ? 'restic.exe' : 'restic');

type Output = { stdout: string, stderr: string }

function exec(args: string[], env: Record<string, string>): Promise<Output> {
	return new Promise((res, rej) => {
		child_process.execFile(binPath, args, {
			env: {
				...process.env,
				...(env || {})
			}
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

export async function assertRepoExists(repoDir: string, password: string): Promise<Snapshot[]> {
	try {
		let res = await getSnapshots(repoDir, password);
		return res;
	} catch (e) {
		await initRepo(repoDir, password);
		return []
	}
}

export async function initRepo(repoDir: string, password: string) {
	let res = await exec([
		'init',
		'--json',
		`-r=${repoDir}`
	], {
		RESTIC_PASSWORD: password
	})
	return res.stdout;
}

export async function stats(repoDir: string, password: string): Promise<StatsResult> {
	let res = await exec([
		'stats',
		'--json',
		`-r=${repoDir}`
	], {
		RESTIC_PASSWORD: password
	})
	console.log('stats output', res);
	return JSON.parse(res.stdout)
}

let runningProcess: BatchProcess|null = null;

export function hasRunningProcess(): boolean {
	return !!runningProcess;
}
export function getRunningProcess(): BatchProcess|null {
	return runningProcess
}

export type BackupSummary = {
	"message_type":"summary",
	"files_new": number,
	"files_changed": number,
	"files_unmodified": number,
	"dirs_new": number,
	"dirs_changed": number,
	"dirs_unmodified": number,
	"data_blobs": number,
	"tree_blobs": number,
	"data_added": number,
	"total_files_processed": number,
	"total_bytes_processed": number,
	"total_duration": number,
	"snapshot_id": string
}
export type BackupProcess = {
	"message_type":"status",
	"percent_done": number,
	"total_files": number,
	"total_bytes": number
}

export async function backup(profile: UserProfile, paths: BackupInfo[]): Promise<BatchProcess> {
	if (runningProcess) throw new Error('a restic process is already running')
	if (paths.length === 0) throw new Error('no paths specified')
	let processes: Process[] = [];
	for (let info of paths) {
		let process = new Process(binPath, [
			'--json',
			'backup',
			'--exclude-caches',
			`--tag=${info.path}`,
			`-r=${profile.repoPath}`,
			`${info.path}`
		], {
			RESTIC_PASSWORD: profile.getSecret()
		}, info)
		processes.push(process);
	}
	let batch = new BatchProcess(processes);
	batch.start();
	runningProcess = batch;
	batch.waitForFinish().then(() => {
		runningProcess = null;
	})
	return batch;
}

export type Snapshot = {
	time: string,
	parent?: string,
	tree: string,
	paths: string[],
	hostname: string,
	username: string,
	uid: number,
	gid: number,
	tags: string[],
	id: string,
	short_id: string
}

export type ForgetResultOne = {
	tags: null|string,
	host: string,
	paths: string[],
	keep: Snapshot[],
	remove: null|Snapshot[],
	reasons: {
		snapshot: Snapshot,
		matches: string[],
		counters: {
			last: number
		}
	}[]
}

export async function forget(profile: UserProfile, settings: Partial<PruneSettings>, dryRun: boolean, pathInfo?: BackupInfo[], snapshotId?: string): Promise<ForgetResultOne[]> {
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
	console.log(params, keep);
	let res = await exec(params, {
		RESTIC_PASSWORD: profile.getSecret()
	});
	console.log('forget output', res);
	if (!res.stdout) {
		return []
	}
	let firstLine = res.stdout.split('\n')[0]
	return firstLine[0] === '[' ? JSON.parse(firstLine) : []
}

export async function getSnapshots(repoDir: string, password: string): Promise<Snapshot[]> {
	let res = await exec([
		'snapshots',
		`-r=${repoDir}`,
		'--json'
	], {
		RESTIC_PASSWORD: password
	});
	console.log('snapshots output', res);
	return res.stdout ? JSON.parse(res.stdout) : []
}

let currentMount: Process|null = null;
const mountBasePath = Path.join(os.tmpdir(), 'restic-mount-'+Date.now());
export async function mount(profile: UserProfile, path: string): Promise<Process> {
	if (currentMount) {
		if (!currentMount.isConnected()) {
			currentMount = null
		} else {
			if (currentMount.info.path !== path) {
				currentMount.stop();
				currentMount = null;
			}
		}
	}
	if (!currentMount) {
		await fs.mkdir(mountBasePath, { recursive: true, mode: 0o770 })

		let process = new Process(binPath, [
			'--json',
			'mount',
			`--tag=${path}`,
			`-r=${profile.repoPath}`,
			mountBasePath
		], {
			RESTIC_PASSWORD: profile.getSecret()
		}, { path });
		currentMount = process;
		process.start();
		process.waitForFinish()?.then(() => {
			console.log('mount process finished')
			currentMount = null;
		}).catch((err) => {
			console.error('mount process error', err);
			currentMount = null;
		})
	}

	let fullPath = Path.join(mountBasePath, 'tags', path.substring(1), 'latest', path.substring(1));
	await waitForPath(fullPath, 5);
	await openFolder(fullPath);
	
	return currentMount;
}

export async function unmount() {
	if (!currentMount || currentMount.isKilled()) throw new Error('not mounted')
	currentMount.stop();
}

export async function restore(profile: UserProfile, path: string, targetPath: string) {
	await fs.mkdir(targetPath, { recursive: true })
	let params = [
		'--json',
		'restore',
		`--tag=${path}`,
		`-r=${profile.repoPath}`,
		`--target=${targetPath}`,
		'latest'
	]
	let process = new Process(binPath, params, {
		RESTIC_PASSWORD: profile.getSecret()
	}, { path })
	process.start();

	return process;
}

async function waitForPath(dir: string, retry=5): Promise<boolean> {
	try {
		let stat = await fs.stat(dir);
		if (stat.isDirectory()) return true;
		else throw new Error('is not a directory: '+dir);
	} catch (e: any) {
		if (e.code === 'ENOENT') {
			if (retry < 1) throw new Error('waitForPath timed out for: '+dir);
			await sleep(500);
			return waitForPath(dir, retry-1);
		}
		throw e;
	}
}

function sleep(ms: number) {
	return new Promise(res => {
		setTimeout(res, ms)
	})
}
