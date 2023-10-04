<script lang="ts">
import { defineComponent } from 'vue';
import profileOverviewVue from '../components/profile-overview.vue';
import UserProfile from '../service/model/profile';
import { loadProfile } from '../service/user-storage';
import * as Repo from '../service/repo'
import {selectDirectory, selectFile} from "../service/node-api";

export default defineComponent({
	name: 'ProfileView',

	components: {
		profileOverviewVue
	},

	data: () => ({
		profile: null as UserProfile|null,
		error: '',
		password: '',
		pwFile: '',
		canAccess: false,
		working: false
	}),

	computed: {
		profileName(): string {
			let raw = this.$route.params.name;
			if (Array.isArray(raw)) return raw[0]
			return raw;
		},
		canShow() {
			return this.profile && this.profile.hasSecret() && this.canAccess
		},
		showPasswordInput() {
			return !this.profile?.hasSecret()
				&& this.profile?.passwordStrategy === UserProfile.PW_STRAT_ASK
		}
	},

	async created() {
		try {
			this.profile = await loadProfile(this.profileName)
			if (this.profile.hasSecret()) {
				await this.tryLoadRepo();
			}
		} catch(e: any) {
			this.error = e.message
		}
		
	},

	methods: {
		async savePassword() {
			await this.tryLoadRepo();
			if (this.canAccess) {
				this.profile!.setSecret(this.password);
				this.profile!.pwFile = this.pwFile;
				this.password = '';
			}
		},
		async selectPwFile() {
			let res = await selectFile();
			if (res.canceled) return;
			this.pwFile = res.filePaths[0];
			console.log('select result', res);
		},
		async tryLoadRepo() {
			let profile: UserProfile = this.profile!;
			profile._tempSecret = this.password;
			let repo = profile.repoPath;
			let authEnv = this.profile?.getRepoAuthEnv();
			let env = profile.getRepoEnv();
			if (!repo || !profile) return false;
			this.working = true;
			try {
				let res = await Repo.getSnapshots(repo, profile.repoParams, env, authEnv);
				// await this.profile!.setPathsFromSnapshots(res)
				this.canAccess = true;
			} catch (e: any) {
				this.canAccess = false;
				if (e.message.includes("Fatal: wrong password or no key found")){
					this.error = 'Wrong password!'
				} else {
					this.error = 'Unable to load repo at "' + this.profile!.getRepoPath() + '" with given password because: ' + e.message
				}
			} finally {
				this.working = false;
			}
		}
	}
	
})
</script>

<template>
	<h2>Profile: {{ profileName }}</h2>
	<el-alert :title="error" type="error" v-if="error" />
	<el-card
		v-show="!showPasswordInput && !canAccess && working"
		v-loading="working"
	>
		<p>Loading...</p>
	</el-card>
	<el-card
		v-if="showPasswordInput"
		v-loading="working"
		style="width: 400px; margin: 3rem auto;"
	>
		<el-form-item label="Repo Password">
			<el-input type="password"
				show-password
				v-model="password"
				style="width: 220px"
			/>
		</el-form-item>
		<el-form-item label="Repo Password File">
			<el-button @click="selectPwFile" >Select a file containing the repository password</el-button>
			<el-alert :title="'Selected: '+pwFile" type="success" />
		</el-form-item>
		<el-button @click="savePassword">Okay</el-button>
	</el-card>
	<profile-overview-vue v-if="canShow" :profile="profile!" />
</template>
