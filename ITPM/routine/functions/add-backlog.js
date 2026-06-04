const REPO = 'atimmer418/FRED';
const FILE_PATH = 'FREDdocs/backlog.md';
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

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

  const item = body.item ? body.item.trim() : '';
  if (!item) {
    return json({ ok: false, error: 'Missing item text' }, 400);
  }

  const ghHeaders = {
    'Authorization': `Bearer ${githubToken}`,
    'User-Agent': 'FRED-ITPM',
    'Accept': 'application/vnd.github+json'
  };

  // GET the current backlog.md
  const getRes = await fetch(API_BASE, { headers: ghHeaders });
  if (!getRes.ok) {
    return json({ ok: false, error: 'Could not fetch backlog.md' }, 502);
  }

  const file = await getRes.json();
  const currentContent = b64DecodeUtf8(file.content.replace(/\n/g, ''));

  const isoDate = new Date().toISOString().split('T')[0];
  const appendix = `\n\n## INBOX — ${item}\n_Added from ITPM dashboard ${isoDate}_`;
  const updatedContent = currentContent + appendix;

  const putRes = await fetch(API_BASE, {
    method: 'PUT',
    headers: { ...ghHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'itpm: add backlog item from dashboard',
      content: b64EncodeUtf8(updatedContent),
      sha: file.sha
    })
  });

  if (!putRes.ok) {
    return json({ ok: false, error: await putRes.text() }, 502);
  }

  return json({ ok: true });
}

// UTF-8-safe base64. Bare btoa/atob throw on code points > 0xFF (em-dashes,
// checkmarks, arrows in backlog.md), which crashes the Worker (1101).
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
