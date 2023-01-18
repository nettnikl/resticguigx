<script lang="ts">
import { defineComponent } from 'vue';
import * as Repo from '../service/repo';
import { createProfile, saveProfile } from '../service/user-storage'
import { selectDirectory } from '../service/node-api'
import UserProfile from '../service/model/profile';

export default defineComponent({
	name: 'ProfilNew',

	emits: ['created'],

	data: () => ({
		formData: {
			newName: '',
			repoSelect: '',
			repoType: 'local',
			repoRaw: '',
			password: '',
			passStrat: UserProfile.PW_STRAT_ASK
		},
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
			return (this.formData.repoSelect || this.formData.repoRaw) && this.formData.password && this.formData.newName && !this.working
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

				let repoDir = this.formData.repoRaw;
				if (this.formData.repoType === 'local') {
					repoDir = this.formData.repoSelect;
				}
				let snapshots = await Repo.assertRepoExists(repoDir, this.formData.password);
				let model = await createProfile(this.formData.newName);
				model.repoPath = repoDir;
				model.passwordStrategy = this.formData.passStrat;
				model.setSecret(this.formData.password);
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
		}
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
		<el-form-item label="New Profile" prop="newName">
			<el-input v-model="formData.newName" placeholder="Name" />
		</el-form-item>
		<el-form-item label="Repo Type">
			<el-radio-group v-model="formData.repoType">
				<el-radio label="local" size="large">Local</el-radio>
				<el-radio label="sftp" size="large" disabled>SFTP</el-radio>
				<el-radio label="rest" size="large" disabled>Rest</el-radio>
				<el-radio label="s3" size="large" disabled>S3</el-radio>
			</el-radio-group>
		</el-form-item>
		<el-form-item label="Repository Target">
			<el-button @click="selectDir" v-show="formData.repoType === 'local'">Select Empty Folder</el-button>
			<el-alert :title="'Selected: '+formData.repoSelect" type="success" v-show="formData.repoSelect.length > 0" />
			<el-input v-model="formData.repoRaw" v-show="formData.repoType === 'sftp'" />
		</el-form-item>
		<el-form-item label="Password">
			<el-input
				type="password" 
				v-model="formData.password" 
				show-password
			/>
			<el-alert type="info" show-icon :closable="false">
				Without this password, all data will be lost
			</el-alert>
		</el-form-item>
		<el-form-item label="Password Strategy">
			<el-radio-group v-model="formData.passStrat">
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
