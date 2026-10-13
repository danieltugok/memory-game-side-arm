# SideArm Match server

A single Node.js server runs the whole game:

- **The game page.** It serves the Vite build from `dist/`.
- **Multiplayer.** Over Socket.IO, it keeps every room's state in memory: who is in the room, the cards, whose turn it is and the scores. Browsers only send their moves, and the server sends each player the updated game.

Single player runs entirely in the browser. It only needs the page.

The server's code lives in this folder. Its dependency (`socket.io`) is listed in the root `package.json`, because Hostinger installs and builds from the repo root.

## Run it locally

```shell
npm install
npm run server   # terminal 1: game server on http://localhost:3001
npm run dev      # terminal 2: game on http://localhost:5173
```

Open http://localhost:5173 in two browser windows, or in two tabs. Each tab counts as a separate player. Vite forwards `/socket.io` to the game server.

If port 3001 is busy, run `PORT=3002 npm run server` and `SERVER_PORT=3002 npm run dev`.

The game server doesn't reload when its code changes. After you pull or edit files in `server/`, stop it with Ctrl+C and run `npm run server` again.

To play from a phone on the same Wi-Fi, run `npm run dev -- --host` and open the "Network" address that Vite prints.

To run it exactly like production, with one server for the page and multiplayer:

```shell
npm run build && npm start   # http://localhost:3001
```

`npm test` runs the game rule tests in `game.test.js`.

## Settings

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | The port the server listens on. Hosts usually set it. |
| `CLIENT_ORIGIN` | (not set) | Only needed if the page is served from a different site, for example `https://matchgame.vercel.app`. It's a comma-separated list of the sites allowed to connect. |
| `VITE_SOCKET_URL` | (not set) | Build-time setting for the page. Only needed if the server runs at a different address from the page. |

## Deploy as a Hostinger Node.js Web app

In hPanel, go to **Sites → Criar site / Add website → Web app Node.js** and import the GitHub repo with these settings:

| Setting | Value |
|---|---|
| Framework preset | Express (or Other) |
| Branch | `main` |
| Root directory | `./` (repo root) |
| Build command | `build` |
| Output directory | leave empty |
| Entry file | `server/index.js` |
| Node.js version | 22 |
| Environment variables | none |

After the deploy finishes:

- `https://<your-app>.hostingersite.com/health` should show "SideArm Match server is running."
- `https://<your-app>.hostingersite.com` opens the game.

Every push to `main` redeploys the app. The server's output appears under **Runtime logs**.

Hostinger stops the app after a while with no traffic, and the first visitor afterwards wakes it up, which can take a few seconds. Rooms only exist in memory, so a redeploy or a restart ends any games in progress.
