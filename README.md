# AFTER HOURS · Version 2

A playable two-person date-night browser game for Wizzle and Kris. Laugh together → cooperate → make something romantic together.

**Status:** Complete playable **2D** browser prototype with a real-time room server. Version 2 adds optional **Supabase cloud persistence**, high-DPI rendering, comedy combos, and cooperative generator/rune objectives. It is **not a full 3D game** or a professionally illustrated AAA production.

**Requirements:** Windows / macOS / Linux computer, Node.js 20 or newer, current Chrome/Edge browser, internet access if playing from different homes. **No `npm install` dependencies.** Each player needs a separate browser and should use Discord voice chat for teamwork.

**Go-live shortcut:** See [`GO-LIVE.md`](GO-LIVE.md) for the Windows GitHub publisher and Render Blueprint deployment path for `WizzleOfOZ/after-hours`.

## 1 · Test the game on your computer first

1. Download `after-hours-v2.zip` and right-click → **Extract All**.
2. Open the extracted `after-hours-v2` folder. Verify `server.js`, `package.json`, `public`, and `START-AFTER-HOURS.bat` are present.
3. Install **Node.js LTS** from https://nodejs.org/ if you haven't already. Close and reopen terminal windows after installation.
4. On Windows, double-click `START-AFTER-HOURS.bat`. On macOS/Linux, open a terminal **inside the extracted folder** and run `npm start`.
5. Look for `After Hours ready: http://localhost:3000 (local saves)`.
6. Open `http://localhost:3000` in Chrome or Edge, enter a name, and select **CREATE OUR NIGHT**.
7. A **six-character room code** appears. The host may start when the second player joins.
8. Leave the server terminal open while playing. To stop it, focus the terminal and press **Ctrl+C**.

To test both players on one PC, open the game in one normal Chrome window and one *incognito* window, each with a different name. The incognito window has its own player ID.

### Playing from two PCs in the same home

1. Run the game server on one computer as above.
2. On the hosting computer, open Windows Command Prompt and run `ipconfig`.
3. Find the IPv4 address for your active Wi-Fi/Ethernet adapter, e.g. `192.168.1.51` (yours will differ).
4. On the second PC, visit `http://192.168.1.51:3000`, using the **actual** host IPv4 address.
5. Permit Node.js on **Private** networks if Windows Firewall prompts. Do not open internet-facing router ports for this project.
6. Have player two join with the room code from player one.

**`localhost` means the current computer.** Kris cannot use your `localhost` URL when she is at a different home.

## 2 · Put the game online so you can play from different homes

There are two components: a Node.js game **Web Service** running on a host such as Render, and (optional but strongly recommended) a Supabase database for durable saves. GitHub Pages by itself cannot run this WebSocket multiplayer server.

### Step A — Create your Supabase project (optional, recommended)

1. Visit https://supabase.com/dashboard and sign in or create an account.
2. Select **New Project** and choose your organization, project name (e.g. `after-hours`), region, and a strong database password. Store the database password securely. You will not put it into the website.
3. Once the project is ready, open **SQL Editor** → **New query**.
4. Open this project's `supabase-schema.sql` file in a text editor, copy its entire contents into the SQL Editor, and click **Run**. This creates one `after_hours_rooms` table and blocks anonymous access. You can verify the table from **Table Editor**.
5. Go to your project's **Connect** dialog or **Settings → API Keys**. Locate **Project URL** (`https://...supabase.co`) and your **Secret key** (starts `sb_secret_`). If no secret key exists, create one from the Publishable and secret API keys tab. **Do not use the publishable key or anon key.**
6. **Do not paste the secret key into `public/app.js`, a GitHub commit, chat, or a public issue.** Keep it in the private server's environment settings. `SUPABASE_SECRET_KEY` and the Project URL will be configured on Render in Step C below.

The legacy `service_role` JWT is also supported for existing projects via `SUPABASE_SERVICE_ROLE_KEY`, but new deployments should use `SUPABASE_SECRET_KEY` with a modern `sb_secret_` key. The modern key is passed only as the `apikey` HTTP header, not as a Bearer JWT.

**No Supabase project?** Leave the cloud variables unset. The server falls back to `data/rooms.json`. That is adequate for local play, but **not reliable on Render Free**, which loses local data on a restart or spin-down.

