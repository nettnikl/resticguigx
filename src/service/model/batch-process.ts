import Process from './process'
import Stream from 'node:stream'

function sleep(ms: number) {
	return new Promise(res => {
		setTimeout(res, ms)
	})
}

export default class BatchProcess {

	promise: Promise<void>
	processes: Process[] = []
	#resolve: Function = () => {}
	#reject: Function = () => {}
	current = 0
	stdout: Stream.Transform
	stderr: Stream.Transform
	running = false;

	constructor(p: Process[]) {
		this.processes = p;
		this.promise = new Promise((res, rej) => {
			this.#resolve = res;
			this.#reject = rej;
		})
		this.stdout = new Stream.PassThrough()
		this.stderr = new Stream.PassThrough()
	}

	getCurrentProcess(): Process {
		return this.processes[this.current]
	}

	start() {
		if (this.running) return;
		this.running = true;
		this.#nextProcess();
	}

	async #nextProcess() {
		if (!this.running) return;
		let process = this.getCurrentProcess();
		if (!process) {
			this.#resolve();
			return;
		}
		process.start();
		let pushOut = (evt: any, chk: any) => {
			this.stdout.push(evt, chk)
		}
		let pushErr = (evt: any, chk: any) => {
			this.stdout.push(evt, chk)
		}
		process.getStdOut()?.on('data', pushOut)
		process.getStdErr()?.on('data', pushErr)
		try {
			await process.waitForFinish();
			// console.log('one process finished')
			await sleep(300)
		} catch (err) {
			this.#reject(err)
			return
		} finally {
			process.getStdOut()?.off('data', pushOut)
			process.getStdErr()?.off('data', pushErr)
		}
		this.current += 1;
		await this.#nextProcess();
	}

	waitForFinish(): Promise<void> {
		return this.promise
	}

	getStdOut(): Stream.Readable {
		return this.stdout
	}

	getStdErr(): Stream.Readable {
		return this.stderr
	}

	stop() {
		if (!this.running) return;
		this.running = false;
		this.getCurrentProcess().stop();
		this.#resolve();
	}

	isRunning() {
		return this.running;
	}

}
