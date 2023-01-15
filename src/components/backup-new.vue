<script lang="ts">
import { defineComponent } from 'vue';
import { selectDirectory } from '../service/node-api'

export default defineComponent({
	name: 'PathSelect',

	emits: ['created'],

	data: () => ({
	}),

	computed: {
	},

	methods: {
		async selectDir() {
			let res = await selectDirectory(true);
			if (res.canceled) return;
			for (let path of res.filePaths) {
				this.$emit('created', path);
			}
		}
	}

	
})
</script>

<template>
	<p>Select new folders to back up</p>
	<el-button @click="selectDir" type="primary" icon="CirclePlusFilled">Select Folder</el-button>
</template>
