import type { StatsResult } from './types'
import child_process from 'child_process'
import Path from 'node:path'
import UserProfile, { BackupInfo, PruneSettings } from './model/profile';
import Process from './model/process';
import BatchProcess from './model/batch-process'
import os from 'node:os';
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

export async function assertRepoExists(repoDir: string, password: string) {
	try {
		await stats(repoDir, password);
	} catch (e) {
		console.log('error in stats', e);
		await initRepo(repoDir, password);
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
			RESTIC_PASSWORD: profile.storedSecred
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

type Snapshot = {
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
		RESTIC_PASSWORD: profile.storedSecred
	});
	console.log('forget output', res);
	if (!res.stdout) {
		return []
	}
	let firstLine = res.stdout.split('\n')[0]
	return firstLine[0] === '[' ? JSON.parse(firstLine) : []
}

export async function getSnapshots(profile: UserProfile): Promise<Snapshot[]> {
	let res = await exec([
		'snapshots',
		`-r=${profile.repoPath}`,
		'--json'
	], {
		RESTIC_PASSWORD: profile.storedSecred
	});
	console.log('snapshots output', res);
	return res.stdout ? JSON.parse(res.stdout) : []
}
