<script lang="ts">
import { defineComponent } from 'vue';
import UserProfile, { BackupInfo, PruneSettings } from '../service/model/profile';
import { loadProfile, saveProfile } from '../service/user-storage'
import * as Repo from '../service/repo'
import backupNewVue from './backup-new.vue';
import backupProgressVue from './backup-progress.vue';
import pruneSettingsVue from './prune-settings.vue';
import { filesize } from "filesize";
import { error } from 'console';
import { ElDescriptions, ElDescriptionsItem, ElAlert, ElButton, ElButtonGroup, ElCard, ElCollapse, ElCollapseItem, ElMessage } from 'element-plus';
import restoreOptionsVue from './restore-options.vue';

export default defineComponent({
	name: 'ProfileOverview',

	components: {
		backupNewVue,
		backupProgressVue,
		pruneSettingsVue,
		restoreOptionsVue
	},

	props: {
		profile: {
			type: UserProfile,
			required: true
		}
	},

	data: () => ({
		working: false,
		error: '',
		accordion: '',
		showProgress: false
	}),

	computed: {
		canPrune() {

		},
		hasFolders() {
			return this.profile.backupDirs.length > 0;
		}
	},

	async created() {
		if (this.profile.backupDirs.length === 0) {
			this.accordion = 'newPath';
		}
	},

	methods: {
		async runBackup(info?: BackupInfo) {
			this.working = true;
			let acc = this.accordion;
			this.accordion = '';
			try {
				this.showProgress = false;
				let targets = info ? [info] : this.profile.backupDirs
				targets.forEach(info => {
					info.lastBackupStart = new Date().toJSON()
				})
				let process = await Repo.backup(this.profile, targets);
				this.showProgress = true;
				try {
					await process.waitForFinish();
					ElMessage({
						message: 'backup has completed without errors',
						type: 'success'
					})
					if (!info) {
						this.profile.repoInfo.lastFullBackup = new Date().toJSON()
					}
				} finally {
					let stats = await Repo.stats(this.profile.repoPath, this.profile.getSecret())
					this.profile.repoStats = stats;
					await this.saveProfile();
				}
			} catch (e: any) {
				ElMessage({
					message: 'error during backup',
					type: 'error'
				})
				this.error = e.message;
				console.error(e);
			}
			this.working = false;
			this.accordion = acc;
		},
		async added(path: string) {
			this.profile.backupDirs.push({ path })
			await this.saveProfile();
			this.accordion = 'paths';
		},
		async pruneRepository() {
			this.working = true;
			try {
				
				let stats = await Repo.stats(this.profile.repoPath, this.profile.getSecret())
				this.profile.repoStats = stats;
				await this.saveProfile();
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
			this.working = false;
		},
		async updateStats() {
			this.working = true;
			try {
				let stats = await Repo.stats(this.profile.repoPath, this.profile.getSecret())
				this.profile.repoStats = stats;
				await this.saveProfile();
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
			this.working = false;

		},
		async saveProfile() {
			try {
				await saveProfile(this.profile)
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
		},
		async removePath(info: BackupInfo) {
			this.working = true;
			try {
				let res = await Repo.forget(this.profile, { keepLast: 1 }, false, [info]);
				if (res.length) {
					let lastSnapshotId = res[0].keep[0].id;
					await Repo.forget(this.profile, {}, false, [], lastSnapshotId)
					ElMessage({
						message: 'path deleted from repository',
						type: 'success'
					})
				} else {
					throw new Error('cannot forget last snapshot');
				}
				let stats = await Repo.stats(this.profile.repoPath, this.profile.getSecret())
				this.profile.repoStats = stats;
				let idx = this.profile.backupDirs.findIndex(e => e === info);
				this.profile.backupDirs.splice(idx, 1);
				await this.saveProfile();
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
			this.working = false;
		},
		filesize(n: number) {
			return filesize(n)
		},
		async updatePruneSettings(s: PruneSettings) {
			this.profile.pruneSettings = s;
			await this.saveProfile();
			ElMessage({
				message: 'Settings have been saved',
				type: 'success'
			})
			this.accordion = '';
		},
		async runPrune(info?: BackupInfo) {
			this.working = true;
			try {
				let targets = info ? [info] : this.profile.backupDirs
				let res = await Repo.forget(this.profile, this.profile.pruneSettings, false, targets)
				console.log('prune complete', res);
				targets.forEach(t => {
					t.lastCleanup = new Date().toJSON()
				})
				let kept = 0;
				let removed = 0;
				res.forEach(row => {
					kept += row.keep.length
					removed += row.remove ? row.remove.length : 0
				})
				ElMessage({
					message: 'Cleanup complete. Kept: '+kept+', cleaned: '+removed+' over '+targets.length+' path(s)',
					type: 'success'
				})
				let stats = await Repo.stats(this.profile.repoPath, this.profile.getSecret())
				this.profile.repoStats = stats;
				await this.saveProfile();
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
			this.working = false;
		}
	}

	
})
</script>

<template>
	<el-descriptions 
		title="Info" 
		border
		:column="4"
		direction="vertical"
	>
		<el-descriptions-item label="Repository">{{ profile.repoPath }}</el-descriptions-item>
		<el-descriptions-item label="Total File Count">{{ profile.repoStats.total_file_count }}</el-descriptions-item>
		<el-descriptions-item label="Snapshot Count">{{ profile.repoStats.snapshots_count }}</el-descriptions-item>
		<el-descriptions-item label="File Size">{{ filesize(profile.repoStats.total_size || 0) }}</el-descriptions-item>
		<el-descriptions-item label="Last full Backup">{{ $filters.dateTime(profile.repoInfo.lastFullBackup) || 'never' }}</el-descriptions-item>
	</el-descriptions>
	
	<el-alert type="error" v-show="error.length > 0" :title="error" />
	
	<backup-progress-vue v-if="showProgress" />

	<div style="margin: 16px 0" v-show="hasFolders">
		<el-button-group>
			<el-button @click="showProgress = false" v-if="showProgress && !working">Close Progress</el-button>
			<el-button @click="() => runBackup()" :disabled="working" type="primary">Run full Backup</el-button>
			<el-button @click="updateStats" :disabled="working">Update Statistics</el-button>
			<el-button @click="() => runPrune()" :disabled="working">Cleanup Repo</el-button>
		</el-button-group>
	</div>

	

	<el-collapse accordion v-model="accordion" v-loading="working">
		<el-collapse-item 
			title="Folders"
			name="paths"
			v-show="hasFolders"
		>
			<el-card
				v-for="info of profile.backupDirs"
				:key="info.path"
				shadow="never"
				style="text-align: left; margin-bottom: 8px"
			>
				<template #header>
					<pre>{{ info.path }}</pre>
				</template>
				<el-descriptions
					direction="vertical"
					size="small"
				>
					<el-descriptions-item label="Last Backup Started">{{ $filters.dateTime(info.lastBackupStart) || 'never' }}</el-descriptions-item>
					<el-descriptions-item label="Last Backup Completed">{{ $filters.dateTime(info.lastBackupFinished) || 'never' }}</el-descriptions-item>
					<el-descriptions-item label="Last Cleaned">{{ $filters.dateTime(info.lastCleanup) || 'never' }}</el-descriptions-item>
				</el-descriptions>
				<el-button @click="runBackup(info)">Backup</el-button>
				<el-button @click="runPrune(info)">Cleanup</el-button>
				<el-popconfirm 
					title="This will remove all data for this folder from the repository. Are you sure?"
					width="225"
					icon-color="#ff0000"
					@confirm="removePath(info)"
				>
					<template #reference>
						<el-button>Remove</el-button>
					</template>
				</el-popconfirm>
				<restore-options-vue :profile="profile" :path="info.path" />
			</el-card>
		</el-collapse-item>
		<el-collapse-item title="Add Folder to Backup" name="newPath">
			<backup-new-vue @created="e => added(e)" />
		</el-collapse-item>
		<el-collapse-item title="Prune Settings" name="pruneSettings">
			<prune-settings-vue :profile="profile" @save="updatePruneSettings" />
		</el-collapse-item>
		<el-collapse-item title="Debug" name="debug">
			<div style="white-space:pre-line">{{ profile }}</div>
		</el-collapse-item>
	</el-collapse>
	
</template>
