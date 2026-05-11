<h1 align="center">torrent client</h1>

<h1 align="center">features</h1>
<ul>
<li>intuitive web ui</li>
<li>integration with qbittorrent api</li>
<li>real-time updates</li>
</ul>

<h1 align="center">installation</h1>
<pre>
1. install dependencies: npm install
2. start development server: npm run dev --port 3004 --host
3. open http://localhost:3004
</pre>

<h1 align="center">environment variables</h1>
<table>
  <tr><th>Variable</th><th>Default</th><th>Description</th></tr>
  <tr><td>MUSIC_DIR</td><td>(empty)</td><td>Directory containing your music files</td></tr>
  <tr><td>DATABASE_URL</td><td>(empty)</td><td>Database connection string</td></tr>
  <tr><td>ACOUSTID_API_KEY</td><td>(empty)</td><td>API key for AcoustID fingerprinting</td></tr>
  <tr><td>MUSICBRAINZ_USER_AGENT</td><td>(empty)</td><td>User agent for MusicBrainz API</td></tr>
  <tr><td>OLLAMA_URL</td><td>(empty)</td><td>URL for OLLAMA server (AI features)</td></tr>
  <tr><td>MOBILE_PASSCODE_USER</td><td>(empty)</td><td>Username for mobile app passcode authentication</td></tr>
  <tr><td>MOBILE_PASSCODE_HASH</td><td>(empty)</td><td>Bcrypt hash of the passcode password</td></tr>
  <tr><td>JWT_SECRET</td><td>(auto-generated)</td><td>Secret key for JWT tokens (set for production)</td></tr>
  <tr><td>SERVER_HOST</td><td>(empty)</td><td>Server host</td></tr>
  <tr><td>SERVER_PORT</td><td>(empty)</td><td>Server port</td></tr>
</table>

<h1 align="center">auto-start</h1>
<p>the service automatically starts on port 3004 across reboots via a watchdog script.</p>