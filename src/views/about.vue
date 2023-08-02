<script lang="ts">
import { defineComponent } from 'vue';
import { getBinFile } from '../service/repo';

export default defineComponent({
	name: 'AboutPage',

	computed: {
		binName() {
			return getBinFile();
		}
	}

	
})
</script>

<template>
	<h1>Restic Backup</h1>
	<p>{{ binName }}</p>
	<el-card style="width: 600px; margin: 2rem auto">
		<template #header>
			<h2>Restic</h2>
		</template>
		<ul style="text-align: left;">
			<li>Website: <a href="https://restic.net/">https://restic.net/</a></li>
			<li>Documentation: <a href="https://restic.readthedocs.io/en/stable/">https://restic.readthedocs.io/en/stable/</a></li>
			<li>Source: <a href="https://github.com/restic/restic">https://github.com/restic/restic</a></li>
		</ul>
	</el-card>

	<el-card style="width: 600px; margin: 0 auto">
		<template #header>
			<h2>UI</h2>
		</template>
		<ul style="text-align: left;">
			<li>Source: <a href="https://gitlab.com/stormking/resticguigx">https://gitlab.com/stormking/resticguigx</a></li>
			<li>Updates and Releases: <a href="https://gitlab.com/stormking/resticguigx/-/releases">https://gitlab.com/stormking/resticguigx/-/releases</a></li>
		</ul>
	</el-card>
	
	
	
	
</template>
