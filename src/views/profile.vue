<script lang="ts">
import { defineComponent } from 'vue';
import profileOverviewVue from '../components/profile-overview.vue';
import UserProfile from '../service/model/profile';
import { loadProfile } from '../service/user-storage';
import * as Repo from '../service/repo'

export default defineComponent({
	name: 'ProfileView',

	components: {
		profileOverviewVue
	},

	data: () => ({
		profile: null as UserProfile|null,
		error: '',
		password: '',
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
				this.password = '';
			}
		},
		async tryLoadRepo() {
			let profile: UserProfile = this.profile!;
			let pw = this.password || profile.getSecret()
			let repo = profile.repoPath;
			let env = profile.getRepoEnv();
			if (!pw || !repo || !profile) return false;
			this.working = true;
			try {
				let res = await Repo.getSnapshots(repo, pw, env);
				// await this.profile!.setPathsFromSnapshots(res)
				this.canAccess = true;
			} catch (e) {
				this.canAccess = false;
				this.error = 'unable to load repo at "'+this.profile!.getRepoPath()+'" with given password'
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
		<el-button @click="savePassword">Okay</el-button>
	</el-card>
	<profile-overview-vue v-if="canShow" :profile="profile!" />
</template>
