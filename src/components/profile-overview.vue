<script lang="ts">
import { defineComponent } from 'vue';
import UserProfile from '../service/model/profile';
import { loadProfile } from '../service/user-storage'

export default defineComponent({
	name: 'ProfileOverview',

	components: {
	},

	props: {
		profileName: {
			type: String,
			required: true
		}
	},

	emits: ['select'],

	data: () => ({
		data: new UserProfile(''),
		newName: ''
	}),

	computed: {
		
	},

	async created() {
		this.data = await loadProfile(this.profileName)
	},
	methods: {
		
	}

	
})
</script>

<template>
	<pre>{{ data }}</pre>
</template>
