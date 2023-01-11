<script lang="ts">
import { defineComponent } from 'vue';
import profileListVue from '../components/profile-list.vue';

export default defineComponent({
	name: 'HomeView',

	components: {
		profileListVue
	},

	methods: {
		onSelect(profileName: string) {
			this.$router.push({
				name: 'profile',
				params: { name: profileName }
			})
		}
	}
	
})
</script>

<template>
	<h1>Restic Backup</h1>
	<h2>Select a Profile</h2>
	<profile-list-vue @select="onSelect" />
</template>
