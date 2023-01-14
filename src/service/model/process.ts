import child_process from 'child_process'
import { BackupInfo } from './profile'

const ps = Symbol('process')

export default class Process {


	[ps]: child_process.ChildProcess|null = null
	cmd = ''
	args: string[] = []
	env: Record<string, string> = {}
	promise: Promise<boolean>|null = null
	info: BackupInfo

	constructor(cmd: string, args: string[], env: Record<string, string>, info: BackupInfo) {
		this.cmd = cmd;
		this.args = args;
		this.env = env;
		this.info = info;
	}

	start() {
		console.log('starting', this.cmd, this.args, this.env)
		let p = child_process.spawn(this.cmd, this.args, {
			stdio: [
				null,
				'pipe',
				'pipe'
			],
			env: {
				...process.env,
				...this.env
			}
		})
		Object.defineProperty(this, ps, { value: p, enumerable: false })
		console.log('started', p)
		this.promise = new Promise((resolve, reject) => {
			this[ps]!.once('exit', (code) => {
				if (code === 3) {
					console.warn('snapshot was incomplete');
					resolve(false)
					return;
				}
				if (code) {
					reject(new Error('exit code: '+code))
				} else {
					this.info.lastBackupFinished = new Date().toJSON()
					resolve(true)
				}
			})
			this[ps]!.once('error', (err) => {
				console.log('process error', err);
				reject(err);
			});
		})
	}

	stop() {
		this[ps]!.kill()
	}

	waitForFinish() {
		return this.promise;
	}

	getStdOut() {
		return this[ps]!.stdout;
	}

	getStdErr() {
		return this[ps]!.stderr;
	}

	isConnected() {
		return this[ps]?.connected;
	}

	isKilled() {
		return this[ps]?.killed
	}

}
