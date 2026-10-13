// Multiplayer game rules. Pure state changes only: no sockets, no timers.
// index.js calls these, schedules the timed steps (endPreview, resolveMiss)
// and broadcasts publicState() to the room after every change.

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
export const NAME_MAX_LENGTH = 20;

// Keep in sync with LEVELS in src/assets/constants.js
export const LEVEL_PAIRS = { easy: 6, medium: 12, hard: 24 };

export const ERRORS = {
  NOT_FOUND: "Room not found",
  FULL: "Room is full",
  IN_PROGRESS: "Game already in progress",
};

const shuffle = (items, random = Math.random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Public id shown to browsers. The private player id is never sent out,
// so nobody can copy it and take over someone else's seat.
const newSeat = () => Math.random().toString(36).slice(2, 10);

export const cleanName = (name) =>
  String(name ?? "").trim().slice(0, NAME_MAX_LENGTH) || "Player";

const connectedPlayers = (room) => room.players.filter((p) => p.connected);

const isActive = (room) => ["preview", "playing", "resolving"].includes(room.phase);

const finish = (room) => {
  room.phase = "finished";
  room.flipped = [];
  room.turn = null;
};

// Next connected player after `fromId` in seating order.
const nextConnectedPlayer = (room, fromId) => {
  const count = room.players.length;
  const start = room.players.findIndex((p) => p.id === fromId);
  for (let step = 1; step <= count; step++) {
    const candidate = room.players[(start + step + count) % count];
    if (candidate.connected) return candidate.id;
  }
  return null;
};

const handOverHost = (room) => {
  const host = room.players.find((p) => p.id === room.hostId);
  if (!host || !host.connected) {
    room.hostId = connectedPlayers(room)[0]?.id ?? room.players[0]?.id ?? null;
  }
};

// Called when a player stops being able to act (disconnect or leave).
// A disconnect alone never ends the game: the player may be reloading.
const afterPlayerGone = (room, playerId) => {
  handOverHost(room);
  if (!isActive(room)) return;

  if (room.turn === playerId && room.phase === "playing") {
    // Turn back a half-finished turn and move on
    room.flipped.forEach((i) => (room.cards[i].faceUp = false));
    room.flipped = [];
    room.turn = nextConnectedPlayer(room, playerId);
  }
  // In "resolving", resolveMiss() moves the turn on when its timer fires.
};

export const createRoom = ({ id, level, player }) => {
  if (!LEVEL_PAIRS[level]) throw new Error(`Unknown level: ${level}`);
  return {
    id,
    level,
    hostId: player.id,
    phase: "lobby",
    players: [{ id: player.id, seat: newSeat(), name: cleanName(player.name), score: 0, connected: true }],
    cards: [],
    turn: null,
    flipped: [],
  };
};

// Returns an error code from ERRORS, or null on success.
// A known playerId always gets its seat back, even mid-game.
export const joinRoom = (room, { id, name }) => {
  const existing = room.players.find((p) => p.id === id);
  if (existing) {
    existing.connected = true;
    existing.name = cleanName(name);
    handOverHost(room);
    return null;
  }
  if (room.phase !== "lobby") return "IN_PROGRESS";
  if (room.players.length >= MAX_PLAYERS) return "FULL";
  room.players.push({ id, seat: newSeat(), name: cleanName(name), score: 0, connected: true });
  return null;
};

export const canStart = (room, playerId) =>
  playerId === room.hostId &&
  (room.phase === "lobby" || room.phase === "finished") &&
  connectedPlayers(room).length >= MIN_PLAYERS;

// New deck face up for the preview, scores at 0, host plays first.
const deal = (room, deck, random) => {
  room.players.forEach((p) => (p.score = 0));
  const logos = shuffle(deck, random).slice(0, LEVEL_PAIRS[room.level]);
  room.cards = logos.flatMap(({ logo, name }) => [
    { id: newSeat(), logo, name, faceUp: true, matched: false },
    { id: newSeat(), logo, name, faceUp: true, matched: false },
  ]);
  room.flipped = [];
  room.turn = room.hostId;
  room.phase = "preview";
};

// First game and "Play again". Seats of players who are gone are dropped.
export const startGame = (room, playerId, deck, random = Math.random) => {
  if (!canStart(room, playerId)) return false;
  room.players = connectedPlayers(room);
  deal(room, deck, random);
  return true;
};

// Host restarts in the middle of a game. Disconnected seats are kept, since
// those players may be reloading and should be able to come back.
export const restartGame = (room, playerId, deck, random = Math.random) => {
  if (playerId !== room.hostId || !isActive(room)) return false;
  deal(room, deck, random);
  return true;
};

export const endPreview = (room, random = Math.random) => {
  if (room.phase !== "preview") return false;
  room.cards = shuffle(room.cards, random).map((card) => ({ ...card, faceUp: false }));
  room.phase = "playing";
  return true;
};

// Returns "match", "miss", "flipped" (first card of a turn) or null when the move is not allowed.
export const flipCard = (room, playerId, index) => {
  const card = room.cards[index];
  if (
    room.phase !== "playing" ||
    room.turn !== playerId ||
    !card ||
    card.faceUp ||
    card.matched ||
    room.flipped.length >= 2
  ) {
    return null;
  }

  card.faceUp = true;
  room.flipped.push(index);
  if (room.flipped.length < 2) return "flipped";

  const [first, second] = room.flipped.map((i) => room.cards[i]);
  if (first.logo === second.logo) {
    first.matched = second.matched = true;
    room.flipped = [];
    room.players.find((p) => p.id === playerId).score++;
    if (room.cards.every((c) => c.matched)) finish(room);
    return "match";
  }

  room.phase = "resolving";
  return "miss";
};

// After a miss: turn both cards back and pass the turn.
export const resolveMiss = (room) => {
  if (room.phase !== "resolving") return false;
  room.flipped.forEach((i) => (room.cards[i].faceUp = false));
  room.flipped = [];
  room.phase = "playing";
  room.turn = nextConnectedPlayer(room, room.turn);
  return true;
};

export const disconnectPlayer = (room, playerId) => {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return;
  player.connected = false;
  afterPlayerGone(room, playerId);
};

// Leaving for good (Leave button, or seat expired). Returns true when the room is now empty.
export const removePlayer = (room, playerId) => {
  const index = room.players.findIndex((p) => p.id === playerId);
  if (index === -1) return room.players.length === 0;

  // Finish a pending miss now, while the seat still exists to count the next turn from
  if (room.turn === playerId && room.phase === "resolving") resolveMiss(room);
  room.players[index].connected = false;
  afterPlayerGone(room, playerId);
  room.players.splice(index, 1);
  // Only one player left in a game: it ends and they win
  if (isActive(room) && room.players.length < MIN_PLAYERS) finish(room);
  return room.players.length === 0;
};

export const winners = (room) => {
  if (room.phase !== "finished" || !room.players.length) return [];
  const best = Math.max(...room.players.map((p) => p.score));
  return room.players.filter((p) => p.score === best).map((p) => p.id);
};

// What gets sent to one browser. Players are identified by seat, `you` is the
// viewer's own seat, and face-down cards never include the logo or school name.
export const publicState = (room, viewerId) => {
  const seatOf = (playerId) => room.players.find((p) => p.id === playerId)?.seat ?? null;
  return {
    id: room.id,
    level: room.level,
    phase: room.phase,
    you: seatOf(viewerId),
    host: seatOf(room.hostId),
    turn: seatOf(room.turn),
    players: room.players.map(({ seat, name, score, connected }) => ({ seat, name, score, connected })),
    cards: room.cards.map(({ id, logo, name, faceUp, matched }) =>
      faceUp || matched ? { id, logo, name, faceUp, matched } : { id, faceUp, matched }
    ),
    winners: winners(room).map(seatOf),
  };
};

// Shown on the join screen before a player joins.
export const roomInfo = (room) => ({
  id: room.id,
  level: room.level,
  hostName: room.players.find((p) => p.id === room.hostId)?.name ?? "",
  players: room.players.length,
  joinable: room.phase === "lobby" && room.players.length < MAX_PLAYERS,
  error: room.phase !== "lobby" ? "IN_PROGRESS" : room.players.length >= MAX_PLAYERS ? "FULL" : null,
});
