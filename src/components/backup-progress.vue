<script lang="ts">
import { defineComponent } from 'vue';
import { getRunningProcess, BackupProcess, BackupSummary } from '../service/repo';
import humanizeDuration from 'humanize-duration'
import { filesize } from "filesize";

export default defineComponent({
	name: 'BackupProgress',

	emits: ['done'],

	data: () => ({
		progress: {} as Partial<BackupProcess>,
		summary: {} as Partial<BackupSummary>,
		error: '',
		progressBars: [] as { path: string, percent: number }[],
		current: 0,
		running: true
	}),

	created() {
		let process = getRunningProcess();
		process?.processes.forEach((p) => {
			this.progressBars.push({
				path: p.info.path,
				percent: 0
			});
		});
		process?.waitForFinish().catch(() => {}).then(() => {
			this.running = false;
		})
		process?.getStdOut()?.on('data', (chk) => {
			let str = chk.toString('utf-8');
			let data: any;
			try {
				data = JSON.parse(str);
			} catch (e) {
				this.error += str;
				return;
			}
			if (data.message_type === 'summary') {
				// console.log('received summary', data);
				let keys: any = Object.keys(data);
				let target: any = this.summary;
				keys.forEach((key: any) => {
					if (key in target) {
						target[key] += data[key]
					} else {
						target[key] = data[key]
					}
				})
				this.summary = target;
				this.progressBars[this.current].percent = 100;
				this.current += 1;
			} else if (data.message_type === 'status') {
				this.progress = data;
				this.progressBars[this.current].percent = Math.floor((this.progress.percent_done || 0) * 100)
			}
		})
		process?.getStdErr()?.on('data', (chk) => {
			this.error += chk.toString('utf8');
		})
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
		<el-alert :title="error" type="error" v-if="error" />
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
			<el-descriptions-item label="Duration">{{ humanizeDuration(summary.total_duration || 0) }}</el-descriptions-item>
			<el-descriptions-item label="Total Files Processed">{{ summary.total_files_processed }}</el-descriptions-item>
			<el-descriptions-item label="Total Size Processed">{{ filesize(summary.total_bytes_processed || 0) }}</el-descriptions-item>
		</el-descriptions>
	</el-card>
</template>
