# After Hours V2 — Go-live instructions

These steps are for your **existing** GitHub repository: <https://github.com/WizzleOfOZ/after-hours>.

**Current limitation:** A code upload is not a live deployment. Render must host the Node server, and Supabase must be connected if you want saves to survive cloud restarts.

## Before publishing: decide on source privacy

Your existing GitHub repository `WizzleOfOZ/after-hours` is **public**. The site itself can still have private invite codes, but public source code is visible to everyone. You can make the repository private under GitHub > Repository > Settings > General > Danger Zone > Change visibility if you prefer. A private repository requires connecting the GitHub account to Render instead of using a public-repository URL.

## 1. Publish the complete game to GitHub

1. Download and extract this project's zip on your Windows computer.
2. Install [Git for Windows](https://git-scm.com/downloads/win) if you haven't already. Allow Git Credential Manager to sign you in to GitHub.
3. Open the extracted folder: `server.js`, `package.json`, `public`, and `PUBLISH-TO-GITHUB.bat` must all be visible.
4. Double-click **`PUBLISH-TO-GITHUB.bat`**. It only stages files and shows them before asking permission to publish. Review the displayed file list and select `Y`.
5. GitHub may open a browser for authentication. Complete the sign-in as the owner of `WizzleOfOZ/after-hours`.
6. Confirm your files appear under <https://github.com/WizzleOfOZ/after-hours>. In particular look for `server.js`, `public/app.js`, `render.yaml`, and `.github/workflows/test.yml`.
7. On GitHub, go to **Actions** and verify the `Verify After Hours` job passes.

If your remote repo already has commits, a push can fail with a non-fast-forward error. The publishing script **never force-pushes**. In that case, use GitHub Desktop to clone the remote and copy these files into it, then commit and push normally.

Do not commit real `.env` files, API keys, database passwords, or local session data. These are excluded by `.gitignore` but you should still check what is staged.

## 2. Create durable cloud saves in Supabase

1. Sign in to <https://supabase.com/dashboard> and open **New Project**.
2. Name it `after-hours` and choose a location close to your users. Create a unique database password and store it in your password manager.
3. In **SQL Editor**, start a new query. Open `supabase-schema.sql` from the project, copy its contents into the editor, and click **Run**.
4. In **Table Editor**, confirm the `after_hours_rooms` table appears.
5. Open **Settings > API Keys** (or the project's **Connect** panel). Find the **Project URL** and create/locate an **`sb_secret_...` secret API key**. This key is powerful and must be kept in the server environment settings only. Do not paste it in chat, GitHub, or the website.

## 3. Deploy as a Web Service on Render

1. Visit <https://dashboard.render.com> and sign in.
2. Choose **New > Blueprint** and select `WizzleOfOZ/after-hours` as the source. The `render.yaml` file already has the Node server's build and start settings. (Alternatively, choose New > Web Service and enter the settings from `render.yaml`.)
3. Choose the Free instance for initial testing if offered; understand that idle cold starts and free-tier limits apply.
4. If prompted, enter these values from **your** Supabase project:
   - `SUPABASE_URL` → Project URL, such as `https://your-project.supabase.co`
   - `SUPABASE_SECRET_KEY` → **server-only** secret API key starting `sb_secret_`
5. Approve the Blueprint to deploy. Wait for the service status to show **Live**.
6. Open the assigned public `https://...onrender.com/health` endpoint and verify a JSON response including `"status":"ok"` and `"persistence":"supabase"`.
7. Open the base `https://...onrender.com` URL in your own browser. Create a room, copy the invitation link, and send it privately to Kris. Kris opens the **same site**, enters a name, and joins the room.
8. Test two-player movement, chapter changes, the rooftop garden, and reload recovery. Then start your date.

**Important:** Without the Supabase environment variables, the website will still start in local-save mode, but saves will not survive Render free-service resets. For dependable long-term persistence, finish Supabase before you play.

## 4. Sanity-check deployment

- Website loads over **HTTPS**, and browser DevTools > Network shows a successful `wss://` connection to `/ws`.
- `/health` reports `"persistence":"supabase"`.
- Create a room and join from a second computer / second browser profile.
- In Act I, check that both players can move/place traps and switch roles.
- In Act II, check generator/rune `Q` and node `E` actions from different browsers.
- In Act III, verify that garden pieces and constellation points synchronize.
- Refresh both clients and confirm the room reappears using the same link and browser profile.
- Download the finale keepsake after the lanterns meet.

## Troubleshooting

- **Git command not found:** Install Git for Windows. GitHub Desktop is an alternative.
- **Git push rejected:** Do not force-push. Clone the repository with GitHub Desktop and copy the project files into that clone, then commit and push.
- **Render says it can't find an app:** Verify `package.json` and `server.js` are in the repository's root folder. Do not select a static site.
- **Render won't start:** Check service Logs; both Supabase variables must be present and the SQL schema executed first.
- **`/health` returns `"persistence":"local"`:** The cloud environment variables were not configured for the running Render service; update them and redeploy.
- **Rooms disconnect after inactivity:** Free instances can sleep when idle and need to wake again. A connected client actively sending WebSocket messages should generally keep the service active.
- **Kris can't join:** Confirm the room link starts with the **same** public Render domain for both people, and that you didn't give her `localhost:3000`.
- **A third party got the code:** Create a new room and send a new link. Room codes are convenience invitations, not accounts or strong authentication.

For the full game instructions and controls, see `README.md`.
