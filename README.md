# DesktopShare
Simple Electron + WebRTC desktop sharing demo. Allows one machine to share its desktop and another to view it using a lightweight signaling server (Socket.IO).

## Features
- Screen / window capture via Electron desktopCapturer
- Peer-to-peer WebRTC video (STUN: stun.l.google.com:19302)
- External signaling server (Socket.IO) for multi‑machine use
- Quality profiles: Speed (720p/15fps) or Best (1080p/30fps)
- View options: swap, remote full, local full, side by side
- Portable build option (no installer) & NSIS installer build
- Lock screen pause overlay (stream auto‑pauses during Windows lock)

## Prerequisites
- Windows 10/11
- Node.js 18+ (recommended)
- (Optional) Enable Windows Developer Mode for easier building (avoids symlink issues in some cases)

## Install Dependencies
```bash
npm install
```

## Start Signaling Server
Runs on port 3000 by default.
```bash
npm run signal
```
You should see: `Signaling server listening on http://localhost:3000`.

To use a different port:
```bash
PORT=4000 node signaling-server.js
```
(Windows PowerShell example):
```powershell
$env:PORT=4000; node signaling-server.js
```

## Run the App (Development)
In a second terminal:
```bash
npm start
```
Steps in the UI:
1. Enter signaling URL (e.g. http://localhost:3000)
2. Click Connect
3. Pick a source from the Sources list to start sharing
4. On a second machine: run the app, connect to the same signaling URL (publicly reachable or via LAN) – the remote stream will appear

## Multi‑Machine Usage
- Both machines must reach the signaling server (open firewall port 3000 or chosen port)
- For NAT traversal you may need a TURN server (not included). Current setup uses only a public STUN server.

## Changing Quality
Use the dropdown (Speed / Best) before or during sharing, or use the menu: Connection > Quality.

## Building
Produces artifacts in `dist/`.

### 1. NSIS Installer (Setup EXE)
```bash
npm run dist
```
Artifact name pattern: `DesktopShare-Setup-<version>.exe`

### 2. Portable EXE (no installer)
```bash
npm run dist:portable
```
Generates a `DesktopShare-Setup-<version>.exe` (installer) plus a separate portable executable (inside `dist/` with `portable` in filename).

### If Build Fails with winCodeSign / symlink Privilege Error
Error example: `Cannot create symbolic link ... winCodeSign`.
Workarounds:
1. Enable Windows Developer Mode (Settings > For Developers) and re-run build.
2. Run PowerShell as Administrator and retry.
3. Build only the portable target: `electron-builder --win portable` (already scripted via `npm run dist:portable`).
4. (Last resort) Disable code signing or vendor tools caching (not required here usually).

## Committing Built Executables
`.gitignore` allows tracking `dist/*.exe`. After building:
```bash
git add dist/*.exe
git commit -m "Add build artifacts"
```
Consider instead creating a GitHub Release and uploading EXEs (recommended) to keep repository size small.

## File Overview
- `main.js` – Electron main process, window & menu
- `preload.js` – Secure bridge (sources + menu events)
- `renderer.js` – UI / capture / WebRTC logic
- `index.html` – Interface layout
- `signaling-server.js` – Socket.IO signaling server
- `package.json` – Scripts & build config

## Menu Shortcuts
- Connect: Ctrl+K
- Swap: Ctrl+S
- Refresh Sources: F5
- DevTools / Reload: standard Electron roles

## Troubleshooting
| Issue | Fix |
|-------|-----|
| No remote video | Ensure both peers connected to same signaling URL; pick a source on sharer side. |
| Black screen after Windows lock | Expected; stream paused. Unlock resumes automatically. |
| High latency | Use Speed profile (lower resolution/fps). |
| Build symlink error | See winCodeSign workaround section above. |
| Cannot reach signaling server from another machine | Open firewall for port 3000 or use different accessible host/IP. |

## Security Notes
This is a demo. No authentication, encryption only via standard WebRTC DTLS/SRTP. Do not expose signaling server publicly without adding auth & room isolation.

## License
MIT
