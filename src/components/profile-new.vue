<script lang="ts">
import { defineComponent } from 'vue';
import * as Repo from '../service/repo';
import { createProfile, saveProfile } from '../service/user-storage'
import { selectDirectory } from '../service/node-api'

export default defineComponent({
	name: 'ProfilNew',

	emits: ['created'],

	data: () => ({
		newName: '',
		repoSelect: '',
		repoType: 'local',
		repoRaw: '',
		password: '',
		passStrat: 'ask',
		working: false,
		error: ''
	}),

	computed: {
		canCreate() {
			return (this.repoSelect || this.repoRaw) && this.password && this.newName && !this.working
		}
	},

	methods: {
		async create() {
			this.working = true;
			try {
				let repoDir = this.repoRaw;
				if (this.repoType === 'local') {
					repoDir = this.repoSelect;
				}
				await Repo.assertRepoExists(repoDir, this.password);
				let model = await createProfile(this.newName);
				model.repoPath = repoDir;
				model.passwordStrategy = this.passStrat;
				if (model.passwordStrategy === 'profile') {
					model.setStoredSecret( this.password )
				}
				model.pruneSettings = {
					keepMonthly: 6
				}
				await saveProfile(model)
				this.$emit('created', this.newName);
				this.newName = '';
				this.password = '';
			} catch (e: any) {
				console.error(e)
				this.error = e.message
			}
			this.working = false;
		},
		async selectDir() {
			let res = await selectDirectory();
			if (res.canceled) return;
			this.repoSelect = res.filePaths[0];
			console.log('select result', res);
		}
	}

	
})
</script>

<template>
	<el-form label-width="200px">
		<el-form-item label="New Profile">
			<el-input v-model="newName" placeholder="Name" />
		</el-form-item>
		<el-form-item label="Repo Type">
			<el-radio-group v-model="repoType">
				<el-radio label="local" size="large">Local</el-radio>
				<el-radio label="sftp" size="large" disabled>SFTP</el-radio>
				<el-radio label="rest" size="large" disabled>Rest</el-radio>
				<el-radio label="s3" size="large" disabled>S3</el-radio>
			</el-radio-group>
		</el-form-item>
		<el-form-item label="Repository Target">
			<el-button @click="selectDir" v-show="repoType === 'local'">Select Empty Folder</el-button>
			<el-alert :title="'Selected: '+repoSelect" type="success" v-show="repoSelect.length > 0" />
			<el-input v-model="repoRaw" v-show="repoType === 'sftp'" />
		</el-form-item>
		<el-form-item label="Password">
			<el-input type="password" v-model="password" />
			<el-alert type="info" show-icon :closable="false">
				Without this password, all data will be lost
			</el-alert>
		</el-form-item>
		<el-form-item label="Password Strategy">
			<el-radio-group v-model="passStrat">
				<el-radio label="ask" size="large">Ask everytime</el-radio>
				<el-radio label="profile" size="large">Store in Profile</el-radio>
			</el-radio-group>
		</el-form-item>
		<el-button @click="create" :disabled="!canCreate" v-loading="working">
			Create
		</el-button>
		<el-alert :title="error" v-show="error.length" type="error" />
	</el-form>
</template>
