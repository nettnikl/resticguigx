<script lang="ts">
import { defineComponent } from 'vue';
import { getRunningProcess, BackupProcess, BackupSummary } from '../service/repo';
import humanizeDuration from 'humanize-duration'
import { filesize } from "filesize";
import EtaCalculator from '../service/model/eta'

export default defineComponent({
	name: 'BackupProgress',

	emits: ['done'],

	data: () => ({
		progress: {} as Partial<BackupProcess>,
		summary: {} as Partial<BackupSummary>,
		eta: 0,
		errors: [] as string[],
		progressBars: [] as { path: string, percent: number }[],
		current: 0,
		timer: null as any,
		running: true
	}),

	computed: {
		fileStoring(): string {
			let a = this.progress?.current_files || []
			let s = (a.length > 0 ? a[0] : '');
			return s.length > 90 ? '…'+s.substring(s.length-89) : s
		},
		fileProcessing() {
			let a = this.progress?.current_files || []
			let s = (a.length > 1 ? a[1] : '');
			return s.length > 87 ? '…'+s.substring(s.length-86) : s
		}
	},

	beforeUnmount() {
		clearInterval(this.timer)
	},

	created() {
		let process = getRunningProcess();
		let etaCalc = new EtaCalculator();
		process?.processes.forEach((p) => {
			this.progressBars.push({
				path: p.info.path,
				percent: 0
			});
		});
		process?.waitForFinish().catch(() => {}).then(() => {
			this.running = false;
			clearInterval(this.timer)
		})
		let lastProgress;
		let parseLine = (str: string) => {
			let data: any;
			try {
				data = JSON.parse(str);
			} catch (e) {
				// console.error(e);
				// this.error += str;
				return;
			}
			// console.log('received update', data);
			if (data.message_type === 'summary') {
				let keys: any = Object.keys(data);
				let target: any = this.summary;
				keys.forEach((key: any) => {
					if (typeof target[key] === 'number') {
						target[key] += data[key]
					} else {
						target[key] = data[key]
					}
				})
				this.summary = target;
				this.progressBars[this.current].percent = 100;
				this.eta = 0;
				this.current += 1;
				etaCalc = new EtaCalculator();
			} else if (data.message_type === 'status') {
				lastProgress = data;
				// this.progress = data;
				// this.progressBars[this.current].percent = Math.floor((this.progress.percent_done || 0) * 100)
				// this.eta = etaCalc.update(data.percent_done)
			}
		}
		process?.getStdOut()?.on('data', (chk) => {
			let str: string = chk.toString('utf-8');
			let lines = str.split('\n')
			for (let line of lines) {
				parseLine(line)
			}
		})
		process?.getStdErr()?.on('data', (chk) => {
			// this.error += chk.toString('utf8');
		})
		this.timer = setInterval(() => {
			if (!lastProgress) return;
			this.progress = lastProgress;
			this.progressBars[this.current].percent = Math.floor((this.progress.percent_done || 0) * 100)
			this.eta = etaCalc.update(lastProgress.percent_done)
		}, 750)
	},

	methods: {
		humanizeDuration(n: number) {
			return humanizeDuration(n, { maxDecimalPoints: 0 })
		},
		filesize(n: number) {
			return filesize(n)
		},
		cancel() {
			let process = getRunningProcess();
			if (!process || !process.isRunning()) return;
			process.stop()
		}
	}

	
})
</script>

<template>
	<el-card>
		<template #header>Backup in Progress</template>
		
		<el-progress
			v-for="(p) of progressBars"
			:key="p.path"
			:text-inside="true"
			:percentage="p.percent"
			type="line"
			:stroke-width="20"
			style="margin-bottom: 10px"
		>
			{{ p.path }}: {{ p.percent }}%
		</el-progress>
		<small v-show="eta > 0">Estimated time until completion: {{ humanizeDuration(eta) }}</small>
		<small v-show="eta > 0">
			Processing: {{ fileProcessing }} 
		</small>
		<small v-show="eta > 0">
			Storing: {{ fileStoring }} 
		</small>
		<el-button
			variant="danger"
			@click="cancel"
			v-show="running"
		>
			Cancel 
		</el-button>
		<el-descriptions
			title="Summary"
			v-show="!!summary.snapshot_id"
			:column="3"
			direction="vertical"
			border
		>
			<el-descriptions-item label="New Directories">{{ summary.dirs_new }}</el-descriptions-item>
			<el-descriptions-item label="Changed Directories">{{ summary.dirs_changed }}</el-descriptions-item>
			<el-descriptions-item label="Unchanged Directories">{{ summary.dirs_unmodified }}</el-descriptions-item>
			<el-descriptions-item label="New Files">{{ summary.files_new }}</el-descriptions-item>
			<el-descriptions-item label="Changed Files">{{ summary.files_changed }}</el-descriptions-item>
			<el-descriptions-item label="Unchanged Files">{{ summary.files_unmodified }}</el-descriptions-item>
			<el-descriptions-item label="Duration">{{ humanizeDuration((summary.total_duration || 1) * 1000) }}</el-descriptions-item>
			<el-descriptions-item label="Total Files Processed">{{ summary.total_files_processed }}</el-descriptions-item>
			<el-descriptions-item label="Total Size Processed">{{ filesize(summary.total_bytes_processed || 0) }}</el-descriptions-item>
		</el-descriptions>
	</el-card>
</template>

<style scoped>
small {
	font-family: monospace;
	/* white-space: pre-line; */
	text-align: left;
	font-size: 12px;
	display: -webkit-box;
	overflow: hidden;
	text-overflow: ellipsis;
	-webkit-line-clamp: 1;
	-webkit-box-orient: vertical;
}
</style>
