import child_process from 'child_process'
import { BackupInfo } from './profile'

export default class Process {

	cmd = ''
	args: string[] = []
	env: Record<string, string> = {}
	process: child_process.ChildProcess|null = null
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
		this.process = child_process.spawn(this.cmd, this.args, {
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
		console.log('started', this.process)
		this.promise = new Promise((resolve, reject) => {
			this.process!.once('exit', (code) => {
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
			this.process!.once('error', reject)
		})
	}

	waitForFinish() {
		return this.promise;
	}

	getStdOut() {
		return this.process!.stdout;
	}

	getStdErr() {
		return this.process!.stderr;
	}

}
