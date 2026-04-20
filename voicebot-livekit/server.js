const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const {
  PORT = '3099',
  EXTERNAL_API_BASE_URL,
  EXTERNAL_API_SESSION_PATH = '/v1/voicebot-livekit/session',
  PARTICIPANT_NAME,
} = process.env;

// API base URL must be set in .env.
// API token and voicebot ID are always supplied by the user via the UI.
if (!EXTERNAL_API_BASE_URL) {
  console.error('ERROR: EXTERNAL_API_BASE_URL must be set in .env');
  process.exit(1);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function pickImageMappings(profile) {
  if (!profile || typeof profile !== 'object') return [];

  const direct =
    profile.imageMappings
    || profile.image_mappings
    || profile.images
    || profile.imageMap
    || profile.image_map;

  if (Array.isArray(direct)) return direct;

  const nested =
    profile.metadata?.imageMappings
    || profile.metadata?.image_mappings
    || profile.data?.imageMappings
    || profile.data?.image_mappings;

  if (Array.isArray(nested)) return nested;
  return [];
}

async function fetchVoicebotProfile(apiBaseUrl, apiToken, voicebotId) {
  try {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/$/, '')}/v1/voicebots/${voicebotId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return { ok: false, status: response.status, payload };
    }

    return { ok: true, profile: await response.json() };
  } catch (err) {
    return { ok: false, status: 500, payload: { message: err.message } };
  }
}

/**
 * GET /api/config
 * Token and voicebot ID are always entered via the UI — setup is always required.
 */
app.get('/api/config', (req, res) => {
  res.json({ needsSetup: true });
});

/**
 * POST /api/connect
 * Validates user-supplied credentials and returns voicebot profile + imageMappings.
 * Used by the setup UI to verify the config before starting a call.
 */
app.post('/api/connect', async (req, res) => {
  // apiBaseUrl always comes from env — only token and voicebotId supplied by UI.
  const { apiToken, voicebotId } = req.body || {};

  if (!apiToken || !voicebotId) {
    return res.status(400).json({
      error: 'apiToken and voicebotId are required',
      code: 'missing_config',
    });
  }

  const result = await fetchVoicebotProfile(EXTERNAL_API_BASE_URL, apiToken, voicebotId);

  // 401/403 → bad credentials, reject.
  // 503/5xx → authenticated OK but profile service is down, accept with empty profile.
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      const msg = result.payload?.detail?.message || result.payload?.message || 'Invalid token or access denied';
      return res.status(result.status).json({ error: msg, code: 'auth_failed' });
    }
    if (result.status === 404) {
      return res.status(404).json({ error: 'Voicebot not found', code: 'voicebot_not_found' });
    }
    // 5xx / network error — token was accepted by auth middleware, proceed without profile.
    console.warn(`[/api/connect] Profile fetch returned ${result.status}; proceeding without profile data.`);
    return res.json({
      voicebotName: 'Voicebot',
      voicebotAvatarUrl: '',
      imageMappings: [],
    });
  }

  const { profile } = result;
  const imageMappings = pickImageMappings(profile);
  return res.json({
    voicebotName: profile.name || profile.botID || 'Voicebot',
    voicebotAvatarUrl: profile.avatarUrl || '',
    imageMappings,
  });
});

/**
 * POST /api/mappings
 * Fetches image mappings for a voicebot (retry path for cases where /api/connect had empty mappings).
 */
