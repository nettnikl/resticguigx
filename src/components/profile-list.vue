<script lang="ts">
import { defineComponent } from 'vue';
import { listProfiles, createProfile, deleteProfile } from '../service/user-storage'

export default defineComponent({
	name: 'ProfileList',

	components: {
	},

	props: {
		
	},

	emits: ['select'],

	data: () => ({
		list: [] as string[],
		newName: ''
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
			await deleteProfile(name);
		},
		async create() {
			await createProfile(this.newName);
			this.$emit('select', this.newName);
			this.newName = '';
		}
	}

	
})
</script>

<template>
	<el-form-item label="New Profile">
		<el-input v-model="newName" style="width: 120px" placeholder="Name" />
		<el-button @click="create" plain >Create</el-button>
	</el-form-item>
	<el-card
		v-for="name of list"
		:key="name"
	>
		<h2>{{ name }}</h2>
		<el-button @click="select(name)" plain type="primary">
			Select
		</el-button>
		<el-button @click="remove(name)" plain type="danger">
			Delete
		</el-button>
	</el-card>
</template>
