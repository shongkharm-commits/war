# Smart finEx

A money-exchange tracker web app (calculator + profit tracker + live market rates) for a currency exchange business. Languages: English & Lao.

The entire app is a single file: **`index.html`**. There is no build step — it runs directly in the browser using React + Tailwind loaded from CDNs.

## How to update the live website (smart-finex.com)

The site is hosted on **Cloudflare**. To publish a new version:

1. Edit `index.html` (or have it edited for you).
2. Upload the new `index.html` to your Cloudflare project:
   - Go to https://dash.cloudflare.com/
   - Open your **Workers & Pages** project for this site.
   - Use **Create deployment → Upload assets** and drop in the updated `index.html`
     (keep the `images/` folder too), **or** connect this GitHub repo so Cloudflare
     auto-deploys whenever the code changes.

## What this version fixed

- Added missing on-screen labels (Working Profit, We Buy, We Sell) that were showing as raw code words.
- Restored the "Scan Chat" AI instructions so photo-scanning of chat screenshots extracts transaction details correctly.

## IMPORTANT: the AI "Scan Chat" key

For safety, the OpenRouter API key is **not** stored in this repository. In `index.html`
you will find this line:

```js
const openRouterApiKey = "PASTE_YOUR_OPENROUTER_API_KEY_HERE";
```

Before the "Scan Chat" feature will work on the live site, replace that placeholder with
a real key from https://openrouter.ai/keys in the copy you upload to Cloudflare.

> The previous key was exposed publicly (it shipped inside the webpage), so generate a
> brand-new key on OpenRouter and delete the old one. Anyone could otherwise use it.

The rest of the app (calculator, tracker, market rates, Google sign-in, cloud sync) works
without this key — only the photo-scanning feature needs it.

## Notes

- The app also talks to **Firebase** (Google sign-in + cloud sync). Those settings live in the
  `cloudflareFirebaseConfig` block near the top of `index.html`. Firebase web config values are
  meant to be public, so they are fine to keep in the code.
- App data also saves locally in the browser, so it keeps working offline.
