// SideArm Match server: serves the built game (dist/) and runs multiplayer over Socket.IO.
// It owns every room's state; browsers only send actions.
// Env: PORT (default 3001), CLIENT_ORIGIN (optional comma-separated origins allowed to connect
// from another site; not needed when the game is served by this server)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";
import { Server } from "socket.io";
import * as game from "./game.js";

const PORT = Number(process.env.PORT) || 3001;
const ORIGINS = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
const PREVIEW_MS = 3000;
const SHOW_MISS_MS = 1200;
const SEAT_KEPT_MS = 60_000;

// One deck for both modes: the same file the single-player game imports
const deck = JSON.parse(readFileSync(new URL("../src/assets/cardsOnDeck.json", import.meta.url), "utf8"));
const DIST_DIR = fileURLToPath(new URL("../dist/", import.meta.url));

const rooms = new Map(); // roomId -> room
const timers = new Map(); // `${roomId}:${name}` -> timeout

const setTimer = (key, ms, fn) => {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => (timers.delete(key), fn()), ms));
};
const clearTimer = (key) => {
  clearTimeout(timers.get(key));
  timers.delete(key);
};

// Room ids skip look-alike characters (0/O, 1/I/L)
const ROOM_ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newRoomId = () => {
  let id;
  do {
    id = Array.from({ length: 6 }, () => ROOM_ID_CHARS[randomInt(ROOM_ID_CHARS.length)]).join("");
  } while (rooms.has(id));
  return id;
};

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

// Serves the Vite build. Unknown paths get index.html; room links are just /?room=ID.
const serveGame = async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let file = normalize(DIST_DIR + pathname);
  if (!file.startsWith(DIST_DIR) || file.endsWith(sep)) file = DIST_DIR + "index.html";

  let body;
  try {
    body = await readFile(file);
  } catch {
    if (extname(pathname)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found\n");
    }
    file = DIST_DIR + "index.html";
    try {
      body = await readFile(file);
    } catch {
      res.writeHead(503, { "Content-Type": "text/plain" });
      return res.end("The game hasn't been built yet. Run `npm run build`.\n");
    }
  }
  res.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extname(file)] || "application/octet-stream",
    // Vite puts a content hash in asset file names, so those can be cached for good
    "Cache-Control": file.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
  });
  res.end(req.method === "HEAD" ? undefined : body);
};

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end(`SideArm Match server is running. Rooms: ${rooms.size}\n`);
  }
  // Socket.IO answers its own /socket.io/ requests before this handler runs
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    return res.end();
  }
  serveGame(req, res);
});

// Same-origin connections (the game served above) always work; CLIENT_ORIGIN adds other sites
const io = new Server(httpServer, ORIGINS.length ? { cors: { origin: ORIGINS } } : {});

// Each browser gets its own view (its own seat as `you`)
const broadcast = async (room) => {
  const sockets = await io.in(room.id).fetchSockets();
  sockets.forEach((s) => s.emit("room:state", game.publicState(room, s.data.playerId)));
};

const deleteRoom = (room) => {
  [...timers.keys()].filter((k) => k.startsWith(`${room.id}:`)).forEach(clearTimer);
  rooms.delete(room.id);
};

// The preview timer ends the 3-second look at the cards; then play begins.
const beginPreview = (room) => {
  broadcast(room);
  setTimer(`${room.id}:preview`, PREVIEW_MS, () => {
    if (game.endPreview(room)) broadcast(room);
  });
};

const startRound = (room, playerId) => {
  if (game.startGame(room, playerId, deck)) beginPreview(room);
};

// Host restarts mid-game. A pending flip-back from the old deck must not touch the new one.
const restartRound = (socket, room) => {
  if (!game.restartGame(room, socket.data.playerId, deck)) return false;
  clearTimer(`${room.id}:miss`);
  beginPreview(room);
  const host = room.players.find((p) => p.id === socket.data.playerId);
  socket.to(room.id).emit("room:notice", { message: `${host.name} restarted the game` });
  return true;
};

const leaveRoom = (socket) => {
  const { roomId, playerId } = socket.data;
  const room = rooms.get(roomId);
  socket.leave(roomId);
  socket.data.roomId = null;
  if (!room) return;
  clearTimer(`${room.id}:seat:${playerId}`);
  if (game.removePlayer(room, playerId)) deleteRoom(room);
  else broadcast(room);
};

const enterRoom = (socket, room, playerId) => {
  if (socket.data.roomId && socket.data.roomId !== room.id) leaveRoom(socket);
  socket.data.roomId = room.id;
  socket.data.playerId = playerId;
  socket.join(room.id);
  clearTimer(`${room.id}:seat:${playerId}`);
  broadcast(room);
};

const sendError = (socket, code) => socket.emit("room:error", { code, message: game.ERRORS[code] });

io.on("connection", (socket) => {
  socket.on("room:info", ({ roomId } = {}, reply) => {
    const room = rooms.get(String(roomId || "").toUpperCase());
    if (typeof reply === "function") reply(room ? game.roomInfo(room) : { error: "NOT_FOUND" });
  });

  socket.on("room:create", ({ nickname, level, playerId } = {}) => {
    if (!playerId || !game.LEVEL_PAIRS[level]) return;
    const room = game.createRoom({ id: newRoomId(), level, player: { id: playerId, name: nickname } });
    rooms.set(room.id, room);
    enterRoom(socket, room, playerId);
  });

  socket.on("room:join", ({ roomId, nickname, playerId } = {}) => {
    const room = rooms.get(String(roomId || "").toUpperCase());
    if (!room || !playerId) return sendError(socket, "NOT_FOUND");
    const error = game.joinRoom(room, { id: playerId, name: nickname });
    if (error) return sendError(socket, error);
    enterRoom(socket, room, playerId);
  });

  socket.on("game:start", () => {
    const room = rooms.get(socket.data.roomId);
    if (room) startRound(room, socket.data.playerId);
  });

  socket.on("game:again", () => {
    const room = rooms.get(socket.data.roomId);
    if (room) startRound(room, socket.data.playerId);
  });

  socket.on("game:restart", () => {
    const room = rooms.get(socket.data.roomId);
    if (room) restartRound(socket, room);
  });

  socket.on("card:flip", ({ index } = {}) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;
    const result = game.flipCard(room, socket.data.playerId, Number(index));
    if (!result) return;
    broadcast(room);
    if (result === "miss") {
      setTimer(`${room.id}:miss`, SHOW_MISS_MS, () => {
        if (game.resolveMiss(room)) broadcast(room);
      });
    }
  });

  socket.on("room:leave", () => leaveRoom(socket));

  socket.on("disconnect", async () => {
    const { roomId, playerId } = socket.data;
    const room = rooms.get(roomId);
    if (!room) return;
    // The player may already be back on a new connection (the old one can take a while to time out)
    const stillHere = (await io.in(roomId).fetchSockets()).some((s) => s.data.playerId === playerId);
    if (stillHere) return;
    game.disconnectPlayer(room, playerId);
    broadcast(room);
    // Keep the seat for a while so a reload or a dropped connection can rejoin
    setTimer(`${room.id}:seat:${playerId}`, SEAT_KEPT_MS, () => {
      if (game.removePlayer(room, playerId)) deleteRoom(room);
      else broadcast(room);
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`SideArm Match server listening on port ${PORT}`);
  if (ORIGINS.length) console.log(`Also allowing connections from: ${ORIGINS.join(", ")}`);
});
