# Smart finEx

A money-exchange tracker web app (calculator + profit tracker + live market rates) for a currency exchange business. Languages: English & Lao.

The app code lives in **`src/app.jsx`**. It is pre-compiled to **`app.js`** so the browser
does not have to compile anything on startup (this makes the app open in about a second
instead of several). `index.html` loads `app.js` plus React and Tailwind from CDNs.

### Editing the app

1. Edit **`src/app.jsx`** (this is the source of truth — do not edit `app.js` by hand).
2. Run **`bash build.sh`** to regenerate `app.js`.
3. Commit both `src/app.jsx` and `app.js`.

Cloudflare just serves the files as-is (no build step on its side), so committing the
compiled `app.js` is what updates the live site.

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

## The AI "Scan Chat" key (now kept secret on the server)

The OpenRouter API key is **never** stored in this repository or in the webpage code.
Putting a key in `index.html` would expose it to every visitor (a website file is
downloaded to each visitor's browser), which is how the original key was drained.

Instead, the key lives in a small server-side helper: **`functions/api/scan.js`** (a
Cloudflare Pages Function). The website calls `/api/scan`, and that function reads the
key from a private environment variable and talks to OpenRouter. Visitors never see it.

### One-time setup in Cloudflare

1. Go to https://dash.cloudflare.com/ → **Workers & Pages** → your project.
2. Open **Settings → Environment variables**.
3. Add a variable named exactly **`OPENROUTER_API_KEY`** with your key from
   https://openrouter.ai/keys as the value. Mark it as a **Secret** if offered.
4. Save and **re-deploy** so the new value takes effect.

> Make sure the deployed project includes the `functions/` folder (alongside
> `index.html` and `images/`). Cloudflare turns it into the `/api/scan` endpoint
> automatically.

The rest of the app (calculator, tracker, market rates, Google sign-in, cloud sync) works
without this key — only the photo-scanning feature needs it.

### Tip: set a spending limit

On the OpenRouter key page you can set a credit limit per key. Setting a small cap means
that even in a worst case, spending is bounded.

## Notes

- The app also talks to **Firebase** (Google sign-in + cloud sync). Those settings live in the
  `cloudflareFirebaseConfig` block near the top of `index.html`. Firebase web config values are
  meant to be public, so they are fine to keep in the code.
- App data also saves locally in the browser, so it keeps working offline.