app.post('/api/mappings', async (req, res) => {
  const { apiToken, voicebotId } = req.body || {};

  if (!apiToken || !voicebotId) {
    return res.status(400).json({
      error: 'apiToken and voicebotId are required',
      code: 'missing_config',
    });
  }

  const apiBaseUrl = EXTERNAL_API_BASE_URL.replace(/\/$/, '');
  const libraryPath = `/v1/voicebot-livekit/voicebots/${encodeURIComponent(voicebotId)}/image-mappings/library`;

  try {
    const response = await fetch(`${apiBaseUrl}${libraryPath}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = payload?.detail?.message || payload?.message || 'Failed to fetch mappings';
      return res.status(response.status).json({ error: msg, code: 'mappings_fetch_failed' });
    }

    const imageMappings = Object.entries(payload || {}).map(([imageKey, imageUrl]) => ({
      imageKey,
      imageUrl,
    }));

    return res.json({ imageMappings });
  } catch (error) {
    return res.status(500).json({
      error: 'Cannot fetch mappings from external API',
      code: 'mappings_unreachable',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * POST /api/image-proxy
 * Fetches an image URL server-side to bypass browser CORS/auth limitations.
 */
app.post('/api/image-proxy', async (req, res) => {
  const { src, apiToken } = req.body || {};

  if (!src || typeof src !== 'string') {
    return res.status(400).json({ error: 'src is required', code: 'missing_src' });
  }

  let parsed;
  try {
    parsed = new URL(src);
  } catch {
    return res.status(400).json({ error: 'src must be an absolute URL', code: 'invalid_src' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only http/https src is allowed', code: 'invalid_protocol' });
  }

  const headers = {};
  if (apiToken && typeof apiToken === 'string') {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  try {
    let response = await fetch(parsed.toString(), {
      method: 'GET',
      headers,
    });

    // Retry without auth in case the host rejects Authorization headers.
    if (!response.ok && headers.Authorization) {
      response = await fetch(parsed.toString(), { method: 'GET' });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return res.status(response.status).json({
        error: 'Failed to fetch image',
        code: 'image_fetch_failed',
        detail: text.slice(0, 300),
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({
      error: 'Cannot fetch image source',
      code: 'image_fetch_error',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * DELETE /api/session/:roomName
 * Ends a voicebot LiveKit session by calling the external API.
 * Idempotent — safe to call even if the session has already ended.
 */
app.delete('/api/session/:roomName', async (req, res) => {
  const { roomName } = req.params;
  const apiToken = req.headers['x-api-token'] || (req.body || {}).apiToken;

  if (!apiToken) {
    return res.status(400).json({ error: 'apiToken required', code: 'missing_token' });
  }

  const apiBaseUrl = EXTERNAL_API_BASE_URL.replace(/\/$/, '');

  try {
    const response = await fetch(
      `${apiBaseUrl}${EXTERNAL_API_SESSION_PATH}/${encodeURIComponent(roomName)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    // 204 = ended, 404 = already gone — both are OK
    if (response.ok || response.status === 404) {
      return res.status(204).end();
    }

    const payload = await response.json().catch(() => ({}));
    return res.status(response.status).json({
      error: payload?.detail?.message || payload?.message || 'Failed to end session',
      code: payload?.detail?.code || 'external_api_error',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: 'Cannot reach external API', detail });
  }
});

app.post('/api/session', async (req, res) => {
  // Credentials must be supplied by the UI — never from env.
  const {
    participantName: bodyParticipantName,
    apiToken,
    voicebotId,
  } = req.body || {};

  const apiBaseUrl = EXTERNAL_API_BASE_URL.replace(/\/$/, '');
  const participantName = bodyParticipantName || PARTICIPANT_NAME || undefined;

  if (!apiToken || !voicebotId) {
    return res.status(400).json({
      error: 'Missing required fields: apiToken, voicebotId',
      code: 'missing_config',
    });
  }

  const body = { voicebotId };
  if (participantName) body.participantName = participantName;

  try {
    const response = await fetch(
      `${apiBaseUrl}${EXTERNAL_API_SESSION_PATH}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.detail?.message || payload?.message || 'Failed to create LiveKit session',
        code: payload?.detail?.code || 'external_api_error',
        raw: payload,
      });
    }

    return res.status(201).json(payload);
  } catch (error) {
    const networkDetail =
      error instanceof Error
        ? [error.message, error.cause?.message].filter(Boolean).join(' | ')
        : String(error);

    return res.status(500).json({
      error: 'Cannot reach external API',
      code: 'external_api_unreachable',
      detail: networkDetail,
    });
  }
});

app.listen(Number(PORT), () => {
  // eslint-disable-next-line no-console
  console.log(`Sample app listening on http://localhost:${PORT}`);
  console.log(`API base URL: ${EXTERNAL_API_BASE_URL}`);
  console.log('Credentials (token + voicebot ID) will be entered via the UI.');
});
