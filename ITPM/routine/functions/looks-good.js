const REPO = 'atimmer418/FRED';
const TODAY_PATH = 'ITPM/routine/today.html';
const BACKLOG_PATH = 'FREDdocs/backlog.md';

export async function onRequestPost(context) {
  const { request, env } = context;
  const githubToken = env.GITHUB_TOKEN;
  if (!githubToken) return json({ ok: false, error: 'GITHUB_TOKEN not configured' }, 500);

  let storyId = '';
  try {
    const body = await request.json();
    storyId = (body.storyId || '').trim();
  } catch (_) { /* storyId optional; state flip still runs */ }

  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'User-Agent': 'FRED-ITPM',
    'Accept': 'application/vnd.github+json'
  };

  // ── 1. Flip today.html data-state → looks_good ──
  // Accept either "completed" or "intermediary" as the source state so a
  // half-finished prior transition can still be closed out cleanly.
  const todayApi = `https://api.github.com/repos/${REPO}/contents/${TODAY_PATH}`;
  const todayRes = await fetch(todayApi, { headers });
  if (!todayRes.ok) return json({ ok: false, error: 'Could not fetch today.html' }, 502);
  const todayFile = await todayRes.json();
  const todayHtml = b64DecodeUtf8(todayFile.content.replace(/\n/g, ''));

  let updatedHtml = todayHtml
    .replace('data-state="completed"', 'data-state="looks_good"')
    .replace('data-state="intermediary"', 'data-state="looks_good"');

  if (updatedHtml !== todayHtml) {
    const putToday = await fetch(todayApi, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'itpm: looks good — approved completion',
        content: b64EncodeUtf8(updatedHtml),
        sha: todayFile.sha
      })
    });
    if (!putToday.ok) return json({ ok: false, error: await putToday.text() }, 502);
  }
  // If the state was already looks_good, that's fine — fall through to the checkmark.

  // ── 2. Checkmark the story in backlog.md so it's never re-picked ──
  let backlogMarked = false;
  if (/^FRED-\d+$/.test(storyId)) {
    const backlogApi = `https://api.github.com/repos/${REPO}/contents/${BACKLOG_PATH}`;
    const blRes = await fetch(backlogApi, { headers });
    if (blRes.ok) {
      const blFile = await blRes.json();
      const blContent = b64DecodeUtf8(blFile.content.replace(/\n/g, ''));

      // Heading looks like:  ## FRED-124 — 💤 Change bank account page...
      // Replace the status emoji (💤 / ⏳ / any) right after the em-dash with ✓.
      // Only touch the heading line for this exact story id.
      const lines = blContent.split('\n');
      let changed = false;
      for (let i = 0; i < lines.length; i++) {
        const headingRe = new RegExp('^(##\\s+' + storyId + '\\s+[—-]\\s+)(.*)$');
        const m = lines[i].match(headingRe);
        if (m) {
          // Strip a leading status emoji if present, then prepend ✓.
          const rest = m[2].replace(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✅⏳\u{1F4A4}]️?\s*)/u, '');
          if (!rest.startsWith('✓')) {
            lines[i] = m[1] + '✓ ' + rest;
            changed = true;
          }
          break;
        }
      }

      if (changed) {
        const putBl = await fetch(backlogApi, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `itpm: mark ${storyId} done (looks good)`,
            content: b64EncodeUtf8(lines.join('\n')),
            sha: blFile.sha
          })
        });
        backlogMarked = putBl.ok;
      }
    }
  }

  return json({ ok: true, backlogMarked });
}

// UTF-8-safe base64. Bare btoa/atob throw on code points > 0xFF (em-dashes,
// arrows, checkmarks all over today.html + backlog.md), which crashes the Worker.
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
