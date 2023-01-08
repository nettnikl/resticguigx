<script lang="ts">
import { defineComponent } from 'vue';
import profileOverviewVue from '../components/profile-overview.vue';

export default defineComponent({
	name: 'ProfileView',

	components: {
		profileOverviewVue
	},

	computed: {
		profileName(): string {
			let raw = this.$route.params.name;
			if (Array.isArray(raw)) return raw[0]
			return raw;
		}
	},

	methods: {
		
	}
	
})
</script>

<template>
	<h1>Profile: {{ profileName }}</h1>
	<profile-overview-vue v-if="profileName" :profile-name="profileName" />
</template>
