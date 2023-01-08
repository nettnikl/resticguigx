<script lang="ts">
import { defineComponent } from 'vue';
import { listProfiles, createProfile, deleteProfile } from '../service/user-storage'
import profileNewVue from './profile-new.vue';

export default defineComponent({
	name: 'ProfileList',

	components: {
		profileNewVue
	},

	props: {
		
	},

	emits: ['select'],

	data: () => ({
		list: [] as string[],
		newName: '',
		working: false
	}),

	computed: {
		
	},

	async created() {
		this.list = await listProfiles()
	},
	methods: {
		select(name: string) {
			this.$emit('select', name);
		},
		async remove(name: string) {
			this.working = true;
			await deleteProfile(name);
			this.working = false;
			let idx = this.list.indexOf(name);
			this.list.splice(idx, 1)
		}
	}

	
})
</script>

<template>
	<el-card
		v-for="name of list"
		:key="name"
		v-loading="working"
	>
		<h2>{{ name }}</h2>
		<el-button @click="select(name)" plain type="primary">
			Select
		</el-button>
		<el-button @click="remove(name)" plain type="danger">
			Delete
		</el-button>
	</el-card>
	<el-collapse>
		<el-collapse-item title="New Profile">
			<profile-new-vue @created="e => select(e)" />
		</el-collapse-item>
	</el-collapse>
	
	
</template>
