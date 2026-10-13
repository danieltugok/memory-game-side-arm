import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  joinRoom,
  startGame,
  endPreview,
  flipCard,
  resolveMiss,
  disconnectPlayer,
  removePlayer,
  publicState,
  roomInfo,
  winners,
  canStart,
  restartGame,
} from "./game.js";

const deck = Array.from({ length: 30 }, (_, i) => ({ name: `School ${i}`, logo: `https://logos/${i}.png` }));

// Room with the given players already in the lobby. First player is the host.
const lobby = (names = ["ana", "bob"], level = "easy") => {
  const room = createRoom({ id: "ROOM01", level, player: { id: names[0], name: names[0] } });
  names.slice(1).forEach((name) => assert.equal(joinRoom(room, { id: name, name }), null));
  return room;
};

const playing = (names = ["ana", "bob"], level = "easy") => {
  const room = lobby(names, level);
  assert.ok(startGame(room, names[0], deck));
  assert.ok(endPreview(room));
  return room;
};

// Indexes of a matching pair and of two cards that don't match.
const pairIndexes = (room) => {
  const first = room.cards.findIndex((c) => !c.matched);
  const second = room.cards.findIndex((c, i) => i !== first && c.logo === room.cards[first].logo);
  return [first, second];
};
const missIndexes = (room) => {
  const first = room.cards.findIndex((c) => !c.matched);
  const second = room.cards.findIndex((c) => !c.matched && c.logo !== room.cards[first].logo);
  return [first, second];
};

test("joining: new players fill the lobby up to 4", () => {
  const room = lobby(["ana", "bob", "cy", "dee"]);
  assert.equal(room.players.length, 4);
  assert.equal(joinRoom(room, { id: "eve", name: "eve" }), "FULL");
  assert.equal(roomInfo(room).error, "FULL");
});

test("joining: nobody new can join once the game started", () => {
  const room = playing();
  assert.equal(joinRoom(room, { id: "eve", name: "eve" }), "IN_PROGRESS");
  assert.equal(roomInfo(room).joinable, false);
});

test("joining: names are trimmed and cut to 20 characters", () => {
  const room = lobby();
  joinRoom(room, { id: "x", name: "   " + "n".repeat(30) + "  " });
  assert.equal(room.players.at(-1).name, "n".repeat(20));
  joinRoom(room, { id: "y", name: "   " });
  assert.equal(room.players.at(-1).name, "Player");
});

test("starting: only the host, and only with 2+ connected players", () => {
  const room = lobby(["ana"]);
  assert.equal(canStart(room, "ana"), false);
  joinRoom(room, { id: "bob", name: "bob" });
  assert.equal(startGame(room, "bob", deck), false);
  assert.equal(startGame(room, "ana", deck), true);
  assert.equal(room.phase, "preview");
  assert.equal(room.cards.length, 12);
  assert.ok(room.cards.every((c) => c.faceUp));
  assert.equal(room.turn, "ana");
});

test("deck size follows the level", () => {
  assert.equal(playing(["a", "b"], "medium").cards.length, 24);
  assert.equal(playing(["a", "b"], "hard").cards.length, 48);
});

test("preview ends face down", () => {
  const room = playing();
  assert.equal(room.phase, "playing");
  assert.ok(room.cards.every((c) => !c.faceUp));
});

test("a match scores and keeps the turn", () => {
  const room = playing();
  const [a, b] = pairIndexes(room);
  assert.equal(flipCard(room, "ana", a), "flipped");
  assert.equal(flipCard(room, "ana", b), "match");
  assert.equal(room.players[0].score, 1);
  assert.equal(room.turn, "ana");
  assert.equal(room.phase, "playing");
});

test("a miss passes the turn after resolving", () => {
  const room = playing();
  const [a, b] = missIndexes(room);
  flipCard(room, "ana", a);
  assert.equal(flipCard(room, "ana", b), "miss");
  assert.equal(room.phase, "resolving");
  assert.equal(room.turn, "ana");
  assert.ok(resolveMiss(room));
  assert.equal(room.turn, "bob");
  assert.ok(!room.cards[a].faceUp && !room.cards[b].faceUp);
});

test("invalid flips are ignored", () => {
  const room = playing();
  const [a, b] = missIndexes(room);
  assert.equal(flipCard(room, "bob", a), null, "not bob's turn");
  assert.equal(flipCard(room, "ana", 999), null, "no such card");
  flipCard(room, "ana", a);
  assert.equal(flipCard(room, "ana", a), null, "card already face up");
  flipCard(room, "ana", b);
  const third = room.cards.findIndex((c) => !c.faceUp);
  assert.equal(flipCard(room, "ana", third), null, "third card while resolving");
});

test("clearing the board finishes the game with a winner", () => {
  const room = playing();
  // ana misses once, then bob clears every pair
  const [a, b] = missIndexes(room);
  flipCard(room, "ana", a);
  flipCard(room, "ana", b);
  resolveMiss(room);
  while (room.phase === "playing") {
    const [x, y] = pairIndexes(room);
    flipCard(room, "bob", x);
    flipCard(room, "bob", y);
  }
  assert.equal(room.phase, "finished");
  assert.deepEqual(winners(room), ["bob"]);
});

test("equal scores are a tie", () => {
  const room = playing();
  room.players.forEach((p) => (p.score = 3));
  room.cards.forEach((c) => (c.matched = true));
  room.phase = "finished";
  assert.deepEqual(winners(room), ["ana", "bob"]);
});

