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
			this.error += e.message
		}
		
	},

	methods: {
		async savePassword() {
			let okay = await this.tryLoadRepo();
			if (okay) {
				this.profile!.setSecret(this.password);
				this.password = '';
			} else {
				this.error = 'unable to load repo at "'+this.profile!.repoPath+'" with given password'
			}
		},
		async tryLoadRepo(): Promise<boolean> {
			let profile: UserProfile = this.profile!;
			let pw = this.password || profile.getSecret()
			let repo = profile.repoPath;
			if (!pw || !repo || !profile) return false;
			this.working = true;
			try {
				let res = await Repo.getSnapshots(repo, pw)
				await this.profile!.setPathsFromSnapshots(res)
				this.canAccess = true;
				return true;
			} catch (e) {
				return false;
			} finally {
				this.working = false;
			}
		}
	}
	
})
</script>

<template>
	<h2>Profile: {{ profileName }}</h2>
	<p>
		<RouterLink to="/">Profile List</RouterLink>
	</p>
	<el-card
		v-show="!showPasswordInput && !canAccess"
		v-loading="working"
	>
		<p>Loading...</p>
	</el-card>
	<el-card
		v-if="showPasswordInput"
		v-loading="working"
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
