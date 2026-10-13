// SideArm Match multiplayer server. Owns every room's state; browsers only send actions.
// Env: PORT (default 3001), CLIENT_ORIGIN (comma-separated allowed origins; unset = allow any, for local dev)
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { Server } from "socket.io";
import * as game from "./game.js";

const PORT = Number(process.env.PORT) || 3001;
const ORIGINS = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);
const PREVIEW_MS = 3000;
const SHOW_MISS_MS = 1200;
const SEAT_KEPT_MS = 60_000;

// Copy of src/assets/cardsOnDeck.json, written by `npm run collect-logos`, so this folder deploys on its own
const deck = JSON.parse(readFileSync(new URL("./cardsOnDeck.json", import.meta.url), "utf8"));

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

const httpServer = createServer((req, res) => {
  // Health check for uptime monitors and for "is the server up?" in a browser
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(`SideArm Match server is running. Rooms: ${rooms.size}\n`);
});

const io = new Server(httpServer, {
  cors: { origin: ORIGINS.length ? ORIGINS : true },
});

// Each browser gets its own view (its own seat as `you`)
const broadcast = async (room) => {
  const sockets = await io.in(room.id).fetchSockets();
  sockets.forEach((s) => s.emit("room:state", game.publicState(room, s.data.playerId)));
};

const deleteRoom = (room) => {
  [...timers.keys()].filter((k) => k.startsWith(`${room.id}:`)).forEach(clearTimer);
  rooms.delete(room.id);
};

const startRound = (room, playerId) => {
  if (!game.startGame(room, playerId, deck)) return;
  broadcast(room);
  setTimer(`${room.id}:preview`, PREVIEW_MS, () => {
    if (game.endPreview(room)) broadcast(room);
  });
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
  console.log(ORIGINS.length ? `Allowed origins: ${ORIGINS.join(", ")}` : "CLIENT_ORIGIN not set: allowing any origin (fine for local dev)");
});
