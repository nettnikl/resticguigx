<script lang="ts">
import { defineComponent } from 'vue';
import UserProfile from '../service/model/profile';
import { selectDirectory } from '../service/node-api';
import * as Repo from '../service/repo';
import Path from 'node:path'
import { openFolder } from '../service/node-api'
import os from 'node:os';


export default defineComponent({
	name: 'RestoreOptions',

	components: {
	},

	props: {
		profile: {
			type: UserProfile,
			required: true
		},
		path: {
			type: String,
			required: true
		}
	},

	data: () => ({
		open: false,
		working: false,
		mounted: false,
		targetType: '',
		targetPath: '',
		error: '',
		message: ''
	}),

	computed: {
		
	},

	watch: {
		targetType(nv) {
			if (nv === 'temp') {
				this.targetPath = Path.join(os.tmpdir(), 'restic-restore');
			} else if (nv === 'orig') {
				this.targetPath = this.path
			} else if (nv === 'select') {
				selectDirectory().then(res => {
					if (!res || res.canceled) this.targetType = ''
					else this.targetPath = res.filePaths[0];
				}).catch(() => {
					this.targetType = ''
				})
			}
		}
	},

	methods: {
		async startMount() {
			this.working = true;
			await Repo.mount(this.profile, this.path);
			this.mounted = true;
			this.working = false;
			console.log('mountprocess', this);
		},
		async stopMount() {
			this.working = true;
			await Repo.unmount();
			this.mounted = false;
			this.working = false;
		},
		async runRestore() {
			this.working = true;
			try {
				let target = this.targetPath === this.path ? this.getRoot(this.path) : this.targetPath;
				let process = await Repo.restore(this.profile, this.path, target);
				process?.getStdOut()?.on('data', (chk) => {
					this.message += chk.toString('utf-8');
				})
				process?.getStdErr()?.on('data', (chk) => {
					this.error += chk.toString('utf8');
				})
				await process.waitForFinish();
				let fullPath = this.targetPath === this.path ? this.path : Path.join(this.targetPath, this.path.substring(1))
				await openFolder(fullPath);
			} catch (e) {
				console.error(e)
			}
			this.working = false;
		},
		getRoot(path: string) {
			let base = Path.dirname(path);
			if (base.length < path.length) {
				return this.getRoot(base);
			} else {
				return base;
			}
		}
	}

	
})
</script>

<template>
	<el-button @click="open=true">Restore Options</el-button>
	<el-dialog v-model="open" style="text-align: left">
		<h2>Restore Options</h2>
		<p>{{ path }}</p>
		<div v-loading="working">
			<h3>Option 1: Pick through the files</h3>
			<p>Mount the files into a temporary folder from where you can copy them yourself</p>
			<el-button v-show="!mounted"
				@click="startMount()"
			> Mount </el-button>
			<el-button v-show="mounted"
				@click="stopMount()"
			> Unmount </el-button>
			<h3>Option 2: Restore to Folder</h3>
			<p>Extract the files to a folder:</p>
			<el-form-item label="Target">
				<el-radio-group v-model="targetType">
					<el-radio label="temp">Temporary Folder</el-radio>
					<el-radio label="select" >Select a Folder</el-radio>
					<el-radio label="orig">Original Path</el-radio>
				</el-radio-group>
				<el-input v-model="targetPath" />
				<el-alert type="info" show-icon :closable="false">
					Warning: if the folder already exists, the new files will be added to it. 
					<br />Existing files will be replaced.
					<br />Files that do not exist in the backup will not be deleted.
				</el-alert>
			</el-form-item>
			<el-button :disabled="working || !targetPath"
				@click="runRestore"
			> Start Restore </el-button>

			<el-alert :title="error" type="error" v-if="error" />
			<el-alert :title="message" type="success" v-if="message" />
		</div>
	</el-dialog>
	
</template>