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

  // ── 2. Checkmark the completed story AND re-sort the whole backlog ──
  // by status: Ready (no marker) → Sleeping (💤) → Blocked (🚫) → Done (✓).
  let backlogMarked = false;
  let backlogReorganized = false;
  const backlogApi = `https://api.github.com/repos/${REPO}/contents/${BACKLOG_PATH}`;
  const blRes = await fetch(backlogApi, { headers });
  if (blRes.ok) {
    const blFile = await blRes.json();
    const blContent = b64DecodeUtf8(blFile.content.replace(/\n/g, ''));

    const { markdown, marked } = reorganizeBacklog(blContent, storyId);
    backlogMarked = marked;

    if (markdown !== blContent) {
      const putBl = await fetch(backlogApi, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `itpm: mark ${storyId || 'story'} done + re-sort backlog (looks good)`,
          content: b64EncodeUtf8(markdown),
          sha: blFile.sha
        })
      });
      backlogReorganized = putBl.ok;
    }
  }

  return json({ ok: true, backlogMarked, backlogReorganized });
}

// Parse every "## PREFIX-NNN — ..." story (FRED-, LPFRED-, DEV-, etc.), optionally
// checkmark `doneId`, then regroup by status and rebuild the file. Story bodies run
// from one "## " heading to the next "## "/"# ". Old "# CATEGORY" headers are dropped.
function reorganizeBacklog(content, doneId) {
  const lines = content.split('\n');
  const headingRe = /^##\s+([A-Z]+-\d+)\s*[—-]\s*(.*)$/;
  const stories = [];
  let marked = false;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headingRe);
    if (!m) continue;
    const id = m[1];
    let heading = lines[i];
    const body = [];
    i++;
    while (i < lines.length && !/^#{1,2}\s/.test(lines[i])) { body.push(lines[i]); i++; }
    i--; // step back; outer loop will re-test this line

    // Checkmark the finished story: strip any leading status marker, prepend ✓.
    if (doneId && id === doneId) {
      const hm = heading.match(/^(##\s+[A-Z]+-\d+\s*[—-]\s*)(.*)$/);
      if (hm) {
        const rest = hm[2].replace(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✅⏳\u{1F4A4}]️?\s*)/u, '');
        if (!rest.startsWith('✓')) { heading = hm[1] + '✓ ' + rest; marked = true; }
      }
    }
    stories.push({ id, heading, body: body.join('\n').replace(/\s+$/, '') });
  }

  const statusOf = (heading) => {
    const after = heading.replace(/^##\s+[A-Z]+-\d+\s*[—-]\s*/, '');
    if (after.startsWith('✓')) return 'done';
    if (after.startsWith('💤')) return 'sleeping';
    if (after.startsWith('🚫')) return 'blocked';
    return 'ready';
  };

  const groups = { ready: [], sleeping: [], blocked: [], done: [] };
  for (const s of stories) groups[statusOf(s.heading)].push(s);
  const num = (s) => parseInt(s.id.match(/-(\d+)/)[1], 10);
  for (const g of Object.keys(groups)) groups[g].sort((a, b) => num(a) - num(b));

  const sections = [
    ['ready',    '# ✅ READY — Most Suitable for Next Work', '_No status marker. These are the candidates the ITPM routine should pick from first._'],
    ['sleeping', '# 💤 SLEEPING — Backlog (not yet started)', '_Queued but not prioritized. Promote to READY (remove the 💤) when ripe._'],
    ['blocked',  '# 🚫 BLOCKED — Waiting on Something', '_Cannot proceed until a dependency or external party clears._'],
    ['done',     '# ✓ DONE — Completed', '_Shipped. Kept for history; never re-picked._']
  ];

  const out = [
    '# FRED BACKLOG', '',
    '> Auto-organized by status: Ready → Sleeping → Blocked → Done.',
    '> The ITPM Looks-Good trigger checkmarks the finished story and re-sorts this file.', ''
  ];
  for (const [key, header, desc] of sections) {
    out.push(header, desc, '');
    for (const s of groups[key]) {
      out.push(s.heading);
      if (s.body.trim()) out.push(s.body);
      out.push('');
    }
    out.push('');
  }
  return { markdown: out.join('\n').replace(/\s+$/, '') + '\n', marked };
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
