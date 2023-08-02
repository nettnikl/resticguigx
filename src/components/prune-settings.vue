<script lang="ts">
import { ElFormItem, ElButton } from 'element-plus';
import { defineComponent } from 'vue';
import UserProfile, { PruneSettings } from '../service/model/profile';
import * as Repo from '../service/repo'
import type { ForgetResultOne } from '../service/types'

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
		previewResult: [] as ForgetResultOne[],
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
			let out = await Repo.forget(this.profile, this.settings, true, this.profile.backupDirs);
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
	<el-alert type="info" show-icon :closable="false" style="margin-bottom: 2em;">
		Restic will keep several versions of your data.
		Here you can define how many will be kept at most when you run a cleanup.
	</el-alert>
	<el-form-item label="Keep Latest">
		<el-input-number v-model="settings.keepLast" :strict-step="true" :step="1" />
	</el-form-item>
	<el-form-item label="Keep Hourly">
		<el-input-number v-model="settings.keepHourly" :strict-step="true" :step="1" />
	</el-form-item>
	<el-form-item label="Keep Daily">
		<el-input-number v-model="settings.keepDaily" :strict-step="true" :step="1" />
	</el-form-item>
	<el-form-item label="Keep Weekly">
		<el-input-number v-model="settings.keepWeekly" :strict-step="true" :step="1" />
	</el-form-item>
	<el-form-item label="Keep Monthly">
		<el-input-number v-model="settings.keepMonthly" :strict-step="true" :step="1" />
	</el-form-item>
	<el-button @click="preview" icon="ZoomIn">Preview</el-button>
	<el-button @click="save" icon="CircleCheckFilled" type="primary">Save</el-button>
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
