
export default class EtaCalculator {

	start = Date.now()
	lastPercent = -1
	percents: number[] = []
	latest = 0

	update(percent: number): number {
		let now = Date.now();
		let elapsed = now-this.start;
		let total = elapsed/percent;
		let end = this.start + total;
		let rest = end - now;
		console.log('update', { percent, rest, elapsed, total, end, list: this.percents })
		this.latest = end;
		let percentRounded = Math.floor(percent*100);
		if (percentRounded > this.lastPercent) {
			this.percents.push(~~end);
			this.lastPercent = percentRounded;
		}
		return rest;
	}

}
