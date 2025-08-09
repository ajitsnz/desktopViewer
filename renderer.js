let socket;
let localStream;
let peerConnection;
let currentSourceId;
let qualityOverride = null;
let lockOverlay;

function ensureOverlay() {
  if (!lockOverlay) {
    lockOverlay = document.createElement('div');
    lockOverlay.style.cssText = 'position:fixed;inset:0;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:20px Arial;z-index:200;flex-direction:column;';
    lockOverlay.innerHTML = '<div>Session locked – streaming paused.</div><div style="font-size:13px;margin-top:8px;opacity:.7;">Unlock to resume sharing.</div>';
    lockOverlay.style.display = 'none';
    document.body.appendChild(lockOverlay);
  }
  return lockOverlay;
}
function pauseStreamingForLock() { if (localStream) localStream.getTracks().forEach(t => t.enabled = false); ensureOverlay().style.display = 'flex'; }
function resumeAfterUnlock() { ensureOverlay().style.display = 'none'; if (localStream) localStream.getTracks().forEach(t => t.enabled = true); if (currentSourceId) selectSource(currentSourceId); }
if (window.api) { window.api.onSystemLock(() => pauseStreamingForLock()); window.api.onSystemUnlock(() => resumeAfterUnlock()); }

function getQualityConstraints(profile) {
  if (profile === 'speed') {
    return { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 15, max: 15 } };
  }
  // best
  return { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: { ideal: 30, max: 30 } };
}

function connectSignaling() {
  const urlInput = document.getElementById('signalUrl');
  const statusEl = document.getElementById('status');
  const url = urlInput.value.trim();
  if (!url) { statusEl.textContent = 'Enter signaling URL'; return; }
  if (socket) { socket.disconnect(); }
  socket = io(url, { autoConnect: true });
  statusEl.textContent = 'Connecting...';
  socket.on('connect', () => { statusEl.textContent = 'Connected'; });
  socket.on('disconnect', () => { statusEl.textContent = 'Disconnected'; });
  socket.on('signal', handleSignal);
}

async function selectSource(id) {
  currentSourceId = id;
  const video = document.getElementById('localVideo');
  const profile = document.getElementById('qualityProfile').value;
  try {
    const quality = getQualityConstraints(profile);
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: id,
          minWidth: quality.width.max,
          maxWidth: quality.width.max,
          minHeight: quality.height.max,
          maxHeight: quality.height.max,
          maxFrameRate: quality.frameRate.max
        }
      }
    };

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = localStream;

    if (peerConnection) {
      const senders = peerConnection.getSenders().filter(s => s.track && s.track.kind === 'video');
      const newTrack = localStream.getVideoTracks()[0];
      if (senders[0]) senders[0].replaceTrack(newTrack);
      await renegotiate();
    } else {
      startPeer();
    }
  } catch (e) {
    console.error('Error selecting source', e);
  }
}

async function renegotiate() {
  if (!peerConnection || !socket) return;
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal', { type: 'offer', sdp: offer.sdp });
}

async function startPeer() {
  peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit('signal', { type: 'candidate', candidate: e.candidate });
  };

  peerConnection.ontrack = e => {
    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = e.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('signal', { type: 'offer', sdp: offer.sdp });
}

async function handleSignal(data) {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnection.onicecandidate = e => { if (e.candidate) socket.emit('signal', { type: 'candidate', candidate: e.candidate }); };
    peerConnection.ontrack = e => { document.getElementById('remoteVideo').srcObject = e.streams[0]; };
  }
  if (data.type === 'offer' && !peerConnection.currentRemoteDescription) {
    await peerConnection.setRemoteDescription({ type: 'offer', sdp: data.sdp });
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('signal', { type: 'answer', sdp: answer.sdp });
  } else if (data.type === 'answer' && !peerConnection.currentRemoteDescription) {
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: data.sdp });
  } else if (data.type === 'candidate') {
    try { await peerConnection.addIceCandidate(data.candidate); } catch {}
  }
}

async function loadSources() {
  const list = document.getElementById('sources');
  const sources = await window.api.getSources();
  list.innerHTML = '';
  sources.forEach(src => {
    const li = document.createElement('li');
    li.innerText = src.name;
    li.onclick = () => selectSource(src.id);
    list.appendChild(li);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadSources();
});

function applyQuality(q) {
  qualityOverride = q;
  if (currentSourceId) selectSource(currentSourceId);
}

function swapViews() {
  const container = document.getElementById('videosContainer');
  const localWrap = document.getElementById('localWrap');
  const remoteWrap = document.getElementById('remoteWrap');
  if (localWrap.nextElementSibling === remoteWrap) container.insertBefore(remoteWrap, localWrap); else container.insertBefore(localWrap, remoteWrap);
}
function clearFull() { document.querySelectorAll('.full').forEach(el => el.classList.remove('full')); localWrap.classList.remove('hidden'); remoteWrap.classList.remove('hidden'); }
function remoteFull() { clearFull(); document.getElementById('remoteWrap').classList.add('full'); document.getElementById('localWrap').classList.add('hidden'); }
function localFull() { clearFull(); document.getElementById('localWrap').classList.add('full'); document.getElementById('remoteWrap').classList.add('hidden'); }
function sideBySide() { clearFull(); }

// Listen for menu actions from main
if (window.api && window.api.onMenuAction) {
  window.api.onMenuAction(({ type, data }) => {
    switch (type) {
      case 'connect': connectSignaling(); break;
      case 'quality': applyQuality(data); break;
      case 'swap': swapViews(); break;
      case 'remote-full': remoteFull(); break;
      case 'local-full': localFull(); break;
      case 'side': sideBySide(); break;
      case 'refresh-sources': loadSources(); break;
    }
  });
}
