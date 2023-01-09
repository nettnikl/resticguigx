import * as Secrets from './secrets'
import type { StatsResult } from './types'
import child_process from 'child_process'
import util from 'node:util';
import Path from 'node:path'
import UserProfile, { BackupInfo } from './model/profile';
import Process from './model/process';
import BatchProcess from './model/batch-process'
const exec = util.promisify(child_process.exec);
const binPath = Path.join(process.cwd(), 'data', 'bin', 'restic');

async function runCommand(args: string[]) {
	let cmd = `${binPath} ${args.join(' ')}`;
	let res = await exec(cmd)
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



export async function forget() {

}
