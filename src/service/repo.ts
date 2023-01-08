import Restic from './restic'
import * as Secrets from './secrets'
import type { StatsResult} from './types'

export async function initRepo(repoDir: string, password: string) {
	await Secrets.start();
	let secret = Secrets.registerSecret(password);
	let res = await Restic.runCommand([
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
	let res = await Restic.runCommand([
		'stats',
		'--json',
		`--password-command "${secret.command}"`,
		`-r ${repoDir}`
	])
	secret.unregister();
	// console.log('stats result', res);
	return JSON.parse(res)
}

export async function backup(repoDir: string, password: string, cacheDir: string, targetDirectories: string[], excludeDirectories: string[]) {
	
}

export async function forget() {

}
