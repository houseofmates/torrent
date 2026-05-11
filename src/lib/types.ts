// qBittorrent torrent info object (from /api/v2/torrents/info or sync/maindata)
export interface Torrent {
	hash: string;
	name: string;
	progress: number;
	state: TorrentState;
	size: number;
	total_size: number;
	downloaded: number;
	downloaded_session: number;
	uploaded: number;
	uploaded_session: number;
	dlspeed: number;
	upspeed: number;
	eta: number;
	ratio: number;
	num_seeds: number;
	num_leechs: number;
	num_complete: number;
	num_incomplete: number;
	category: string;
	tags: string;
	tracker: string;
	save_path: string;
	completion_on: number;
	added_on: number;
	seed_time: number;
	seen_complete: number;
	force_start: boolean;
	save_path_changed: boolean;
	has_metadata: boolean;
	priority: number;
	availability: number;
	auto_tmm: boolean;
	f_l_piece_prio: boolean;
	super_seeding: boolean;
	max_ratio: number;
	max_seeding_time: number;
}

export type TorrentState =
	| 'error'
	| 'missingFiles'
	| 'uploading'
	| 'pausedUP'
	| 'queuedUP'
	| 'stalledUP'
	| 'checkingUP'
	| 'forcedUP'
	| 'allocating'
	| 'downloading'
	| 'metaDL'
	| 'pausedDL'
	| 'queuedDL'
	| 'stalledDL'
	| 'checkingDL'
	| 'forcedDL'
	| 'checkingResumeData'
	| 'moving'
	| 'unknown';

export interface MainData {
	rid: number;
	full_update: boolean;
	torrents?: Record<string, Torrent>;
	torrents_removed?: string[];
	categories?: Record<string, Category>;
	server_state?: ServerState;
	tags?: string[];
	trackers?: Record<string, string[]>;
}

export interface ServerState {
	alltime_dl?: number;
	alltime_ul?: number;
	average_time_queue?: number;
	connection_status?: string;
	dht_nodes?: number;
	dl_info_data?: number;
	dl_info_speed?: number;
	dl_rate_limit?: number;
	free_space_on_disk?: number;
	global_ratio?: string;
	queueing?: boolean;
	read_cache_overload?: string;
	refresh_interval?: number;
	total_buffers_size?: number;
	total_peer_connections?: number;
	total_queued_size?: number;
	total_wasted_session?: number;
	up_info_data?: number;
	up_info_speed?: number;
	up_rate_limit?: number;
	use_alt_speed_limits?: boolean;
	use_subcategories?: boolean;
}

export interface Category {
	name: string;
	savePath: string;
}

export interface SearchPlugin {
	name: string;
	url: string;
	supported_categories: string[];
	version: string;
}

export interface SearchResult {
	fileName: string;
	fileSize: number;
	nbSeeders: number;
	nbLeechers: number;
	siteUrl: string;
	descrLink?: string;
	fileUrl?: string;
}

export interface SearchJob {
	id: number;
}

export interface SearchResults {
	results: SearchResult[];
	status: 'Running' | 'Stopped';
	total: number;
}

export interface TorrentPreferences {
	save_path: string;
	temp_path_enabled: boolean;
	temp_path: string;
	scan_dirs: Record<string, string>;
	export_dir: string;
	export_dir_fin: string;
	mail_notification_enabled: boolean;
	mail_notification_email: string;
	mail_notification_smtp: string;
	mail_notification_ssl_enabled: boolean;
	mail_notification_auth_enabled: boolean;
	mail_notification_username: string;
	mail_notification_password: string;
	auto_tmm_enabled: boolean;
	torrent_changed_tmm_enabled: boolean;
	save_path_changed_tmm_enabled: boolean;
	category_changed_tmm_enabled: boolean;
	save_path_changed_tmm_default: boolean;
	category_changed_tmm_default: boolean;
}

export interface TorrentPeers {
	peers: Record<string, TorrentPeer>;
}

export interface TorrentPeer {
	ip: string;
	port: number;
	client: string;
	progress: number;
	dl_speed: number;
	up_speed: number;
	downloaded: number;
	uploaded: number;
	connection: string;
	flags: string;
	flags_desc: string;
	files: string;
}
