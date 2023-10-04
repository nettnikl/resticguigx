<script lang="ts">
import { defineComponent } from 'vue';
import * as Repo from '../service/repo';
import { createProfile, saveProfile } from '../service/user-storage'
import {selectDirectory, selectFile} from '../service/node-api'
import UserProfile, { BackupInfo } from '../service/model/profile';
import backupNewVue from './backup-new.vue';

export default defineComponent({
	name: 'ProfilNew',

	components: {
		backupNewVue
	},

	emits: ['created'],

	data: () => ({
		formData: {
			newName: '',
			repoSelect: '',
			repoType: 'default',
			repoRaw: '',
			repoEnv: '',
			backupDirs: [] as BackupInfo[],
			password: '',
			pwFile: '',
			passStrat: UserProfile.PW_STRAT_ASK
		},
		newSources: [] as string[],
		passSrc: '',
		working: false,
		error: '',
		formRules: {
			newName: [
				{
					required: true,
					message: 'A profile name is required'
				}, {
					min: 1,
					max: 64,
					message: 'Must have between 1 and 64 characters'
				}, {
					validator: (r, val) => !!`${val}`.match(/^[a-z0-9 -_]+$/),
					message: 'must only have lowercase characters, numbers, spaces, dashes, or underscores'
				}
			]
		}
	}),

	computed: {
		canCreate() {
			return (this.formData.repoSelect || this.formData.repoRaw) &&
				(this.passSrc === '' && this.formData.password || this.passSrc === 'file' && this.formData.pwFile) &&
				this.formData.newName &&
				!this.working
		}
	},

	methods: {
		async create() {
			this.working = true;
			try {
				let form: any = this.$refs.form;
				if (!form) return;
				let res = await form.validate();
				if (!res) return;

				let repoDir = '';
				let repoEnv = {};
				if (this.formData.repoType === 'default') {
					repoDir = this.formData.repoSelect;
				} else {
					repoDir = this.formData.repoRaw;
					repoEnv = this.getEnvFromText(this.formData.repoEnv);
				}
				let snapshots = await Repo.assertRepoExists(repoDir, repoEnv, {
					RESTIC_PASSWORD: this.formData.password,
					RESTIC_PASSWORD_FILE: this.formData.pwFile,
					RUSTIC_PASSWORD: this.formData.password,
					RUSTIC_PASSWORD_FILE: this.formData.pwFile,
				});
				let model = await createProfile(this.formData.newName);
				model.repoPath = repoDir;
				model.passwordStrategy = this.formData.passStrat;
				model.setSecret(this.formData.password);
				model.repoEnv = repoEnv;
				model.backupDirs = this.formData.backupDirs;
				await model.setPathsFromSnapshots(snapshots);
				model.pruneSettings = {
					keepMonthly: 6
				}
				await saveProfile(model)
				this.$emit('created', this.formData.newName);
				this.formData.newName = '';
				this.formData.password = '';
			} catch (e: any) {
				console.error(e)
				this.error = e.message
			}
			this.working = false;
		},
		async selectDir() {
			let res = await selectDirectory();
			if (res.canceled) return;
			this.formData.repoSelect = res.filePaths[0];
			console.log('select result', res);
		},
		getEnvFromText(text: string) {
			let lines = text.split('\n');
			let r = {};
			for (let line of lines) {
				let [key, value] = line.split('=')
				if (key && value) {
					r[key] = value
				}
			}
			return r;
		},
		added(path: string) {
			let exists = this.formData.backupDirs.find(e => e.path === path);
			if (exists) {
				return;
			} else {
				this.formData.backupDirs.push({ path })
			}
		},
		addSourceDir() {
			for (let path of this.newSources) {
				this.added(path);
			}
			this.newSources = []
		},
		async selectSourceDir() {
			let res = await selectDirectory(true);
			if (res.canceled) return;
			this.newSources = res.filePaths;
		},
		async selectPwFile() {
			let res = await selectFile();
			if (res.canceled) return;
			this.formData.pwFile = res.filePaths[0];
			console.log('select result', res);
		},
	}

	
})
</script>

