import du from 'du';
import type { StatsResult, Snapshot, ForgetResultOne } from './types'
import UserProfile, { BackupInfo, PruneSettings } from './model/profile';
import Process from './model/process';
import BatchProcess from './model/batch-process'
import ResticBackend from './model/restic';
import RusticBackend from './model/rustic';

console.log('process.env.VITE_RESTIC_BACKEND', import.meta.env.VITE_RESTIC_BACKEND);
const RepoClass = import.meta.env.VITE_RESTIC_BACKEND === 'rustic' ? RusticBackend : ResticBackend;

const repo = new RepoClass();

export function getBinFile(): string {
	return repo.getBinFile();
}

export async function assertRepoExists(repoDir: string, repoEnv: Record<string, string>, repoAuthEnv: Record<string, string>): Promise<Snapshot[]> {
	return repo.assertRepoExists(repoDir, repoEnv, repoAuthEnv);
}

export async function initRepo(repoDir: string, repoEnv: Record<string, string>, repoAuthEnv: Record<string, string>) {
	return repo.initRepo(repoDir, repoEnv, repoAuthEnv);
}

export async function stats(profile: UserProfile): Promise<StatsResult> {
	return repo.stats(profile);
}

export async function getFolderSize(repoDir: string): Promise<number> {
	let res = await du(repoDir)
	return res;
}

export function hasRunningProcess(): boolean {
	return repo.hasRunningProcess();
}
export function getRunningProcess(): BatchProcess|null {
	return repo.getRunningProcess();
}

export async function backup(profile: UserProfile, paths: BackupInfo[]): Promise<BatchProcess> {
	return repo.backup(profile, paths);
}

export async function checkForRunningProcess() {
	return repo.checkForRunningProcess()
}

export async function unlock(repoDir: string, repoAuthEnv: Record<string, string>) {
	return repo.unlock(repoDir, repoAuthEnv)
}

export async function forget(profile: UserProfile, settings: Partial<PruneSettings>, dryRun: boolean, pathInfo?: BackupInfo[], snapshotId?: string): Promise<ForgetResultOne[]> {
	return repo.forget(profile, settings, dryRun, pathInfo, snapshotId)
}

export async function getSnapshots(repoDir: string, repoEnv: Record<string, string>, repoAuthEnv: Record<string, string>): Promise<Snapshot[]> {
	return repo.getSnapshots(repoDir, repoEnv, repoAuthEnv)
}

export async function mount(profile: UserProfile, path: string): Promise<Process> {
	return repo.mount(profile, path)
}

export function unmount() {
	return repo.unmount()
}

export async function restore(profile: UserProfile, path: string, targetPath: string) {
	return repo.restore(profile, path, targetPath)
}

