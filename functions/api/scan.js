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

    const prompt = `You are a data extraction assistant for a money exchange business. Analyze this chat screenshot and extract the currency exchange transaction details. The supported currencies are USD, USDT, THB, CNY (foreign currencies) and LAK, THB (local settlement currencies). Return ONLY a single valid JSON object, with no extra text, in this exact shape:
{
  "unitAmt": "<the foreign currency amount being exchanged, digits only, no commas>",
  "rate": "<the exchange rate, digits only, no commas>",
  "resAmt": "<the resulting total amount, digits only, no commas>",
  "unitCur": "<one of USD, USDT, THB, CNY>",
  "resCur": "<one of LAK, THB>"
}
If any value cannot be determined from the image, use an empty string "" for that field. Do not guess wildly. Do not include explanations, markdown, or code fences — output the raw JSON object only.`;

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

    const responseText = data?.choices?.[0]?.message?.content || "{}";
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
