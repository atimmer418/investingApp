export async function onRequestPost(context) {
  const { request, env } = context;

  let password;
  try {
    const body = await request.json();
    password = body.password;
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Compute expected password server-side using the secret from env var.
  // Eastern Time approx: subtract 5h from UTC (covers EST; EDT has 1-hr grace at midnight).
  const d = new Date();
  d.setHours(d.getHours() - 5);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const secret = env.ITPM_SECRET || '';
  const expected = m + secret + day;

  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'ITPM_SECRET not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const ok = password === expected;
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
