<h1 align="center">torrent</h1>
<p align="center">a nicer, simpler frontend for qbittorrent</p>

<h1 align="center">features</h1>
<ul>
<li>clean, real-time dashboard for your torrents</li>
<li>add torrents via magnet link or .torrent file</li>
<li>pause, resume, delete, and manage categories</li>
<li>live upload/download speed indicators</li>
<li>mobile-friendly web UI (also packaged for Android)</li>
<li>self-hosted – connects directly to your qBittorrent server</li>
</ul>

<h1 align="center">installation</h1>
<pre>
1. install dependencies: npm install
2. start development server: npm run dev --port 3004 --host
3. open http://localhost:3004

to build for production:
  npm run build
  (serve the generated build/ folder with any static file server)
</pre>

<h1 align="center">environment variables</h1>
<table>
  <tr><th>Variable</th><th>Default</th><th>Description</th></tr>
  <tr><td>QBITTORRENT_HOST</td><td>localhost</td><td>qBittorrent Web UI host</td></tr>
  <tr><td>QBITTORRENT_PORT</td><td>8080</td><td>qBittorrent Web UI port</td></tr>
  <tr><td>QBITTORRENT_USERNAME</td><td>admin</td><td>qBittorrent username</td></tr>
  <tr><td>QBITTORRENT_PASSWORD</td><td>(empty)</td><td>qBittorrent password</td></tr>
  <tr><td>VITE_API_BASE</td><td>http://localhost:3004</td><td>Base URL for the torrent frontend API (if different)</td></tr>
</table>

<h1 align="center">auto-start</h1>
<p>the service automatically starts on port 3004 across reboots via a watchdog script.</p>