test("disconnect on your turn passes the turn and turns your card back", () => {
  const room = playing(["ana", "bob", "cy"]);
  const [a] = missIndexes(room);
  flipCard(room, "ana", a);
  disconnectPlayer(room, "ana");
  assert.equal(room.turn, "bob");
  assert.equal(room.cards[a].faceUp, false);
  assert.equal(room.hostId, "bob", "host moves to the next connected player");
});

test("disconnected players are skipped and can take their seat back", () => {
  const room = playing(["ana", "bob", "cy"]);
  disconnectPlayer(room, "bob");
  const [a, b] = missIndexes(room);
  flipCard(room, "ana", a);
  flipCard(room, "ana", b);
  resolveMiss(room);
  assert.equal(room.turn, "cy");

  room.players.find((p) => p.id === "bob").score = 2;
  assert.equal(joinRoom(room, { id: "bob", name: "bob" }), null, "rejoin mid-game is allowed");
  const bob = room.players.find((p) => p.id === "bob");
  assert.equal(bob.connected, true);
  assert.equal(bob.score, 2, "score is kept");
});

test("a disconnect alone doesn't end the game (the player may be reloading)", () => {
  const room = playing();
  disconnectPlayer(room, "bob");
  assert.equal(room.phase, "playing");
  assert.equal(room.turn, "ana");
});

test("the last player wins when everyone else leaves for good", () => {
  const room = playing();
  disconnectPlayer(room, "bob");
  removePlayer(room, "bob");
  assert.equal(room.phase, "finished");
  assert.deepEqual(winners(room), ["ana"]);
});

test("leaving during a miss finishes it and gives the turn to the next player", () => {
  const room = playing(["ana", "bob", "cy"]);
  const [a, b] = missIndexes(room);
  flipCard(room, "ana", a);
  flipCard(room, "ana", b);
  removePlayer(room, "ana");
  assert.equal(room.phase, "playing");
  assert.equal(room.turn, "bob");
  assert.equal(room.players.length, 2);
});

test("removing the last player empties the room", () => {
  const room = lobby(["ana"]);
  assert.equal(removePlayer(room, "ana"), true);
});

test("play again deals a fresh deck to the connected players", () => {
  const room = playing(["ana", "bob", "cy"]);
  disconnectPlayer(room, "cy");
  room.cards.forEach((c) => (c.matched = true));
  room.phase = "finished";
  room.players[0].score = 5;
  assert.ok(startGame(room, "ana", deck));
  assert.equal(room.players.length, 2, "disconnected seats are dropped");
  assert.ok(room.players.every((p) => p.score === 0));
  assert.equal(room.phase, "preview");
});

test("public state hides face-down cards and private player ids", () => {
  const room = playing();
  const [a] = missIndexes(room);
  flipCard(room, "ana", a);
  const state = publicState(room, "bob");

  const hidden = state.cards.filter((c) => !c.faceUp && !c.matched);
  assert.ok(hidden.length > 0);
  assert.ok(hidden.every((c) => c.logo === undefined && c.name === undefined));
  assert.equal(state.cards[a].logo, room.cards[a].logo);

  assert.ok(state.players.every((p) => !("id" in p)));
  assert.equal(state.you, room.players[1].seat);
  assert.equal(state.turn, room.players[0].seat);
});

test("restart: the host can restart mid-game with a new deck and scores at 0", () => {
  const room = playing(["ana", "bob"]);
  const [a, b] = pairIndexes(room);
  flipCard(room, "ana", a);
  flipCard(room, "ana", b);
  const [c, d] = missIndexes(room);
  flipCard(room, "ana", c);
  flipCard(room, "ana", d);
  resolveMiss(room);
  assert.equal(room.turn, "bob");
  const oldCardIds = room.cards.map((card) => card.id).join();

  assert.equal(restartGame(room, "ana", deck), true);
  assert.equal(room.phase, "preview");
  assert.equal(room.turn, "ana", "host takes the first turn");
  assert.ok(room.players.every((p) => p.score === 0));
  assert.equal(room.cards.length, 12);
  assert.ok(room.cards.every((card) => card.faceUp && !card.matched));
  assert.notEqual(room.cards.map((card) => card.id).join(), oldCardIds);
});

test("restart: only the host, and only during a game", () => {
  const room = lobby();
  assert.equal(restartGame(room, "ana", deck), false, "not in the lobby");
  startGame(room, "ana", deck);
  assert.equal(restartGame(room, "bob", deck), false, "not a guest");
  assert.equal(restartGame(room, "ana", deck), true, "works during the preview");
  endPreview(room);
  room.phase = "finished";
  assert.equal(restartGame(room, "ana", deck), false, "not after the game ended (Play again covers that)");
});

test("restart: works while a miss is being shown", () => {
  const room = playing();
  const [a, b] = missIndexes(room);
  flipCard(room, "ana", a);
  flipCard(room, "ana", b);
  assert.equal(room.phase, "resolving");
  assert.equal(restartGame(room, "ana", deck), true);
  assert.deepEqual(room.flipped, []);
  assert.equal(room.phase, "preview");
});

test("restart: disconnected players keep their seat", () => {
  const room = playing(["ana", "bob", "cy"]);
  disconnectPlayer(room, "cy");
  restartGame(room, "ana", deck);
  assert.equal(room.players.length, 3);
  assert.equal(joinRoom(room, { id: "cy", name: "cy" }), null, "cy can come back");
});
