# SideArm Match game server

This is the Socket.IO server for multiplayer games. It keeps every room's state in memory: who is in the room, the cards, whose turn it is and the scores. Browsers only send their moves, and the server sends each player the updated game. The game website itself (the Vue app) still runs on Vercel. Single player doesn't use this server.

## Run it locally

From the repo root, in two terminals:

```shell
npm install --prefix server   # first time only
npm run server                # game server on http://localhost:3001
```

```shell
npm run dev                   # game on http://localhost:5173
```

Open http://localhost:5173 in two browser windows, or in two tabs. Each tab counts as a separate player. Choose **Multiplayer** in one window, click **Create room**, then open the room link in the other window.

To play from a phone or another computer on the same Wi-Fi, run `npm run dev -- --host` and open the "Network" address that Vite prints. The game automatically connects to port 3001 on that same machine.

Run the rule tests with:

```shell
npm test --prefix server
```

## Settings

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | The port the server listens on |
| `CLIENT_ORIGIN` | (not set) | Comma-separated list of sites allowed to connect, for example `https://matchgame.vercel.app`. When it isn't set, any site can connect, which is fine for local development. Always set it in production. |

The game website needs one setting in its build: `VITE_SOCKET_URL`, the public address of this server, for example `https://game.yourdomain.com`.

## Deploy as a Hostinger Node.js Web app (recommended)

This option works on Hostinger Business and Cloud plans. In hPanel, go to **Sites → Criar site / Add website → Web app Node.js** and import the GitHub repo with these settings:

| Setting | Value |
|---|---|
| Framework preset | Express (or Other) |
| Branch | `main` |
| Root directory | `server` |
| Build command | leave empty |
| Output directory | leave empty |
| Entry file | `index.js` |
| Node.js version | 22 |
| Environment variable | `CLIENT_ORIGIN` = `https://matchgame.vercel.app` |

When it's deployed, open the app's address. It should show "SideArm Match server is running." Then set `VITE_SOCKET_URL` in Vercel to that address (see step 4 below). Every push to `main` redeploys the server automatically. The server's output appears under **Runtime logs**.

Hostinger stops the app after a while with no traffic, and the first visitor afterwards wakes it up. The game shows "Connecting to game server…" in the meantime and waits up to 60 seconds.

## Deploy to a Hostinger VPS

These steps only work on a **VPS** plan, which gives you SSH access to a Linux server. Hostinger's shared, Web and Cloud hosting plans can't keep a Node.js process running, so they can't host this server. In hPanel, a VPS appears under **VPS** with an IP address and root access.

The game website is served over `https`, and browsers block insecure connections from secure pages. So the server needs HTTPS too, which means it needs a domain or subdomain.

### 1. Point a subdomain at the VPS

In hPanel, open **Domains**, choose your domain, then **DNS / Nameservers**. Add an `A` record named, for example, `game` that points to the VPS IP address. The server will then be reachable at `game.yourdomain.com`.

### 2. Install Node.js, the code and PM2

Connect to the VPS over SSH and run:

```shell
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# Code: only the server folder is used
git clone <your-repo-url> sidearm-match
cd sidearm-match/server
npm ci --omit=dev

# PM2 keeps the server running and restarts it after a crash or a VPS reboot
sudo npm install -g pm2
CLIENT_ORIGIN=https://matchgame.vercel.app PORT=3001 pm2 start index.js --name sidearm-match
pm2 save
pm2 startup        # run the command it prints
```

### 3. Set up Nginx and HTTPS

Create `/etc/nginx/sites-available/sidearm-match` with this content:

```nginx
server {
    server_name game.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        # Required for WebSockets
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 120s;
    }
}
```

Then enable the site and request a free certificate from Let's Encrypt:

```shell
sudo ln -s /etc/nginx/sites-available/sidearm-match /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d game.yourdomain.com
```

Open https://game.yourdomain.com in a browser. It should show "SideArm Match server is running."

### 4. Connect the game on Vercel

In Vercel, open the project, go to **Settings → Environment Variables**, and add `VITE_SOCKET_URL` = `https://game.yourdomain.com`. Then redeploy. Vite only reads this value at build time, so the change takes effect after the next build.

### Updating the server

```shell
cd sidearm-match && git pull
cd server && npm ci --omit=dev
pm2 restart sidearm-match
```

Restarting the server ends any games in progress, because rooms are only kept in memory.

### Useful commands

```shell
pm2 logs sidearm-match   # live logs
pm2 status               # check that it's running
```
