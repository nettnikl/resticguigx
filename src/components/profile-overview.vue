<script lang="ts">
import { defineComponent } from 'vue';
import UserProfile, { BackupInfo, ExcludeSettings, PruneSettings } from '../service/model/profile';
import { saveProfile } from '../service/user-storage'
import * as Repo from '../service/repo'
import backupNewVue from './backup-new.vue';
import backupProgressVue from './backup-progress.vue';
import pruneSettingsVue from './prune-settings.vue';
import excludeSettingsVue from './exclude-settings.vue';
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
		excludeSettingsVue,
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
		accordionFolders: '',
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
					if (!info) {
						let stats = await Repo.stats(this.profile.repoPath, this.profile.getSecret())
						this.profile.repoStats = stats;
					}
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
			let exists = this.profile.backupDirs.find(e => e.path === path);
			if (exists) {
				ElMessage({
					message: 'path '+path+' already exists, skipping',
					type: 'warning'
				})
			} else {
				this.profile.backupDirs.push({ path })
				await this.saveProfile();
			}
			this.accordion = 'paths';
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
		async updateExcludeSettings(s: ExcludeSettings) {
			this.profile.excludeSettings = s;
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
		},
		async unlock() {
			this.working = true;
			try {
				let running = await Repo.checkForRunningProcess();
				if (running) {
					ElMessage({
						message: 'a process is still running',
						type: 'error'
					})
				} else {
					await Repo.unlock(this.profile.repoPath, this.profile.getSecret())
					ElMessage({
						message: 'Successfully unlocked Repository',
						type: 'success'
					})
				}
			} catch(e: any) {
				this.error = e.message;
			}
			this.working = false;
		}
	}

	
})
</script>

<template>
	<el-card class="card-light">
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
			<el-button @click="() => runBackup()" :disabled="working" type="primary" icon="Coin">Run full Backup</el-button>
			<el-button @click="() => runPrune()" :disabled="working" icon="Files">Cleanup Repo</el-button>
			<el-button @click="updateStats" :disabled="working">Update Statistics</el-button>
		</el-button-group>
	</div>

	

	<el-tabs  v-model="accordion" type="card" v-loading="working" style="text-align: left;">
		<el-tab-pane
			label="Folders"
			name="paths"
			v-show="hasFolders"
		>
			<el-collapse accordion v-model="accordionFolders" style="text-align: left;">
				<el-collapse-item 
					v-for="info of profile.backupDirs"
					:key="info.path"
					:title="info.path"
					:name="info.path"
				>
					<el-descriptions
						direction="vertical"
						size="small"
					>
						<el-descriptions-item label="Last Backup Started">{{ $filters.dateTime(info.lastBackupStart) || 'never' }}</el-descriptions-item>
						<el-descriptions-item label="Last Backup Completed">{{ $filters.dateTime(info.lastBackupFinished) || 'never' }}</el-descriptions-item>
						<el-descriptions-item label="Last Cleaned">{{ $filters.dateTime(info.lastCleanup) || 'never' }}</el-descriptions-item>
					</el-descriptions>
					<el-button @click="runBackup(info)" icon="Coin">Backup</el-button>
					<el-button @click="runPrune(info)" icon="Files">Cleanup</el-button>
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
					<restore-options-vue :profile="profile" :path="info.path" :hasBackupCompleted="!!info.lastBackupFinished" />
				</el-collapse-item>
			</el-collapse>
		</el-tab-pane>
		<el-tab-pane label="Add Folder to Backup" name="newPath">
			<backup-new-vue @created="e => added(e)" />
		</el-tab-pane>
		<el-tab-pane label="Prune Settings" name="pruneSettings">
			<prune-settings-vue :profile="profile" @save="updatePruneSettings" />
		</el-tab-pane>
		<el-tab-pane label="Exclude Settings" name="excludeSettings">
			<exclude-settings-vue :profile="profile" @save="updateExcludeSettings" />
		</el-tab-pane>
		<el-tab-pane label="Unlock" name="unlock">
			<el-alert type="info" show-icon :closable="false">
				Sometimes the repository will not be closed properly and you get an error saying it is locked.
				<br/>If that happens, you can manually send the unlock command here.
			</el-alert>
			<el-button @click="unlock" variant="notice">Unlock</el-button>
		</el-tab-pane>
	</el-tabs>
</el-card>
	
</template>
