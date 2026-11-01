# AFTER HOURS
### A private, real-time date-night adventure for two

**Players:** 2 people on their own computers. **Genre:** co-op comedy → supernatural teamwork → romantic creative play. **Technology:** Node.js server, browser Canvas, native WebSockets. **Dependencies:** none. **Status:** first fully playable 2D prototype.

## What's inside

1. **B-Movie Meltdown — 4 movie sets.** One player controls the actor with WASD or the arrow keys and Shift to dash, collecting four movie props before reaching EXIT. The other player clicks on the movie set to place pies, spring traps, ghosts, or slime. Playful trap impacts bounce or temporarily slow the actor. Roles alternate with each new set. Finish four scenes to advance.
2. **The Blackout — 3 co-op areas.** Each player controls a character. Reach your individually assigned glowing node and press **E**. Your partner has eight seconds to activate their paired node. Complete three circuits in each of the three areas.
3. **Our Frequency — open-ended rooftop.** Play four original, browser-synthesized ambient pieces; change rooftop lighting and rain; add links to music services; draw one shared constellation by clicking the sky; place six types of plants and decorations in a shared garden; exchange secret symbols.
4. **Finale.** Each person clicks/drags their lantern toward the illuminated circle below the moon. Once both have arrived, the couple unlocks a downloadable, personalized 1600 × 1000 keepsake PNG.

A separate **private 6-character room code** connects you. The two players see the same room state live. The server automatically saves active room data every few seconds to `data/rooms.json`, except on hosts with temporary filesystems.

---

## OPTION A — Play at home on one PC (first test)

### Step 1. Install Node.js

On Windows, visit https://nodejs.org/ and install the current **LTS** release. During installation, keep the normal/default options. If the installer asks to install additional tools, you do **not** need anything extra for this project.

When installation finishes, close and reopen Command Prompt (or Windows Terminal).

### Step 2. Extract the project

1. Download `after-hours-date-night.zip`.
2. Right-click the ZIP and select **Extract All**.
3. Open the extracted `after-hours` folder.
4. Confirm the folder contains `package.json`, `server.js`, `public`, and `README.md`.

### Step 3. Open a terminal in the project folder

In Windows File Explorer, navigate **inside** the folder containing `package.json`, click the address bar, type `cmd`, and press Enter. This opens Command Prompt directly in the correct folder.

### Step 4. Start the server

Run:

```bat
node --version
npm start
```

The first command checks Node.js. The second launches the game. You should see:

```text
After Hours ready: http://localhost:3000
```

**Leave this command window open** while playing. Closing it stops the server.

### Step 5. Open the site

In Chrome or Edge, visit:

`http://localhost:3000`

Enter your name and select **Create Our Night**. You'll receive a 6-character room code. A second person can then join from another computer using the methods below.

To stop the server, click the Command Prompt and press **Ctrl+C**.

---

## OPTION B — Play on two PCs connected to the same home network

Follow Option A on **one** computer. That machine must stay running.

