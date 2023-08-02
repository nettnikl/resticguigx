<script lang="ts">
import { ElFormItem, ElInput, ElButton } from 'element-plus';
import { defineComponent } from 'vue';
import UserProfile, { BackupSettings, ExcludeSettings } from '../service/model/profile';

export default defineComponent({
	name: 'GeneralSettings',

	components: {
	},

	props: {
		profile: {
			type: UserProfile,
			required: true
		}
	},

	emits: ['save'],

	data: () => ({
		settings: {
			ignoreCtime: false,
			ignoreInode: false,
		} as BackupSettings,
		working: false,
		error: '',
	}),

	async created() {
		let s = this.profile.backupSettings || {}
		this.settings.ignoreCtime = s.ignoreCtime || false
		this.settings.ignoreInode = s.ignoreInode || false
	},

	methods: {
		
		save() {
			let copy: BackupSettings = JSON.parse(JSON.stringify(this.settings));
			this.$emit('save', copy)
		}
	}

	
})
</script>

<template>
	<h3>Backup Settings</h3>
	<h4>File Change Detection</h4>
	<el-checkbox v-model="settings.ignoreCtime" label="Ignore changed metadata timestamp (ctime)" />
	<el-checkbox v-model="settings.ignoreInode" label="Ignore changed inode number" />
	
	<el-button @click="save" icon="CircleCheckFilled" type="primary">Save</el-button>

	<el-alert type="info" show-icon :closable="false" style="margin-top: 1em;">
		<p>For more info see <a href="https://restic.readthedocs.io/en/stable/040_backup.html#file-change-detection">restic docs</a></p>
	</el-alert>
</template>
