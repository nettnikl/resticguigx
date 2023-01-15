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
			let res = await selectDirectory();
			if (res.canceled) return;
			let path = res.filePaths[0];
			if (!path) return;
			this.$emit('created', path);
		}
	}

	
})
</script>

<template>
	<el-button @click="selectDir" type="primary" icon="CirclePlusFilled">Select Folder</el-button>
</template>
