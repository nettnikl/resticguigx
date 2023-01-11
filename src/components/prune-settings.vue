<script lang="ts">
import { ElFormItem, ElInput, ElButton } from 'element-plus';
import { defineComponent } from 'vue';
import UserProfile, { BackupInfo, PruneSettings } from '../service/model/profile';
import * as Repo from '../service/repo'

export default defineComponent({
	name: 'PruneSettings',

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
			keepLast: 0,
			keepHourly: 0,
			keepDaily: 0,
			keepWeekly: 0,
			keepMonthly: 0
		} as PruneSettings,
		previewResult: [] as Repo.ForgetResultOne[],
		working: false,
		error: '',
	}),

	async created() {
		let s = this.profile.pruneSettings || {}
		this.settings.keepLast = s.keepLast || 0
		this.settings.keepHourly = s.keepHourly || 0
		this.settings.keepDaily = s.keepDaily || 0
		this.settings.keepWeekly = s.keepWeekly || 0
		this.settings.keepMonthly = s.keepMonthly || 0
	},

	methods: {
		async preview() {
			let out = await Repo.forget(this.profile, this.settings, true);
			console.log(out);
			this.previewResult = out;
		},

		save() {
			this.$emit('save', JSON.parse(JSON.stringify(this.settings)))
		}
	}

	
})
</script>

<template>
	<el-form-item label="Keep Latest">
		<el-input v-model="settings.keepLast" type="number" number step="1" />
	</el-form-item>
	<el-form-item label="Keep Hourly">
		<el-input v-model="settings.keepHourly" type="number" number step="1" />
	</el-form-item>
	<el-form-item label="Keep Daily">
		<el-input v-model="settings.keepDaily" type="number" number step="1" />
	</el-form-item>
	<el-form-item label="Keep Weekly">
		<el-input v-model="settings.keepWeekly" type="number" number step="1" />
	</el-form-item>
	<el-form-item label="Keep Monthly">
		<el-input v-model="settings.keepMonthly" type="number" number step="1" />
	</el-form-item>
	<el-button @click="preview">Preview</el-button>
	<el-button @click="save">Save</el-button>
	<el-card
		v-for="group of previewResult"
		:key="group.paths[0]"
		style="text-align: left; margin-bottom: 12px"
		shadow="never"
	>
		<template #header>{{ group.paths[0] }}</template>
		<div v-show="group.keep">
			<strong>Keep</strong>
			<ul>
				<li v-for="snap of group.keep" :key="snap.id">
					{{ $filters.dateTime(snap.time) }}
				</li>
			</ul>
		</div>
		<div v-show="group.remove">
			<strong>Remove</strong>
			<ul>
				<li v-for="snap of group.remove" :key="snap.id">
					{{ $filters.dateTime(snap.time) }}
				</li>
			</ul>
		</div>
	</el-card>
</template>
