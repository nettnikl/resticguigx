import { sep } from 'node:path';

export function resizePath(path: string, maxLength: number): string {
	if (path.length <= maxLength) return path;
	let parts = path.split(sep);
	let cut = '';
	for (let i=1; i<parts.length; i++) {
		if (parts[i].length > 1) {
			parts[i] = parts[i][0];
			cut = parts.join(sep);
			if (cut.length <= maxLength) {
				return cut;
			}
		}
	}
	cut = parts[parts.length-1];
	return cut.substring(0, maxLength);
}
