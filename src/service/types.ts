
export type StatsResult = {
	"total_size": number,
	"total_file_count": number,
	"snapshots_count": number
}

export type Snapshot = {
	time: string,
	parent?: string,
	tree: string,
	paths: string[],
	hostname: string,
	username: string,
	uid: number,
	gid: number,
	tags: string[],
	id: string,
	short_id?: string, //restic
	original?: string //rustic
}

export type ForgetResultOne = {
	tags: null|string,
	host: string,
	paths: string[],
	keep: Snapshot[],
	remove: null|Snapshot[],
	reasons: {
		snapshot: Snapshot,
		matches: string[],
		counters: {
			last: number
		}
	}[]
}


export type Output = { stdout: string, stderr: string }

export type BackupSummary = {
	"message_type":"summary",
	"files_new": number,
	"files_changed": number,
	"files_unmodified": number,
	"dirs_new": number,
	"dirs_changed": number,
	"dirs_unmodified": number,
	"data_blobs": number,
	"tree_blobs": number,
	"data_added": number,
	"total_files_processed": number,
	"total_bytes_processed": number,
	"total_duration": number,
	"snapshot_id": string
}
export type BackupProcess = {
	"message_type":"status",
	"percent_done": number,
	"current_files": string[],
	"total_files": number,
	"total_bytes": number,
	"seconds_elapsed": number,
	"bytes_done": number,
	"files_done": number
}
