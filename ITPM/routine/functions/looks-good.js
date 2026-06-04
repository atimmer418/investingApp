const REPO = 'atimmer418/FRED';
const FILE_PATH = 'ITPM/routine/today.html';
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

export async function onRequestPost(context) {
  const { env } = context;
  const githubToken = env.GITHUB_TOKEN;
  if (!githubToken) return json({ ok: false, error: 'GITHUB_TOKEN not configured' }, 500);

  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'User-Agent': 'FRED-ITPM',
    'Accept': 'application/vnd.github+json'
  };

  const getRes = await fetch(API_BASE, { headers });
  if (!getRes.ok) return json({ ok: false, error: 'Could not fetch file' }, 502);

  const file = await getRes.json();
  const currentContent = b64DecodeUtf8(file.content.replace(/\n/g, ''));
  const updated = currentContent.replace('data-state="completed"', 'data-state="looks_good"');

  if (updated === currentContent) return json({ ok: false, error: 'data-state="completed" not found in file' }, 400);

  const putRes = await fetch(API_BASE, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'itpm: looks good — approved completion',
      content: b64EncodeUtf8(updated),
      sha: file.sha
    })
  });

  if (!putRes.ok) return json({ ok: false, error: await putRes.text() }, 502);
  return json({ ok: true });
}

// UTF-8-safe base64. Bare btoa/atob throw on code points > 0xFF (em-dashes,
// arrows, checkmarks all over today.html), which crashes the Worker (1101).
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
    status, headers: { 'Content-Type': 'application/json' }
  });
}
