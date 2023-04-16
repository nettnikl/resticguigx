<script lang="ts">
import { ElFormItem, ElInput, ElButton } from 'element-plus';
import { defineComponent } from 'vue';
import UserProfile, { ExcludeSettings } from '../service/model/profile';
import * as Repo from '../service/repo'

export default defineComponent({
	name: 'ExcludeSettings',

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
			paths: [] as string[],
			largerThanSize: 0,
			largerThanType: ''
		} as ExcludeSettings,
		working: false,
		error: '',
	}),

	async created() {
		let s = this.profile.excludeSettings || {}
		this.settings.paths = s.paths ? s.paths.slice(0) : []
		this.settings.largerThanSize = s.largerThanSize || 0
		this.settings.largerThanType = s.largerThanType || 'gb'
		if (this.settings.paths.length === 0) {
			this.settings.paths.push('')
		}
	},

	methods: {
		
		onBlur(i: number) {
			let val = this.settings.paths[i];
			if (val && val.length) {
				if (i === this.settings.paths.length - 1) {
					this.settings.paths.push('')
				}
			} else {
				if (i < this.settings.paths.length - 1) {
					this.settings.paths.splice(i, 1)
				}
			}
		},
		remove(i: number) {
			this.settings.paths.splice(i, 1)
		},
		add() {
			this.settings.paths.push('')
		},
		save() {
			let copy: ExcludeSettings = JSON.parse(JSON.stringify(this.settings));
			copy.paths = copy.paths.filter(e => e.trim().length > 0)
			this.$emit('save', copy)
		}
	}

	
})
</script>

<template>
	<h3>Exclude by Path</h3>
	<p>These folder and file names will not be included in future backups.</p>
	<el-form-item label="Path" v-for="(path, i) of settings.paths">
		<el-input v-model="settings.paths[i]">
			<template #append>
				<el-button @click="remove(i)" icon="RemoveFilled" />
			</template>
		</el-input>
	</el-form-item>
	<el-button @click="add" icon="CirclePlusFilled">Add Path</el-button>
	<el-alert type="info" show-icon :closable="false">
		<ul>
			<li>Can match partial names by using * (e.g. "Videos*")</li>
			<li>Can match folder structures with ** (e.g. "Music/**/temp")</li>
			<li>Names are not case-sensitive</li>
			<li>System cache directories will be excluded automatically.</li>
		</ul>
	</el-alert>
	<h3>Exclude by Size</h3>
	<el-form-item label="Exclude Files larger than Size">
		<el-input v-model="settings.largerThanSize" number type="number">
			<template #append>
				<el-select v-model="settings.largerThanType">
					<el-option value="G" label="GigaByte" />
					<el-option value="M" label="MegaByte" />
					<el-option value="K" label="KiloByte" />
				</el-select>
			</template>
		</el-input>
	</el-form-item>
	<el-button @click="save" icon="CircleCheckFilled" type="primary">Save</el-button>
	<el-alert type="info" show-icon :closable="false" style="margin-top: 1em;">
		<p>For more info see <a href="https://restic.readthedocs.io/en/stable/040_backup.html#excluding-files">restic docs</a></p>
	</el-alert>
</template>