1. On the computer running the server, open a *second* Command Prompt (don't close the first).
2. Run `ipconfig`.
3. Look for **IPv4 Address** under the active Wi-Fi or Ethernet connection, such as `192.168.1.50`. Your number will be different.
4. On the other computer, open `http://YOUR-IP-ADDRESS:3000`, replacing `YOUR-IP-ADDRESS` with the number from step 3. For example: `http://192.168.1.50:3000`.
5. If Windows Defender Firewall asks whether to allow Node.js, allow access on **Private networks**. Do not open your router's ports to the public internet for this prototype.
6. The host creates a room and the other person joins using the on-screen code.

**Important:** `localhost` works only on the computer running the server. Do **not** send a `localhost` invite link to a second computer. Use the local IP or, when you're in different locations, the published HTTPS URL described in Option C.

---

## OPTION C — Play from different homes / different internet connections

Both computers must be able to reach the same online Node.js server. **GitHub Pages alone is not enough** because this is a live multiplayer app with a server and WebSocket connections. Use a Node-compatible hosting service such as Render.

### C1. Put the code on GitHub

**Beginner-friendly option: GitHub Desktop**

1. Install GitHub Desktop from https://desktop.github.com/ and sign in to your GitHub account.
2. Choose **File → Add Local Repository** and select the extracted `after-hours` folder containing `package.json`.
3. If GitHub Desktop says it is not yet a repository, choose **Create a Repository Here**. Name it `after-hours-date-night`.
4. Verify `public`, `server.js`, `package.json`, and the README appear in the project.
5. Commit your changes, then choose **Publish repository**. Leave the **private repository** option selected if you want the source files private.

**If you already know Git:** From within the extracted folder, run `git init`, `git add .`, `git commit -m "First playable After Hours"`, then create a GitHub repository and push your main branch.

### C2. Set up a Render Web Service

1. Open https://dashboard.render.com/ and create or log into an account.
2. Select **New → Web Service**. **Do not select Static Site.**
3. Connect your GitHub account if asked, then select `after-hours-date-night`.
4. Fill in these settings:

   - **Runtime / Language:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health` (optional)
   - **Root Directory:** leave blank if `package.json` is at the top of the repository
   - **Instance Type:** Free for experimenting, or a paid service for a longer-lived instance

5. Select **Create Web Service**. When the deployment shows **Live**, open the provided `https://...onrender.com` URL.
6. Create a room on that published URL. Share the code **or the HTTPS invitation link** with Kris. She opens the same published website from her own computer, enters her name, and joins. Do not share a `localhost` link.

### Important limitations of Render Free

Render Free Web Services can spin down after periods of inactivity and use a temporary filesystem. **The in-server room file may disappear after an idle spin-down, restart, or redeployment.** This project does **not** yet include a cloud database, so saved progress on the free tier is **not guaranteed**. For a single uninterrupted date, keep both clients connected, but still expect possible interruptions.

For durable online saves, the next production upgrade should use an external database (or a paid instance with an attached persistent disk). The game is built to make that upgrade possible, but it is *not* included here.

Render documentation: https://render.com/docs/your-first-deploy and https://render.com/docs/free

---

## How to play the complete date

**Before the date**

- Both players open the site and have Discord voice chat ready.
- One person creates a room, the other enters with the invite code.
- The host clicks **Let the Night Begin** after both names are shown as present.
- Optional: click **Sound off** in the top-right to turn on the original in-game soundtrack. Browsers require a user click before audio can play.

**Act I: Laugh**

- Scene 1: Player 1 is the actor and Player 2 is the director.
- Actor: move with WASD/arrows, hold Shift to run; gather all four glowing props and reach the EXIT doorway on the right.
- Director: choose a trap from the panel and click the set to place it. Traps have a short cooldown. The actor is bounced/slowed, but won't lose the level.
- Host clicks **Next Disaster** after the scene ends. Roles switch automatically. Finish all 4 scenes.

**Act II: Cooperate**

- Move with WASD/arrows; the physical player has amber nodes, the spirit player has violet nodes.
- Find your active glowing ring and stand close to it.
- Press E. Coordinate by voice so both nodes are activated within 8 seconds of one another.
- Repeat for the area's three circuits. Host moves to the next area after success. Finish 3 areas.

**Act III: Connect**

- Use **Music** to select one of four original browser instrumentals and change the mood. For your own real songs, add a music-service URL; the link opens separately on both devices. Start music in the external service together: third-party songs are **not** streamed or synchronized by this site.
- Use **Stars** to add points to the same sky. Every new point joins the constellation.
- Use **Garden** to choose a flower, lantern, fern, mushroom, or crystal and click the lower terrace. Each person places at least two objects and chooses one secret symbol to give; both become visible after both players contribute.
- When ready, host starts the lantern finale. Each player moves their own lantern under the moon.
- At the end, select **Save Our Keepsake** to download the artwork.

There are no mandatory relationship questions, relationship scores, or timers in the romantic section.

---

## Troubleshooting

**`node` is not recognized:** Install Node.js LTS and reopen Command Prompt. Verify `node --version`.

**The site won't load:** Confirm `npm start` is still running and visit `http://localhost:3000` on the host computer. If running from the same Wi-Fi, check the host computer's IP address and Private-network firewall permissions.

**The second player cannot join:** Make sure both players are using the *same server*. A room created on one computer's `localhost` does not exist on another computer's separately running `localhost`. The six-digit code is server-specific.

**The room says it's full:** Only two unique player profiles can join. A previous browser profile can reconnect from the same browser where it first joined. To start over, create a fresh room on the host's landing page (open a separate incognito window if needed).

**A name or code disappeared after Refresh:** The room code stays in the page address. Enter your name again and choose Join Room. Your browser retains your player profile ID, allowing you to reclaim your slot.

**Sound is silent:** Click **Sound off** to enable audio; check browser/site sound and device output. The built-in soundtrack is synthesized live and needs the user to unlock browser audio.

**Your own songs don't play inside the site:** Music-service links open separately. The site has no licensing or integration for playing YouTube/Spotify content directly.

**Saved rooms disappear online:** If using a temporary host such as Render Free, restarts or idle spin-downs discard the local room file. Save the finale keepsake before ending your date.

**Play feels slow or laggy:** Check both internet connections; keep only one game tab open per player; use a current Chrome or Edge browser. The project is a lightweight prototype; the next phase can optimize authority and collision detection.

## Developer notes

- `server.js` — zero-dependency HTTP/WebSocket server, two-player room authority, rules, local JSON saves.
- `public/index.html` — app shell, invite UI, canvas and side panels.
- `public/styles.css` — responsive Gothic-neon design.
- `public/app.js` — original browser graphics, keyboard/pointer controls, audio synthesis, downloadable keepsakes.
- `tests/server.test.js` — automated end-to-end WebSocket/HTTP gameplay smoke tests.

Run the automated checks from the project directory:

```sh
npm test
```

Room state is written to `data/rooms.json`. It is ignored by Git. An optional environment variable `DATA_FILE=/absolute/path/to/rooms.json` overrides its location.

### Security and privacy

Invite codes provide lightweight access control, **not account authentication** or end-to-end encryption. Don't use the app to store sensitive private messages or personally identifying information. For a public deployment, add stronger authentication, rate limiting, and hosting-side security protections before distributing to many users.

### Scope of this prototype

This is a complete playable *first version* with custom 2D graphics, not a full 3D game. It does not yet feature physics-based cinematic animation, video highlight export, true alternate-world visibility rules, a cloud database, or native licensed music streaming. Those remain future production upgrades.

### Quick launch on Windows

Once Node.js is installed, you can also **double-click `START-AFTER-HOURS.bat`** in the extracted project folder instead of opening Command Prompt manually. The command window must remain open while playing.

### Change chapters whenever you want

During an active chapter, select **View Room** at the bottom of the controls. This opens the private chapter hub. The host can choose any experience without restarting or erasing the previously created garden or stars. The non-host can see the options and ask the host to switch.
