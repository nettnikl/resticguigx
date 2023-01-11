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

export default defineComponent({
	name: 'ProfileOverview',

	components: {
		backupNewVue,
		backupProgressVue,
		pruneSettingsVue
	},

	props: {
		profileName: {
			type: String,
			required: true
		}
	},

	data: () => ({
		data: new UserProfile(''),
		loaded: false,
		newName: '',
		working: false,
		error: '',
		accordion: '',
		showProgress: false
	}),

	computed: {
		canPrune() {

		}
	},

	async created() {
		this.data = await loadProfile(this.profileName)
		this.loaded = true;
	},

	methods: {
		async runBackup(info: BackupInfo) {
			this.working = true;
			try {
				this.showProgress = false;
				let process = await Repo.backup(this.data, [info]);
				this.showProgress = true;
				
				await process.waitForFinish();
				let stats = await Repo.stats(this.data.repoPath, this.data.storedSecred)
				this.data.repoStats = stats;
				await this.saveProfile();
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
			this.working = false;
		},
		async added(path: string) {
			this.data.backupDirs.push({ path })
			await this.saveProfile();
		},
		async backupAll() {
			this.working = true;
			try {
				this.showProgress = false;
				let process = await Repo.backup(this.data, this.data.backupDirs);
				this.showProgress = true;
				
				await process.waitForFinish();
				let stats = await Repo.stats(this.data.repoPath, this.data.storedSecred)
				this.data.repoStats = stats;
				await this.saveProfile();
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
			this.working = false;
		},
		async pruneRepository() {
			this.working = true;
			try {
				
				let stats = await Repo.stats(this.data.repoPath, this.data.storedSecred)
				this.data.repoStats = stats;
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
				let stats = await Repo.stats(this.data.repoPath, this.data.storedSecred)
				this.data.repoStats = stats;
				await this.saveProfile();
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
			this.working = false;

		},
		async saveProfile() {
			try {
				await saveProfile(this.data)
			} catch (e: any) {
				this.error = e.message;
				console.error(e);
			}
		},
		async removePath(info: BackupInfo) {
			let idx = this.data.backupDirs.findIndex(e => e === info);
			this.data.backupDirs.splice(idx, 1);
			await this.saveProfile();
			// @TODO await Repo.forgetByTag(info.path)
		},
		filesize(n: number) {
			return filesize(n)
		},
		async updatePruneSettings(s: PruneSettings) {
			this.data.pruneSettings = s;
			await this.saveProfile();
			ElMessage({
				message: 'Settings have been saved',
				type: 'success'
			})
			this.accordion = '';
		},
		async runPrune() {
			this.working = true;
			try {
				let res = await Repo.forget(this.data, this.data.pruneSettings, false)
				console.log('prune complete', res);
				this.data.repoInfo.lastCleanup = new Date().toJSON()
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
	<RouterLink to="/">Back</RouterLink>
	<el-descriptions 
		title="Info" 
		border
		:column="4"
		direction="vertical"
	>
		<el-descriptions-item label="Repository">{{ data.repoPath }}</el-descriptions-item>
		<el-descriptions-item label="Total File Count">{{ data.repoStats.total_file_count }}</el-descriptions-item>
		<el-descriptions-item label="Snapshot Count">{{ data.repoStats.snapshots_count }}</el-descriptions-item>
		<el-descriptions-item label="File Size">{{ filesize(data.repoStats.total_size || 0) }}</el-descriptions-item>
		<el-descriptions-item label="Last Cleanup">{{ data.repoInfo.lastCleanup ? $filters.dateTime(data.repoInfo.lastCleanup) : '-' }}</el-descriptions-item>
	</el-descriptions>
	
	<el-alert type="error" v-show="error.length > 0" :title="error" />
	
	<backup-progress-vue v-if="showProgress" />
	<el-button @click="showProgress = false" v-show="showProgress && !working">Close</el-button>

	<el-button-group>
		<el-button disabled plain>Actions</el-button>
		<el-button @click="backupAll" :disabled="working">Run full Backup</el-button>
		<el-button @click="updateStats" :disabled="working">Update Statistics</el-button>
		<el-button @click="runPrune" :disabled="working">Cleanup Repo</el-button>
	</el-button-group>

	

	<el-collapse accordion v-model="accordion" v-if="loaded" v-loading="working">
		<el-collapse-item title="Paths" name="paths">
			<el-card
				v-for="info of data.backupDirs"
				:key="info.path"
				shadow="never"
			>
				<template #header>
					Path: {{ info.path }}
				</template>
				<el-button @click="runBackup(info)">Backup</el-button>
				<el-button @click="removePath(info)">Remove</el-button>
			</el-card>
		</el-collapse-item>
		<el-collapse-item title="New Backup Path" name="newPath">
			<backup-new-vue @created="e => added(e)" />
		</el-collapse-item>
		<el-collapse-item title="Prune Settings" name="pruneSettings">
			<prune-settings-vue :profile="data" @save="updatePruneSettings" />
		</el-collapse-item>
		<el-collapse-item title="Debug" name="debug">
			<div style="white-space:pre-line">{{ data }}</div>
		</el-collapse-item>
	</el-collapse>
	
</template>
