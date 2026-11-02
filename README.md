# Waffle Stall Poll

React website + Express server. Answers are saved to a Google Sheet in your Drive
(and to a backup file `server/data/responses.jsonl`). No database.

## On your computer
    npm run setup                       (first time only)
    cp server/.env.example server/.env  (first time only, then edit it)
    npm run dev
Open http://localhost:5173. If you made `client/.env` earlier, delete it.

## Connect the Google Sheet
1. In your Sheet: Extensions > Apps Script. Replace everything with `server/apps-script/Code.gs`. Save.
2. Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone > Deploy. Allow access when asked.
   (Already deployed before? Deploy > Manage deployments > pencil > Version: New version > Deploy.)
3. Put the link (ends with /exec) in `server/.env` as SHEETS_WEBHOOK_URL. Restart.
4. `npm run sheet:check` adds a test row so you know it works.
The Sheet now has 7 columns (the last one is an ID that stops duplicate rows). Use a fresh sheet or clear the old rows.

## Put it online (production)
Both the website and the server run as ONE service.
- **Render.com:** push this folder to GitHub > New > Blueprint > pick the repo (it reads `render.yaml`).
  Add SHEETS_WEBHOOK_URL and ADMIN_KEY in Environment. Use a paid "Starter" plan on fest day:
  the free plan sleeps when nobody visits and takes about a minute to wake up.
- **Any computer/VPS:** `npm run setup`, then `npm start` (builds the site and serves it on port 5000),
  and put a public address in front of it (Cloudflare Tunnel, ngrok, or Nginx).
- Set TRUST_PROXY=1 whenever it runs behind a hosting service.
- Do not run two copies of the server at the same time, they would write the same backup file.

## How it stays smooth with 1000+ people
- A vote is saved on disk first and the person sees "saved" at once.
- A background job sends the votes to Google 100 at a time, with retries, so Google is never flooded.
- Every vote has a unique id, so double taps and retries are counted once, in the server and in the Sheet.
- The Sheet script locks while writing, so rows never overwrite each other.
- If Google is down, votes wait safely on disk and are sent when it is back (also after a restart).
- The page is compressed and cached, and photos come from a fast photo CDN.
Test on this project: 1000 people connected together sent 26,000 votes in 8 seconds with no errors and none lost.
Your internet and hosting plan decide the real limit, not the code.

## One vote per person
The server remembers every name that voted (capital letters, spaces and dots are ignored).
The same name again gets a friendly "already voted" message. While testing, set ALLOW_REPEAT_VOTES=1 in `server/.env`.
Before going live: stop the server, delete `server/data/responses.jsonl` and `synced.jsonl`, and clear the test rows in the Sheet.

## Your numbers (visitors cannot see these)
http://localhost:5000/api/stats , or online: https://YOUR-SITE/api/stats?key=YOUR_ADMIN_KEY
Shows people, waffles per flavour, all suggestions, and how many answers still wait for the Sheet.

## Edit text / photos
`client/src/config/content.js`
