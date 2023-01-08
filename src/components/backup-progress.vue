<script lang="ts">
import { defineComponent } from 'vue';
import { selectDirectory } from '../service/node-api'
import { hasRunningProcess, getRunningProcess, BackupProcess, BackupSummary } from '../service/repo';
import humanizeDuration from 'humanize-duration'
import { filesize } from "filesize";

export default defineComponent({
	name: 'BackupProgress',

	emits: ['done'],

	data: () => ({
		progress: {} as Partial<BackupProcess>,
		summary: {} as Partial<BackupSummary>,
		error: ''
	}),

	computed: {
		percentage() {
			if (this.summary.snapshot_id) return 100;
			return Math.floor((this.progress.percent_done || 0) * 100)
		}
	},

	created() {
		let process = getRunningProcess();
		process?.getStdOut()?.on('data', (chk) => {
			let data = JSON.parse(chk.toString('utf-8'));
			if (data.message_type === 'summary') {
				this.summary = data;
			} else if (data.message_type === 'status') {
				this.progress = data;
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
		}
	}

	
})
</script>

<template>
	<el-card>
		<template #header>Backup in Progress</template>
		<el-alert :title="error" type="error" v-if="error" />
		<el-progress
			:percentage="percentage"
		/>
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
