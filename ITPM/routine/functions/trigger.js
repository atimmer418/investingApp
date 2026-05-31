const REPO = 'atimmer418/FRED';
const FILE_PATH = 'ITPM/pending/action.json';
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

  const { type, content } = body;

  if (!type || !content) {
    return json({ ok: false, error: 'Missing type or content' }, 400);
  }

  // Step 1: GET existing file to retrieve SHA (needed for updates)
  let existingSha;
  const getResponse = await fetch(API_BASE, {
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'User-Agent': 'FRED-ITPM',
      'Accept': 'application/vnd.github+json'
    }
  });

  if (getResponse.ok) {
    const existing = await getResponse.json();
    existingSha = existing.sha;
  } else if (getResponse.status !== 404) {
    const err = await getResponse.text();
    return json({ ok: false, error: err }, 502);
  }

  // Step 2: Build the action payload and base64-encode it
  const actionPayload = {
    type,
    content,
    timestamp: new Date().toISOString()
  };
  const encoded = btoa(JSON.stringify(actionPayload, null, 2));

  // Step 3: PUT the file to GitHub
  const putBody = {
    message: `itpm: queue ${type} action`,
    content: encoded
  };
  if (existingSha) {
    putBody.sha = existingSha;
  }

  const putResponse = await fetch(API_BASE, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'User-Agent': 'FRED-ITPM',
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(putBody)
  });

  if (!putResponse.ok) {
    const err = await putResponse.text();
    return json({ ok: false, error: err }, 502);
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
