import {
  Room,
  RoomEvent,
  ConnectionState,
  Track,
} from 'https://cdn.jsdelivr.net/npm/livekit-client@2.5.9/+esm';

// ── DOM refs ──────────────────────────────────────────────────────────────────

// Setup panel
const setupPanelEl      = document.getElementById('setupPanel');
const apiTokenInputEl   = document.getElementById('apiTokenInput');
const voicebotIdInputEl = document.getElementById('voicebotIdInput');
const setupConnectBtnEl = document.getElementById('setupConnectBtn');
const setupErrorEl      = document.getElementById('setupError');

// Main panel
const mainPanelEl       = document.getElementById('mainPanel');
const settingsBtnEl     = document.getElementById('settingsBtn');
const avatarContainerEl = document.getElementById('avatarContainer');
const avatarEl          = document.getElementById('avatar');
const voicebotNameEl    = document.getElementById('voicebotName');
const callButtonEl      = document.getElementById('callButton');
const statusDotEl       = document.getElementById('statusDot');
const statusTextEl      = document.getElementById('statusText');
const errorTextEl       = document.getElementById('errorText');
const imageAreaEl       = document.getElementById('imageArea');
const placeholderEl     = document.getElementById('placeholder');

// ── State ─────────────────────────────────────────────────────────────────────

const AVATAR_STATUSES = ['idle', 'connecting', 'listening', 'user_speaking', 'bot_speaking', 'processing'];

const state = {
  credentials: null,     // { apiToken, apiBaseUrl, voicebotId } — set by setup panel
  imageMappingMap: {},   // { [imageKey]: imageUrl } — built from voicebot profile
  room: null,
  roomName: null,        // LiveKit room name — used to end the session via API
  connected: false,
  isUserSpeaking: false,
  isBotSpeaking: false,
  audioElements: new Map(),
  imageKeys: new Set(),
};

