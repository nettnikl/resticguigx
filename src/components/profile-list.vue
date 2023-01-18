<script lang="ts">
import { defineComponent } from 'vue';
import { listProfiles, createProfile, deleteProfile } from '../service/user-storage'
import profileNewVue from './profile-new.vue';

export default defineComponent({
	name: 'ProfileList',

	components: {
		profileNewVue
	},

	emits: ['select'],

	data: () => ({
		list: [] as string[],
		newName: '',
		collapse: '',
		working: false
	}),

	computed: {
		
	},

	async created() {
		this.list = await listProfiles()
		if (this.list.length === 0) this.collapse = 'new';
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
		style="margin: 1em auto; width: 325px;"
	>
		<h2>{{ name }}</h2>
		<el-button @click="select(name)" plain type="primary">
			Select
		</el-button>
		
		<el-popconfirm 
			title="This will delete the profile but not the repository data. Are you sure?"
			width="225"
			icon-color="#ff0000"
			@confirm="remove(name)"
		>
			<template #reference>
				<el-button plain type="danger">
					Delete
				</el-button>
			</template>
		</el-popconfirm>
	</el-card>
	<el-collapse class="el-card" style="padding: 0 2rem;" v-model="collapse">
		<el-collapse-item title="New Profile" name="new">
			<profile-new-vue @created="e => select(e)" />
		</el-collapse-item>
	</el-collapse>
	
	
</template>
