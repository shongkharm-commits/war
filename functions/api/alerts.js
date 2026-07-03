// Stores each device's push subscription + its active alerts in Cloudflare KV.
// Requires a KV namespace bound as "ALERTS" in the Pages project settings.

export async function onRequestPost({ request, env }) {
  if (!env.ALERTS) return json({ error: "KV binding 'ALERTS' is not configured." }, 500);
  let payload;
  try { payload = await request.json(); } catch (e) { return json({ error: 'Bad JSON' }, 400); }
  const { subscription, alerts } = payload || {};
  if (!subscription || !subscription.endpoint) return json({ error: 'Missing subscription' }, 400);

  const id = await sha256hex(subscription.endpoint);
  const active = Array.isArray(alerts) ? alerts.filter(a => a && a.active) : [];

  if (active.length === 0) {
    await env.ALERTS.delete('sub:' + id);
    return json({ ok: true, cleared: true });
  }
  await env.ALERTS.put('sub:' + id, JSON.stringify({ subscription, alerts: active }), { expirationTtl: 60 * 60 * 24 * 90 });
  return json({ ok: true, count: active.length });
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
