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
  const currentContent = atob(file.content.replace(/\n/g, ''));
  const updated = currentContent.replace('data-state="completed"', 'data-state="looks_good"');

  if (updated === currentContent) return json({ ok: false, error: 'data-state="completed" not found in file' }, 400);

  const putRes = await fetch(API_BASE, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'itpm: looks good — approved completion',
      content: btoa(updated),
      sha: file.sha
    })
  });

  if (!putRes.ok) return json({ ok: false, error: await putRes.text() }, 502);
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' }
  });
}