<template>
	<el-form 
		label-width="200px"
		:rules="formRules"
		:model="formData"
		ref="form"
	>
		<el-form-item label="Profile Name" prop="newName">
			<el-input v-model="formData.newName" placeholder="Name" />
		</el-form-item>
		<el-form-item label="Sources">
			<el-input
				:model-value="newSources.join(';')"
				@update:model-value="newValue => newSources = newValue.split(';')">
				<template #append>
					<el-button @click="selectSourceDir">
						Select Folder
					</el-button>
				</template>
				<template #prepend>
					<el-button
						@click="addSourceDir"
						icon="CirclePlusFilled">
					</el-button>
				</template>
			</el-input>
			<el-alert
				:title="backupDir.path"
				type="success"
				@close="formData.backupDirs.splice(index, 1)"
				truncated
				v-for="(backupDir, index) in formData.backupDirs"
			>
			</el-alert>
			<el-alert type="info" show-icon :closable="false">
				{{ formData.backupDirs.length }} folders selected. You can add more later.
			</el-alert>
		</el-form-item>
		<el-form-item label="Encryption Password">
			<el-radio-group v-model="passSrc">
				<el-radio label="" size="large">With password (Default)</el-radio>
				<el-radio label="file" size="large">With password file</el-radio>
			</el-radio-group>
			<el-input
				type="password"
				v-model="formData.password"
				v-if="passSrc === ''"
				placeholder="***"
				show-password
			/>
			<el-input
				v-model="formData.pwFile"
				v-if="passSrc === 'file'"
				placeholder="/etc/backup-password.txt"
			>
				<template #append>
					<el-button
						@click="selectPwFile"
						v-if="passSrc === 'file'">
						Browse...
					</el-button>
				</template>
			</el-input>
			<el-alert type="info" show-icon :closable="false">
				Without this password, all data will be lost
			</el-alert>
		</el-form-item>
		<el-form-item label="Password Strategy" v-if="passSrc === ''">
			<el-radio-group v-model="formData.passStrat">
				<el-radio label="ask" size="large">Ask everytime</el-radio>
				<el-radio label="profile" size="large">Store in Profile</el-radio>
			</el-radio-group>
		</el-form-item>
		<el-form-item label="Password Strategy" v-if="passSrc === 'file'">
			<el-radio-group model-value="profile">
				<el-radio label="ask" size="large" disabled>Ask everytime</el-radio>
				<el-radio label="profile" size="large" >Store in Profile</el-radio>
			</el-radio-group>
		</el-form-item>
		<el-divider></el-divider>
		<el-form-item label="Repository Type">
			<el-select v-model="formData.repoType">
				<el-option label="Default" value="default">
					<em>Select a folder on your PC or external hard-drive</em>
				</el-option>
				<el-option label="Expert" value="expert">
					<em>Manually input target URI and ENV-variables</em>
				</el-option>
			</el-select>
			<el-alert type="info" show-icon :closable="false" v-show="formData.repoType==='expert'">
				For full information on advanced repository options, see <a href="https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html">the restic docs</a>
			</el-alert>
		</el-form-item>
		<el-form-item label="Repository Target" v-show="formData.repoType === 'default'">
			<el-button @click="selectDir" >Select an empty Folder or existing repository</el-button>
			<el-alert
				:title="'Selected: '+formData.repoSelect"
				type="success"
				v-show="formData.repoSelect.length > 0"
				@close="formData.repoSelect = '';"
			/>
		</el-form-item>
		<el-form-item label="Repository URL" v-show="formData.repoType === 'expert'">
			<el-input v-model="formData.repoRaw" placeholder="rest:https://example.org:8000/"  />
		</el-form-item>
		<el-form-item label="Repository ENV Vars" v-show="formData.repoType === 'expert'">
			<el-input v-model="formData.repoEnv" type="textarea" cols="50" rows="2" placeholder="AWS_ACCESS_KEY_ID=..."  />
			<el-alert type="info" show-icon :closable="false">
				One variable per line. Vars are also inherited from the GUI.
			</el-alert>
		</el-form-item>
		<el-divider></el-divider>
		<el-button @click="create" :disabled="!canCreate" v-loading="working">
			Create
		</el-button>
		<el-alert :title="error" v-show="error.length" type="error" />
	</el-form>
</template>
