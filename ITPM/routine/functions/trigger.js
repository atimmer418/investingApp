const REPO = 'atimmer418/FRED';
const ACTION_FILE_PATH = 'ITPM/pending/action.json';
const TODAY_FILE_PATH = 'ITPM/routine/today.html';
const ACTION_API = `https://api.github.com/repos/${REPO}/contents/${ACTION_FILE_PATH}`;
const TODAY_API = `https://api.github.com/repos/${REPO}/contents/${TODAY_FILE_PATH}`;

export async function onRequestPost(context) {
  const { request, env } = context;

  const githubToken = env.GITHUB_TOKEN;
  if (!githubToken) {
    return json({ ok: false, error: 'GITHUB_TOKEN not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const { type, content } = body;

  if (!type || !content) {
    return json({ ok: false, error: 'Missing type or content' }, 400);
  }

  const ghHeaders = {
    'Authorization': `Bearer ${githubToken}`,
    'User-Agent': 'FRED-ITPM',
    'Accept': 'application/vnd.github+json'
  };

  // Step 1: Write action.json
  let existingSha;
  const getActionRes = await fetch(ACTION_API, { headers: ghHeaders });

  if (getActionRes.ok) {
    const existing = await getActionRes.json();
    existingSha = existing.sha;
  } else if (getActionRes.status !== 404) {
    const err = await getActionRes.text();
    return json({ ok: false, error: err }, 502);
  }

  const actionPayload = {
    type,
    content,
    timestamp: new Date().toISOString()
  };
  const encoded = b64EncodeUtf8(JSON.stringify(actionPayload, null, 2));

  const putActionBody = {
    message: `itpm: queue ${type} action`,
    content: encoded
  };
  if (existingSha) {
    putActionBody.sha = existingSha;
  }

  const putActionRes = await fetch(ACTION_API, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(putActionBody)
  });

  if (!putActionRes.ok) {
    const err = await putActionRes.text();
    return json({ ok: false, error: err }, 502);
  }

  // Step 2: Patch today.html data-state from "planning" to "intermediary"
  try {
    const getTodayRes = await fetch(TODAY_API, { headers: ghHeaders });
    if (getTodayRes.ok) {
      const todayFile = await getTodayRes.json();
      const currentHtml = b64DecodeUtf8(todayFile.content.replace(/\n/g, ''));
      const updatedHtml = currentHtml.replace('data-state="planning"', 'data-state="intermediary"');

      if (updatedHtml !== currentHtml) {
        await fetch(TODAY_API, {
          method: 'PUT',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'itpm: set state to intermediary on approval',
            content: b64EncodeUtf8(updatedHtml),
            sha: todayFile.sha
          })
        });
      }
      // If already intermediary (string not found), skip silently
    }
  } catch (_) {
    // Non-fatal — action.json is written; state patch is best-effort
  }

  // Step 3: Fire the execution routine immediately
  const fireToken = env.ROUTINE_FIRE_TOKEN;
  if (fireToken) {
    await fetch('https://api.anthropic.com/v1/claude_code/routines/trig_01Lk17E9GS5sZ9mdjGH9gnGH/fire', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fireToken}`,
        'anthropic-beta': 'experimental-cc-routine-2026-04-01',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'A pending ITPM action was queued. Check ITPM/pending/action.json and process it.' })
    }).catch(function() {});
  }

  // Step 4: Return ok
  return json({ ok: true });
}

// UTF-8-safe base64. Bare btoa/atob throw on code points > 0xFF (em-dashes,
// arrows, checkmarks throughout today.html), which crashes the Worker (1101).
function b64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64DecodeUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
