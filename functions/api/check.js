// Background alert checker. Called every few minutes by a cron trigger.
// Fetches live rates, evaluates every stored alert (crossing semantics,
// same as the app), and sends a Web Push to devices whose alerts fired.
//
// Requires:
//   - KV namespace bound as "ALERTS"
//   - env var VAPID_JWK = the private VAPID key (JWK JSON, kept secret)

const VAPID_PUBLIC_KEY = 'BKffzv2ooeFsQuqmpXlswuao0CEh1_ynY6myaUGcWDHEFA4es17y5tEqbAXaGIVuzsS4BNFNQvVqJr8CzZX6CPA';
const SYMBOLS = { DXY: 'DX-Y.NYB', USDTHB: 'THB=X', CNYTHB: 'CNYTHB=X', USDCNY: 'CNY=X', USDVND: 'VND=X' };

export async function onRequest({ env }) {
  if (!env.ALERTS) return json({ error: "KV binding 'ALERTS' is not configured." }, 500);

  const list = await env.ALERTS.list({ prefix: 'sub:' });
  if (list.keys.length === 0) return json({ ok: true, subscriptions: 0 });

  // Fetch live prices once (server-side: no CORS proxy needed).
  const prices = {};
  await Promise.all(Object.entries(SYMBOLS).map(async ([key, sym]) => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`, { headers: { 'User-Agent': 'Mozilla/5.0 (SmartFinEx alert bot)' } });
      if (r.ok) {
        const d = await r.json();
        const p = d.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (p) prices[key] = p;
      }
    } catch (e) {}
  }));

  let fired = 0;
  for (const k of list.keys) {
    const raw = await env.ALERTS.get(k.name);
    if (!raw) continue;
    let rec; try { rec = JSON.parse(raw); } catch (e) { continue; }
    if (!rec || !rec.subscription || !Array.isArray(rec.alerts)) continue;

    let changed = false;
    for (const a of rec.alerts) {
      if (!a.active) continue;
      const p = prices[a.asset];
      if (!p) continue;
      const condMet = a.condition === 'above' ? p >= a.price : p <= a.price;
      if (a.armed === false) {
        if (!condMet) { a.armed = true; changed = true; }
        continue;
      }
      if (condMet) {
        a.active = false; changed = true; fired++;
        const id = k.name.slice(4);
        const msg = {
          title: `🚨 ${a.asset} Alert`,
          body: `${a.asset} crossed ${a.condition === 'above' ? 'above' : 'below'} ${a.price} — now ${Number(p.toFixed(4))}`
        };
        await env.ALERTS.put('msg:' + id, JSON.stringify(msg), { expirationTtl: 3600 });
        await sendPush(rec.subscription, env);
      }
    }
    if (changed) await env.ALERTS.put(k.name, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 90 });
  }

  return json({ ok: true, subscriptions: list.keys.length, prices, fired });
}

// Sends an empty (payload-less) Web Push signed with our VAPID key. The
// service worker then fetches the message text from /api/pending.
async function sendPush(subscription, env) {
  try {
    if (!env.VAPID_JWK) return;
    const jwk = JSON.parse(env.VAPID_JWK);
    const { origin } = new URL(subscription.endpoint);
    const header = b64uStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const payload = b64uStr(JSON.stringify({ aud: origin, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:info@smart-finex.com' }));
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(header + '.' + payload)));
    const jwt = `${header}.${payload}.${b64uBytes(sig)}`;
    await fetch(subscription.endpoint, {
      method: 'POST',
      headers: { 'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`, 'TTL': '86400' }
    });
  } catch (e) {}
}

function b64uStr(s) { return b64uBytes(new TextEncoder().encode(s)); }
function b64uBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