// Toggle verbose runtime logs in console: window.__VOICEBOT_IMG_DEBUG__ = true
const DEBUG_IMG = () => window.__VOICEBOT_IMG_DEBUG__ !== false;
function debugImg(...args) {
  if (DEBUG_IMG()) console.info('[sample-image]', ...args);
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function setAvatarStatus(status) {
  avatarContainerEl.classList.remove(...AVATAR_STATUSES);
  avatarContainerEl.classList.add(status);
}

// ── Setup panel ───────────────────────────────────────────────────────────────

function showSetupPanel() {
  setupPanelEl.classList.remove('hidden');
  mainPanelEl.classList.add('hidden');
}

function showMainPanel() {
  setupPanelEl.classList.add('hidden');
  mainPanelEl.classList.remove('hidden');
}

function setSetupError(message) {
  if (!message) {
    setupErrorEl.textContent = '';
    setupErrorEl.classList.add('hidden');
    return;
  }
  setupErrorEl.textContent = message;
  setupErrorEl.classList.remove('hidden');
}

function buildImageMappingMap(imageMappings) {
  const map = {};
  for (const m of (imageMappings || [])) {
    const key = (m?.imageKey || m?.image_key || '').trim();
    const url = (m?.imageUrl || m?.image_url || '').trim();
    if (!key || !url) continue;

    // Keep both original and case-normalized variants to avoid key casing mismatch
    // between LLM tags (e.g. IMG:GR3B...) and stored mapping records.
    map[key] = url;
    map[key.toLowerCase()] = url;
    map[key.toUpperCase()] = url;
  }
  debugImg('imageMappings loaded', {
    inputCount: Array.isArray(imageMappings) ? imageMappings.length : 0,
    mapKeys: Object.keys(map).length,
  });
  return map;
}

async function handleSetupConnect() {
  const apiToken   = (apiTokenInputEl.value   || '').trim();
  const voicebotId = (voicebotIdInputEl.value || '').trim();

  if (!apiToken || !voicebotId) {
    setSetupError('Vui lòng điền API Token và Voicebot ID');
    return;
  }

  setSetupError('');
  setupConnectBtnEl.disabled = true;
  setupConnectBtnEl.textContent = 'Đang kết nối...';

  try {
    const res  = await fetch('/api/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiToken, voicebotId }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setSetupError(data.error || 'Không thể kết nối. Kiểm tra lại thông tin API.');
      return;
    }

    state.credentials    = { apiToken, voicebotId };
    state.imageMappingMap = buildImageMappingMap(data.imageMappings);

    voicebotNameEl.textContent = data.voicebotName || 'Voicebot';
    avatarEl.src = data.voicebotAvatarUrl || 'https://placehold.co/220x220/png?text=Voicebot';

    showMainPanel();
  } catch {
    setSetupError('Không thể kết nối đến server. Vui lòng thử lại.');
  } finally {
    setupConnectBtnEl.disabled = false;
    setupConnectBtnEl.textContent = 'Kết nối voicebot';
  }
}

// ── Main panel helpers ────────────────────────────────────────────────────────

function setError(message) {
  if (!message) {
    errorTextEl.textContent = '';
    errorTextEl.classList.add('hidden');
    return;
  }
  errorTextEl.textContent = message;
  errorTextEl.classList.remove('hidden');
}

function setConnectedStatus(connected) {
  state.connected = connected;
  statusDotEl.classList.toggle('connected', connected);
  statusDotEl.classList.toggle('disconnected', !connected);
  statusTextEl.textContent   = connected ? 'Đã kết nối' : 'Đã ngắt kết nối';
  callButtonEl.textContent   = connected ? 'Dừng cuộc trò chuyện' : 'Bắt đầu cuộc trò chuyện';
  if (connected) {
    setAvatarStatus('listening');
  } else {
    state.isUserSpeaking = false;
    state.isBotSpeaking  = false;
    setAvatarStatus('idle');
  }
}

function setBusyButton(busy) {
  callButtonEl.disabled = busy;
  if (busy) {
    callButtonEl.textContent = 'Đang kết nối...';
    setAvatarStatus('connecting');
  } else {
    callButtonEl.textContent = state.connected ? 'Dừng cuộc trò chuyện' : 'Bắt đầu cuộc trò chuyện';
  }
}

// ── Image handling ────────────────────────────────────────────────────────────

/**
 * Resolve an image reference — either a direct URL or an imageKey from
 * the voicebot's imageMappings. Returns the resolved URL or null.
 *
 * The agent sends keys as "IMG:KEY" (e.g. <img>IMG:step1</img>),
 * but imageMappingMap stores them under the bare key (e.g. "step1").
 */
function resolveImageRef(ref) {
  const s = (ref || '').trim();
  if (s.startsWith('http')) return s;

  // Remove optional wrappers that occasionally appear in tool output.
  const cleaned = s.replace(/^['"`]+|['"`]+$/g, '');

  // Strip the IMG: prefix the agent adds before the imageKey
  const bare = cleaned.startsWith('IMG:') ? cleaned.slice(4) : cleaned;

  const candidates = [
    bare,
    cleaned,
    bare.toLowerCase(),
    cleaned.toLowerCase(),
    bare.toUpperCase(),
    cleaned.toUpperCase(),
  ];

  let mapped = null;
  for (const key of candidates) {
    if (key && state.imageMappingMap[key]) {
      mapped = state.imageMappingMap[key];
      break;
    }
  }

  if (mapped) return mapped;

  // Accept direct browser-loadable URLs even if not http(s), e.g. data:, blob:, or /path
  if (cleaned.startsWith('data:') || cleaned.startsWith('blob:')) return cleaned;
  if (cleaned.startsWith('/')) return `${window.location.origin}${cleaned}`;
  debugImg('resolveImageRef: no match', { ref, cleaned, bare, candidateCount: candidates.length });
  return null;
}

/**
 * Extract image URLs from text containing:
 *   <img>URL_or_KEY</img>  — agent sends these; key resolved via imageMappingMap
 *   ![alt](URL)            — markdown images
 *   bare .png/.jpg/jpeg/etc URLs
 */
function extractImagesFromText(text) {
  if (!text) return [];
  const urls = [];
  let m;

  const imgTagRe = /<img>\s*([^<\s]+)\s*<\/img>/gi;
  while ((m = imgTagRe.exec(text)) !== null) {
    const url = resolveImageRef(m[1]);
    if (url) urls.push(url);
  }

  const mdRe = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
  while ((m = mdRe.exec(text)) !== null) urls.push(m[1]);

  const directRe = /(https?:\/\/[^\s<>"]+\.(?:png|jpg|jpeg|webp|gif))(?:\?[^\s]*)?/gi;
  while ((m = directRe.exec(text)) !== null) urls.push(m[1]);

  return [...new Set(urls)];
}

function appendImage(url, dedupeKey) {
  const key = dedupeKey || url;
  if (state.imageKeys.has(key)) {
    debugImg('appendImage skipped (duplicate)', { key, url });
    return;
  }
  state.imageKeys.add(key);

  placeholderEl.classList.add('hidden');

  const img    = document.createElement('img');
  img.className = 'display-image';
  img.src       = url;
  img.alt       = dedupeKey || 'agent image';
  img.loading   = 'lazy';

  img.onload = () => {
    debugImg('image loaded', { key, url: img.currentSrc || url });
  };

  // If direct load fails (auth/CORS/protected URL), retry via backend proxy.
  img.onerror = () => {
    if (img.dataset.proxyTried === '1') {
      setError(`Không tải được ảnh: ${url}`);
      return;
    }
    img.dataset.proxyTried = '1';

    const canProxy = /^https?:\/\//i.test(url) && !!state.credentials?.apiToken;
    if (!canProxy) {
      debugImg('image load failed; cannot proxy', { key, url });
      setError(`Không tải được ảnh: ${url}`);
      return;
    }

    debugImg('image load failed; retry via proxy', { key, url });

    const proxyUrl = '/api/image-proxy';
    fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src: url, apiToken: state.credentials.apiToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Image proxy failed (${res.status})`);
        return URL.createObjectURL(await res.blob());
      })
      .then((blobUrl) => {
        debugImg('image proxy success', { key, url, blobUrl });
        img.src = blobUrl;
      })
      .catch(() => {
        debugImg('image proxy failed', { key, url });
        setError(`Không tải được ảnh qua proxy: ${url}`);
      });
  };

  imageAreaEl.appendChild(img);
  imageAreaEl.scrollTop = imageAreaEl.scrollHeight;
}

function clearImageArea() {
  state.imageKeys.clear();
  imageAreaEl.querySelectorAll('.display-image').forEach((el) => el.remove());
  placeholderEl.classList.remove('hidden');
}

// ── Agent data ────────────────────────────────────────────────────────────────

function handleAgentData(payload, participant) {
  const localSid = state.room?.localParticipant?.sid;
  if (participant?.sid && localSid && participant.sid === localSid) return;

  const text = new TextDecoder().decode(payload);
  debugImg('data received', {
    bytes: payload?.byteLength || payload?.length || 0,
    fromIdentity: participant?.identity,
    fromSid: participant?.sid,
    preview: text.slice(0, 200),
  });
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    debugImg('data not json; extract from plain text');
    for (const url of extractImagesFromText(text)) appendImage(url);
    return;
  }

  // Agent sends pre-resolved image URLs: { type:'images', images:[{url, key}] }
  // Also support compatible variants from older/newer payload formats.
  const candidates = [];
  if (json.type === 'images' && Array.isArray(json.images)) {
    candidates.push(...json.images);
  }
  if (json.type === 'image' && (json.image || json.url || json.src)) {
    candidates.push(json.image || { url: json.url || json.src, key: json.key });
  }
  if (Array.isArray(json.data?.images)) {
    candidates.push(...json.data.images);
  }

  if (candidates.length > 0) {
    debugImg('image candidates detected', { count: candidates.length, payloadType: json.type });
    for (const image of candidates) {
      const rawUrl = image?.url || image?.src || image?.imageUrl || image?.image_url || image?.imageKey || image?.image_key || '';
      const key = image?.key || image?.imageKey || image?.image_key || '';
      const url = resolveImageRef(rawUrl) || resolveImageRef(key);
      debugImg('candidate resolved', { rawUrl, key, resolved: url || null });
      if (typeof url === 'string' && url.length > 0) appendImage(url, key || url);
    }
    return;
  }

  if (json.type === 'transcript') {
    // Extract any <img>KEY</img> in the transcript text (fallback for older agent builds)
    const transcriptText = json.text || json.content || '';
    debugImg('transcript payload; extracting img tags', { textLen: transcriptText.length });
    for (const url of extractImagesFromText(transcriptText)) appendImage(url, url);
    return;
  }

  // Final fallback: some payloads contain plain text with <img>...</img> snippets.
  const fallbackText = json.text || json.content || json.message || '';
  debugImg('fallback payload; extracting img tags', {
    type: json.type,
    hasFallbackText: typeof fallbackText === 'string' && fallbackText.length > 0,
  });
  for (const url of extractImagesFromText(typeof fallbackText === 'string' ? fallbackText : '')) {
    appendImage(url, url);
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

async function createSession() {
  const body = {};
  if (state.credentials) {
    body.apiToken   = state.credentials.apiToken;
    body.voicebotId = state.credentials.voicebotId;
  }

  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'Tạo LiveKit session thất bại');
  return payload;
}

// ── Room ──────────────────────────────────────────────────────────────────────

function cleanupAudioElements() {
  for (const el of state.audioElements.values()) {
    el.pause();
    el.srcObject = null;
    el.remove();
  }
  state.audioElements.clear();
}

function updateSpeakingStatus(activeSpeakers) {
  const localSid   = state.room?.localParticipant?.sid;
  state.isUserSpeaking = !!localSid && activeSpeakers.some((p) => p.sid === localSid);
  state.isBotSpeaking  = activeSpeakers.some((p) => p.sid && p.sid !== localSid);

  if (state.isUserSpeaking)       setAvatarStatus('user_speaking');
  else if (state.isBotSpeaking)   setAvatarStatus('bot_speaking');
  else if (state.connected)       setAvatarStatus('listening');
}

function bindRoomEvents(room) {
  room.on(RoomEvent.ConnectionStateChanged, (cs) =>
    setConnectedStatus(cs === ConnectionState.Connected)
  );
  room.on(RoomEvent.ActiveSpeakersChanged, updateSpeakingStatus);
  room.on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
    debugImg('RoomEvent.DataReceived fired', {
      kind,
      topic,
      fromIdentity: participant?.identity,
      fromSid: participant?.sid,
      bytes: payload?.byteLength || payload?.length || 0,
    });
    handleAgentData(payload, participant);
  });

  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (publication.kind !== Track.Kind.Audio) return;
    const audioEl       = track.attach();
    audioEl.autoplay    = true;
    audioEl.playsInline = true;
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    state.audioElements.set(track.sid, audioEl);

    participant.on(RoomEvent.TrackUnsubscribed, (t) => {
      const el = state.audioElements.get(t.sid);
      if (el) { el.remove(); state.audioElements.delete(t.sid); }
    });
  });

  room.on(RoomEvent.Disconnected, () => {
    cleanupAudioElements();
    setConnectedStatus(false);
    state.room = null;
  });
}

async function disconnectRoom() {
  if (!state.room) return;
  const room = state.room;
  const roomName = state.roomName;
  state.room = null;
  state.roomName = null;
  try { await room.localParticipant.setMicrophoneEnabled(false); } catch {}
  room.disconnect();
  cleanupAudioElements();
  setConnectedStatus(false);

  // Notify the server to end the session (non-blocking)
  if (roomName && state.credentials?.apiToken) {
    fetch(`/api/session/${encodeURIComponent(roomName)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': state.credentials.apiToken,
      },
    }).catch(() => {}); // Fire-and-forget — ignore errors
  }
}

async function startConversation() {
  if (state.connected || state.room) return;

  setError('');
  setBusyButton(true);
  clearImageArea();

  try {
    const session = await createSession();

    if (Array.isArray(session.imageMappings) && session.imageMappings.length > 0) {
      state.imageMappingMap = buildImageMappingMap(session.imageMappings);
      debugImg('imageMappings loaded from session', {
        count: session.imageMappings.length,
      });
    } else {
      debugImg('session returned no imageMappings');
    }

    // Name and avatar are already set in handleSetupConnect() from /api/connect.
    // Do NOT overwrite — the session endpoint may return botID as the name
    // (odmantic model falls back to botID when name is empty in DB).
    state.roomName = session.roomName || null;

    const room = new Room({ adaptiveStream: true, dynacast: true });
    state.room = room;
    bindRoomEvents(room);

    await room.connect(session.livekitUrl, session.participantToken, { autoSubscribe: true });
    await room.localParticipant.setMicrophoneEnabled(true);
    setConnectedStatus(true);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'Không thể bắt đầu cuộc trò chuyện');
    await disconnectRoom();
  } finally {
    setBusyButton(false);
  }
}

async function toggleConversation() {
  if (state.connected || state.room) {
    setBusyButton(true);
    await disconnectRoom();
    setBusyButton(false);
    return;
  }
  await startConversation();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  setConnectedStatus(false);

  // Setup panel events
  setupConnectBtnEl.addEventListener('click', () => void handleSetupConnect());
  for (const el of [apiTokenInputEl, voicebotIdInputEl]) {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') void handleSetupConnect(); });
  }

  // Main panel events
  callButtonEl.addEventListener('click', () => void toggleConversation());
  settingsBtnEl.addEventListener('click', () => {
    if (state.connected || state.room) return; // Don't allow during call
    showSetupPanel();
  });

  // Determine if env config is available
  let config = {};
  try {
    const res = await fetch('/api/config');
    config = await res.json().catch(() => ({}));
  } catch {
    config = { needsSetup: true };
  }

  if (config.needsSetup) {
    showSetupPanel();
    return;
  }

  // Env vars are set — go straight to main panel
  state.imageMappingMap      = buildImageMappingMap(config.imageMappings);
  voicebotNameEl.textContent = config.voicebotName || 'Voicebot';
  avatarEl.src = config.voicebotAvatarUrl || 'https://placehold.co/220x220/png?text=Voicebot';
  showMainPanel();
}

window.addEventListener('beforeunload', () => {
  if (state.room) state.room.disconnect();
});

void bootstrap();
