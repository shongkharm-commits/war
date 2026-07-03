// Returns (and clears) the pending alert message for a push subscription.
// Called by the service worker when a payload-less push wakes it up.

export async function onRequest({ request, env }) {
  if (!env.ALERTS) return json({}, 500);
  const endpoint = new URL(request.url).searchParams.get('e');
  if (!endpoint) return json({}, 400);
  const id = await sha256hex(endpoint);
  const raw = await env.ALERTS.get('msg:' + id);
  if (raw) {
    await env.ALERTS.delete('msg:' + id);
    try { return json(JSON.parse(raw)); } catch (e) {}
  }
  return json({});
}

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
