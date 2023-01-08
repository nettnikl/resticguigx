import child_process from 'child_process'

export default class Process {

	cmd = ''
	args: string[] = []
	env: Record<string, string> = {}
	process: child_process.ChildProcess|null = null
	promise: Promise<boolean>|null = null

	constructor(cmd: string, args: string[], env: Record<string, string>) {
		this.cmd = cmd;
		this.args = args;
		this.env = env;
	}

	start() {
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
		console.log(this.cmd, this.args, this.env, this.process)
		this.promise = new Promise((resolve, reject) => {
			this.process!.once('exit', (code) => {
				if (code) reject(new Error('exit code: '+code))
				else resolve(true)
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
