import * as Secrets from './secrets'
import type { StatsResult } from './types'
import child_process from 'child_process'
import util from 'node:util';
import Path from 'node:path'
import UserProfile, { BackupInfo, PruneSettings } from './model/profile';
import Process from './model/process';
import BatchProcess from './model/batch-process'
const exec = util.promisify(child_process.exec);
const binPath = Path.join(process.cwd(), 'data', 'bin', 'restic');

async function runCommand(args: string[], env?: Record<string, string>): Promise<string> {
	let cmd = `${binPath} ${args.join(' ')}`;
	let res = await exec(cmd, {
		env: {
			...process.env,
			...(env || {})
		}
	})
	return res.stdout
}


export async function initRepo(repoDir: string, password: string) {
	await Secrets.start();
	let secret = Secrets.registerSecret(password);
	let res = await runCommand([
		'init',
		'--json',
		`--password-command "${secret.command}"`,
		`-r ${repoDir}`
	])
	secret.unregister();
	// console.debug('repo init result', res);
}



export async function stats(repoDir: string, password: string): Promise<StatsResult> {
	await Secrets.start();
	let secret = Secrets.registerSecret(password);
	let res = await runCommand([
		'stats',
		'--json',
		`--password-command "${secret.command}"`,
		`-r ${repoDir}`
	])
	secret.unregister();
	// console.log('stats result', res);
	return JSON.parse(res)
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
	// await Secrets.start();
	// let secret = Secrets.registerSecret(profile.storedSecred);
	if (paths.length === 0) throw new Error('no paths specified')
	let processes: Process[] = [];
	for (let info of paths) {
		let process = new Process(binPath, [
			'--json',
			'backup',
			'--exclude-caches',
			`--tag="${info.path}"`,
			`-r=${profile.repoPath}`,
			`${info.path}`
		], {
			RESTIC_PASSWORD: profile.storedSecred
		})
		processes.push(process);
	}
	let batch = new BatchProcess(processes);
	batch.start();
	// setTimeout(() => {s
	// 	secret.unregister()
	// }, 2000)
	runningProcess = batch;
	batch.waitForFinish().then(() => {
		runningProcess = null;
	})
	return batch;
}

type ForgetSnapshot = {
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
	keep: ForgetSnapshot[],
	remove: null|ForgetSnapshot[],
	reasons: {
		snapshot: ForgetSnapshot,
		matches: string[],
		counters: {
			last: number
		}
	}[]
}

export async function forget(profile: UserProfile, settings: Partial<PruneSettings>, dryRun: boolean, pathInfo?: BackupInfo[]): Promise<ForgetResultOne[]> {
	let params = [
		'--json',
		'forget',
		`-r=${profile.repoPath}`
	];
	params.push(dryRun ? '--dry-run' : '--prune');
	if (settings.keepLast) params.push('--keep-last='+settings.keepLast)
	if (settings.keepHourly) params.push('--keep-hourly='+settings.keepHourly)
	if (pathInfo) {
		pathInfo.forEach(i => {
			params.push('--path='+i.path)
		})
	}
	let stdout = await runCommand(params, {
		RESTIC_PASSWORD: profile.storedSecred
	});
	console.log(stdout);
	return JSON.parse(stdout)
}