### Step B — Put the project on GitHub

**Beginner-friendly GitHub Desktop method**

1. Install GitHub Desktop from https://desktop.github.com and sign in.
2. Open **File → Add local repository**, then select the extracted `after-hours-v2` folder.
3. If the folder is not yet a repository, choose **Create a Repository Here** and name it `after-hours-v2`.
4. Review changed files. Make sure you are **not including a real `.env` file, secret key, or `data/rooms.json`**; these are ignored by `.gitignore`.
5. Enter a commit summary, e.g. `After Hours v2 multiplayer game`, and click **Commit to main**.
6. Select **Publish repository** and choose **Private** if you want the game source private. You can make it public if you prefer.
7. Future updates: copy the new files into the local repository, commit, and **Push origin**.

### Step C — Deploy to Render as a live Node.js service

1. Sign in to https://dashboard.render.com.
2. Select **New → Web Service**. **Do not select Static Site.**
3. Connect the GitHub account/repository containing this project.
4. Configure the service:
   - Language/runtime: **Node**
   - Root directory: **blank** (if `package.json` is at the repository root)
   - Build command: `npm install`
   - Start command: `npm start`
   - Health-check path (if offered): `/health`
   - Compute: Free for a trial; a paid instance offers better availability
5. Under your Render service's **Environment** settings, choose **Add Environment Variable** and add:
   - Key: `SUPABASE_URL` · Value: your Supabase Project URL
   - Key: `SUPABASE_SECRET_KEY` · Value: your Supabase **private secret key** starting with `sb_secret_`
   If skipping cloud saves, leave **both** unset. Never configure only one.
6. Save/deploy the updated configuration. Wait until Render indicates the service is **Live**.
7. Open the provided `https://...onrender.com` website URL from **both** PCs, not `localhost`.
8. On your PC, create a room and share the invite URL with Kris. On her PC, she opens it, enters her name, and selects **JOIN ROOM**. Once you see both names, choose **LET THE NIGHT BEGIN**.

**Verify cloud is enabled:** open `https://YOUR-RENDER-URL/health` in a browser. A response containing `"persistence":"supabase"` confirms the app has started in cloud mode. `"persistence":"local"` means the database environment variables were not applied.

**If the app won't start:** open **Render Dashboard → your Web Service → Logs**. The server will refuse to start rather than silently replace cloud data when Supabase is misconfigured or unavailable. Confirm the table exists, the private secret key is correct, both variables are present, and the table permissions from `supabase-schema.sql` were applied.

**Hosting limitations:** Render Free services spin down when idle and have ephemeral local files. Cloud saves survive a service restart when Supabase is configured, but an idle server still causes a temporary disconnection and may need time to restart. Supabase itself has plan limitations; it is not a guarantee of 100% uptime. Do not use this as permanent storage for sensitive personal data.

## 3 · Playing the complete date

### Lobby — The Arrival

Both join the same six-character room. Use Discord voice chat to talk naturally. You can navigate between chapters through **VIEW ROOM**; only the host changes chapters. Switching does **not** delete the existing shared garden or constellation.

### Act I — B-Movie Meltdown (laughter)

Four interactive sets: Cabin Catastrophe, Vampire Problems, Grocery of the Dead, Love from Outer Space.

- **Actor:** Use **WASD** or arrow keys to move, hold **Shift** to run. Collect all **four** glowing props and then reach the right-side exit door.
- **Director:** Select **Pie**, **Spring**, **Ghost**, or **Slime** in the control panel, then click the set to place it. A new trap is available roughly once every second. A hit adds chaotic motion, but does not end the round.
- **New in Version 2:** If the actor collects a movie prop within 3.5 seconds after a trap hits, you both earn a **Chaos Combo** worth bonus points.
- After completing a set, the host selects **NEXT DISASTER**. Your actor/director roles switch automatically. Finish four sets to reach the Blackout.

### Act II — The Blackout (cooperation)

Three environments: The Collapsing Lobby, The Phantom Ballroom, and The Broken Tower. Every environment has three circuits to restore, and both players have separate characters and objectives.

