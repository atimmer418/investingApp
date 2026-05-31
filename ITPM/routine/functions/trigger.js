const TRIGGER_ID = 'trig_01Lk17E9GS5sZ9mdjGH9gnGH';

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.CLAUDE_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: 'CLAUDE_API_KEY not configured' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const { type, content } = body; // type: 'approval' | 'revision', content: string

  if (!type || !content) {
    return json({ ok: false, error: 'Missing type or content' }, 400);
  }

  const triggerResponse = await fetch(
    `https://claude.ai/api/v1/code/triggers/${TRIGGER_ID}/run`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-beta': 'claude-code-remote-triggers-2025-05-14'
      },
      body: JSON.stringify({
        message: type === 'approval'
          ? `ITPM APPROVAL\n\n${content}`
          : `ITPM REVISION REQUEST\n\n${content}`
      })
    }
  );

  if (!triggerResponse.ok) {
    const err = await triggerResponse.text();
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
