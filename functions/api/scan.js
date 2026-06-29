// Cloudflare Pages Function — secure proxy for the "Scan Chat" feature.
//
// The OpenRouter API key lives ONLY here, read from an environment variable
// you set in the Cloudflare dashboard (Settings -> Environment variables) as
// OPENROUTER_API_KEY. It is never sent to the browser, so visitors cannot see
// or steal it. The website calls this endpoint (/api/scan) instead of calling
// OpenRouter directly.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { base64Data, mimeType } = await request.json();

    if (!base64Data || !mimeType) {
      return json({ error: { message: "Missing image data." } }, 400);
    }

    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return json(
        { error: { message: "Server is not configured: add OPENROUTER_API_KEY in Cloudflare settings." } },
        500
      );
    }

    const prompt = `You are a data extraction assistant for a Lao money exchange business. The image may be a bank exchange history (e.g. BCEL, LDB) or a chat screenshot showing one or more currency exchange transactions.

IMPORTANT — TRUE RATE CALCULATION:
Each bank transaction typically shows:
- The foreign currency amount (USD, THB, CNY, USDT)
- A listed rate (e.g. 22,692 K/$)
- A BASE exchange amount in LAK (labeled "ແລກ" or similar)
- A FEE in LAK (labeled "ຄ່າທຳຄູນ", "ຖາທຳຄູນ", or "ຄ່າທຳນຽມ" — this is added cost the customer pays)

For each transaction you MUST:
1. Find unitAmt = the foreign currency amount
2. Find resAmt = BASE exchange amount + FEE (total LAK the customer actually pays/receives)
3. Calculate the TRUE rate = resAmt / unitAmt (round to 2 decimal places)
   — Do NOT use the listed rate; always compute rate from the actual totals.

Return ONLY a valid JSON array (even if there is only one transaction), no extra text, in this exact shape:
[
  {
    "unitAmt": "<foreign currency amount, digits only, no commas>",
    "rate": "<TRUE computed rate = resAmt / unitAmt, 2 decimal places>",
    "resAmt": "<total LAK = base exchange + fee, digits only, no commas>",
    "unitCur": "<one of USD, USDT, THB, CNY>",
    "resCur": "<LAK or THB>"
  }
]

Rules:
- If no fee is visible, resAmt = base exchange amount and rate = listed rate.
- If a value cannot be determined, use "" for that field.
- Do not guess. Do not include markdown, code fences, or explanations — output the raw JSON array only.`;

    const payload = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
          ],
        },
      ],
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": new URL(request.url).origin,
        "X-Title": "Smart finEx",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return json({ error: { message: data?.error?.message || `OpenRouter Error ${res.status}` } }, res.status);
    }

    const responseText = data?.choices?.[0]?.message?.content || "[]";
    return json({ responseText }, 200);
  } catch (err) {
    return json({ error: { message: err?.message || "Scan failed." } }, 500);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
