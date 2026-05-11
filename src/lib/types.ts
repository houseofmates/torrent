export interface Torrent {
	hash: string;
	name: string;
	progress: number;
	state: string;
	size: number;
	downloaded: number;
	uploaded: number;
	dlspeed: number;
	upspeed: number;
	eta: number;
	ratio: number;
}

export interface MainData {
	server_state?: {
		up_info_speed?: number;
		dl_info_speed?: number;
	};
	torrents?: Record<string, Torrent>;
}