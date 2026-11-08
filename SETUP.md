# Blocky multiplayer server: setup

This folder is the server that lets players see each other, host games, join games,
chat, and find each other by name. The game runs in a web page that connects to it.

## What is already done (checked by me)
- The server runs and passes 16 automatic checks: hosting, joining, moving, chat,
  bad-word filter, search, leaving, and closing a game when the host leaves.
- The Blocky home page connects to the server, lists online players, searches,
  hosts Blocky World, and a second player can join. Checked against the running server.

## What you need to do

### 1. Put the server online (about 10 minutes)
1. Make a free account at https://render.com (or https://railway.app).
2. Click **New +** then **Web Service**.
3. Upload this `blocky-server` folder, or put it in a GitHub repository and connect it.
4. Settings:
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Plan:** Free is fine to start with
5. Click **Create Web Service**. When the status says "Live", copy its address.
   It looks like `https://blocky-server-abcd.onrender.com`.

Check it works: open `https://YOUR-ADDRESS/health` in a browser. You should see
`{"ok":true,...}`.

Free servers sleep when nobody uses them. The first connection after a sleep can take
30 seconds or more.

### 2. Put the Blocky page online over https
Multiplayer only works when the Blocky page itself is on https. Upload
`blocky_home.html` (and the `_headers` file) to Netlify Drop, the same way you did before.

Note: the published Claude artifact link cannot connect to an outside server, so
multiplayer must be used from the Netlify copy, not the artifact link.

### 3. Connect the game to your server
1. Open the Blocky page on your phone, PC, or iPad.
2. Go to **More** then **Multiplayer**.
3. Type your server address with `wss://` in front, for example
   `wss://blocky-server-abcd.onrender.com`.
4. Press **Connect**. The status should say **Connected**.

The address is remembered on that device, so you only type it once.

### 4. Test with a friend
1. You press **Host Blocky World**. The game opens for you.
2. Your friend connects with the same address, then presses the **Join** button under
   **Open games**, or searches your name under **Find players** and joins from there.
3. You should see each other in the game and be able to chat.

## Things I could not check from here
- Whether each device connects over the internet. Only I could test on a local server.
- Xbox: the Xbox browser may not support this connection. Test it on the Xbox after step 3.
- Other players' movement looks right in code, but I haven't watched it in a real game.
  Tell me what you see and I'll fix it.

## Limits in this first version
- Only Blocky World can be hosted. Games you make in the Studio are not shared yet.
- Voice chat is not included yet.
- Nothing is saved on the server. Restarting it clears who is online and every open game.