- Both move with **WASD** or arrow keys.
- **New in Version 2:** Some circuits begin with a glowing **power station** that must be activated before the energy nodes can link. The amber **physical** player can charge amber generators; the violet **spirit** player can awaken violet runes. On the final stage, both must use their own stations.
- The player with a power station walks close enough to it and presses **Q**. The device changes to **CHARGED**.
- After every required station is charged, each player finds their own glowing node, approaches it, and presses **E**. You must press **E** within eight seconds of one another to link the circuit.
- If the timer expires, simply coordinate and press **E** again. There is no lives system, death penalty, or punishment.
- Complete the three circuits and select **ENTER NEXT AREA**. After stage three, the rooftop opens.

### Act III — Our Frequency (romance)

This is deliberately unhurried. There are no competitive points or mandatory questions.

- **Music:** Pick between four original in-browser synthesized pieces and select **Rose**, **Violet**, **Rain**, or **Gold** atmosphere. You can add real music-service links to the shared list. Linked commercial songs open on each person's own device — **they do not play or synchronize inside the site**.
- **Stars:** Click the open sky to place glowing stars. Both players add points to one shared constellation.
- **Garden:** Select a flower, fern, lantern, mushroom, or crystal, then click the terrace to place it. Each person plants at least two objects. Choose one secret gift for the other. Gifts are hidden from the other player until both have selected one.
- You can switch between these activities without erasing earlier work. When you both feel finished, the host opens the lantern finale.

### Finale — Until the Next Midnight

Each player clicks/drags their lantern into the moonlit center. Once both lanterns arrive, a private ending unlocks. Select **SAVE OUR KEEPSAKE** to download a 1600 × 1000 PNG recording the two names, constellation, shared garden, date, and chaos score.

## 4 · Progress recovery, privacy, troubleshooting

- A session is linked to a browser-generated **profile ID** stored in that browser's localStorage. After refresh, open the original room URL and use **JOIN ROOM** with the same browser profile.
- Progress autosaves every few seconds and at server shutdown. If the browser disconnects, the frontend attempts to reconnect automatically.
- Room codes are **private invitation codes**, not secure account login. Anyone possessing the code can attempt to enter the room. Do not use the app for secret messages or financial/medical information.
- Cloud keys belong **server-side only**. The `/health` endpoint exposes only the storage mode, not the key.
- **Sound silent?** Click the Sound button to enable the original browser-synthesized audio. Browsers require a click before sounds can play.
- **Cannot join?** Ensure both browsers visit the **same** server address. Two separately running localhost servers are not connected.
- **Screen looks cramped?** Use a laptop/desktop Chrome or Edge window at 100% zoom. Keyboard + pointer controls are designed for PCs, not touch phones.
- **Server can't connect to Supabase?** Check the Project URL, secret key, schema SQL, and service logs. The application intentionally fails to start when configured cloud storage is inaccessible.
- **Need to start over?** Host can select START A NEW NIGHT after the ending. This resets shared creations in that room; download the keepsake first.

## 5 · Developers: files and tests

| File | Purpose |
|---|---|
| `server.js` | HTTP/WebSocket multiplayer authority, minigame logic, save scheduling, rate limiting |
| `persistence.js` | Local atomic JSON storage or optional Supabase PostgREST cloud backend |
| `supabase-schema.sql` | SQL table, row-level-security settings, server-only grants |
| `.env.example` | Environment variable names; **example only**, no credentials |
| `public/index.html` | Website screens and canvas shell |
| `public/styles.css` | Responsive gothic-neon visual styling |
| `public/app.js` | Original canvas graphics, high-DPI scaling, input, audio, keepsake PNG |
| `tests/` | Two-player gameplay, restoration, and mocked cloud database tests |

Check Node.js (`node --version`) then run automated tests in the project folder:

```bash
npm test
```

To run locally without cloud credentials:

```bash
npm start
```

To run with Supabase credentials, set the variables in your operating system or hosting dashboard and launch `npm start`. You must run the `supabase-schema.sql` once beforehand. Environment variables configured in `.env` files are **not automatically loaded by Node 20** in this project.

**Technical limitations:** The visuals are original 2D vector/Canvas artwork with high-DPI display backing, not hand-painted HD assets or 3D environments. Cloud storage is a single-process architecture for private two-player dates: don't operate multiple independent app servers on the same database without adding cross-instance synchronization. There is no native streaming of copyrighted tracks or generated video highlight movie.
