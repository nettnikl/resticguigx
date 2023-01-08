import child_process from 'child_process'
import os from 'node:os';
import { promises as FS } from 'node:fs';
import decompress from 'decompress';
import Path from 'node:path'
import decompressBz2 from 'decompress-bzip2'
import util from 'node:util';
const exec = util.promisify(child_process.exec);

const binPath = Path.join(process.cwd(), 'data', 'bin', 'restic');

const version = '0.14.0'
async function downloadRelease() {
	const arch = os.arch() === 'x64' ? 'amd64' : 'arm64';
	const platform = os.platform();
	let exists = false;
	let tmpFile = Path.join(os.tmpdir(), 'restic.tmp.bz2');
	try {
		await FS.stat(tmpFile)
		exists = true;
	} catch (e: any) {
		if (e.code !== 'ENOENT') throw e;
	}
	if (!exists) {
		const url = `https://github.com/restic/restic/releases/download/v${version}/restic_${version}_${platform}_${arch}.bz2`
		// console.log('downloading ', url);
		let res = await fetch(url);
		let raw = await res.arrayBuffer();
		await FS.writeFile(tmpFile, Buffer.from(raw))
	}
	return tmpFile;
	
}
async function unpackRelease(tmpFile: string) {
	// console.log('unpacking', tmpFile)
	let basePath = Path.basename(binPath);
	let files = await decompress(tmpFile, basePath, {
		plugins: [
			decompressBz2({ path: 'restic' })
		],
		map: file => file
	})
	if (!files.length) throw new Error('no files extracted')
	let exists = await checkIfBinExists();
	if (!exists) throw new Error('bin was not extracted')
}

async function checkIfBinExists() {
	let exists = false;
	try {
		await FS.stat(binPath)
		exists = true;
	} catch (e: any) {
		if (e.code !== 'ENOENT') throw e;
	}
	return exists;
}

async function assertResticBinExists() {
	let exists = await checkIfBinExists();
	if (!exists) {
		let tmpFile = await downloadRelease();
		await unpackRelease(tmpFile)
	}
	await FS.chmod(binPath, 0o744)
}

export default {
	test() {
		return `${os.arch()} - ${os.platform()} - ${os.version()}`
	},
	download: assertResticBinExists,
	runCommand
}
