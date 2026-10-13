# Multiplayer for SideArm Match: design

Date: 2026-10-13
Status: implemented. Changes made during implementation are listed at the end.

## Goal

Let 2 to 4 players in different browsers play one memory game together in real time. Players take turns on a single shared board. Single player keeps working as it does today and doesn't need the server.

## Decisions

| Topic | Decision |
|---|---|
| Game mode | Turn-based, one shared board. A match scores a point and the player goes again. A miss passes the turn. The player with the most pairs wins, and ties are possible. |
| Players per room | 2 to 4 |
| Technology | A Node.js server with Socket.IO that owns the game state. Each browser connects with `socket.io-client`. |
| Hosting | The game stays on Vercel. The server is deployed on its own: on the user's Hostinger VPS if the plan is a VPS, otherwise on Render's free tier. |
| Persistence | Rooms are kept in the server's memory only. A server restart ends any games in progress. |

## User experience

### Start screen

This replaces the current "Choose your level" menu.

1. A nickname field (required, trimmed, at most 20 characters). The nickname is saved in `localStorage` and filled in on the next visit.
2. A choice between Single player and Multiplayer.
3. A choice of level: Easy (6 pairs), Medium (12 pairs) or Hard (24 pairs). The levels come from `constants.LEVELS`.
4. A **Play** button for single player, or **Create room** for multiplayer.

Single player then runs the current game unchanged, including the Restart Game and Change Level buttons.

### Joining from a link

When the page is opened with `?room=<ID>`, it shows "Join <host>'s room · <level>", a nickname field and a **Join** button. If the room can't be joined, it shows one of these messages with a button back to the start screen:

- "Room not found"
- "Room is full"
- "Game already in progress"

### Lobby

- The browser URL becomes `<site>/?room=<ID>`. The room ID is 6 characters long and avoids letters that look alike.
- A **Copy link** button copies the full URL.
- Below it is the list of players in the room (2 to 4), with the host marked.
- Only the host sees the **Start game** button, and it only works once at least 2 players are in the room.
- Every player has a **Leave** button.

### During the game

- Every player sees the same board. They get the same 3-second preview, then the same shuffle.
- A scoreboard replaces the stats bar. It shows each player's name and number of pairs, highlights whoever's turn it is, and says either "Your turn" or "<name>'s turn".
- Only the player whose turn it is can flip cards. Each flip appears on every screen as it happens. When two cards don't match, they turn back face down after 1.2 seconds on every screen.
- When the game ends, the trophy shows "<name> wins!" or "Tie!".
- The host can click **Play again**, which deals a new deck to the same room and players. Anyone can click **Leave**.

### Disconnects

- If the player who disconnects had the turn, the turn passes to the next player who is still connected.
- The player's seat and score are kept for 60 seconds. If they reload the page or reopen the link with the same `playerId`, they get their seat back. After 60 seconds the seat is removed.
- If the host leaves, hosting passes to the next player who is still connected.
- If only one connected player is left during a game, the game ends and that player wins.

## Architecture

```
server/                 deployed on its own
  package.json          its only dependency is socket.io
  index.js              Socket.IO setup: CORS, wiring each event to a game.js call, timers, sending state
  game.js               the game rules as pure functions; nothing in it touches the network
  game.test.js          tests run with node:test
  README.md             how to deploy to a Hostinger VPS or to Render
src/
  App.vue               switches between the start screen, the lobby and the game
  components/
    StartScreen.vue     nickname, single or multiplayer, level
    Lobby.vue           room link, Copy link button, player list, Start and Leave buttons
    GameBoard.vue       the grid of cards, taken out of App.vue and shared by both modes
    Scoreboard.vue      multiplayer scores and whose turn it is
    Card.vue            no changes
    Timer.vue           no changes
  composables/
    useSinglePlayer.js  the current single-player logic, moved out of App.vue without changing what it does
    useMultiplayer.js   the socket connection and the latest room state, which the components read
```

### The server owns the game state

`game.js` keeps one object per room:

- the room ID, the level and the host's `playerId`
- the players: `playerId`, name, score and whether they are connected
- the deck: for each card, the logo URL, the school name, and whether it is face up or matched
- the current phase: `lobby`, `preview`, `playing`, `resolving` or `finished`
- whose turn it is, and which cards are flipped in the current turn

Each function takes a room and an action and returns either the new room or an error. `index.js` handles everything else: the timers, removing empty rooms, and sending state to the players.

### Events

Sent from the browser to the server:

| Event | Payload |
|---|---|
| `room:create` | `{ nickname, level, playerId }` |
| `room:join` | `{ roomId, nickname, playerId }` |
| `game:start` | none (only the host can send it) |
| `card:flip` | `{ index }` |
| `game:again` | none (only the host can send it) |
| `room:leave` | none |

Sent from the server to the browser:

- `room:state`: a full snapshot, sent to every player in the room after any change.
- `room:error`: `{ code, message }`, sent only to the player whose action failed. The codes are `NOT_FOUND`, `FULL` and `IN_PROGRESS`.

The server never sends the logo URL or school name of a face-down card. A card is sent with that information only while it is face up or matched, or for every card during the preview. This keeps players from finding the pairs in their browser's developer tools.

### Timers

All timers run on the server:

- The preview lasts 3 seconds. After it, the server shuffles the cards and the phase changes to `playing`.
- After a miss there is a 1.2-second delay before the two cards turn back face down. This is the `resolving` phase.

### Identity

The browser generates a random `playerId` with `crypto.randomUUID()`, stores it in `localStorage`, and sends it when the player joins. That is how a player gets their seat back after a reconnect.

### Configuration

- The browser reads `VITE_SOCKET_URL`. In development it defaults to `http://localhost:3001`.
- The server reads `PORT` (default 3001) and `CLIENT_ORIGIN`, a comma-separated list of the sites allowed to connect. In production that is the Vercel URL, plus localhost during development.
- The server loads the deck from `../src/assets/cardsOnDeck.json`, so both modes use the same list of logos.

## Error handling

- **Can't reach the server.** The page shows "Connecting to game server…". After 60 seconds it shows "Couldn't reach the game server" with a **Retry** button and a **Play single player** button. Render's free servers sleep when idle and need time to wake up, which is why the wait is this long.
- **Connection lost during a game.** A "Reconnecting…" banner appears while Socket.IO reconnects automatically. Once connected again, the browser rejoins with the same `playerId` and receives the current state.
- **Invalid actions.** The server ignores them and sends no error. This covers flipping a card when it isn't your turn, flipping a third card, flipping a card that is face up or matched, and a non-host sending start or play again. The normal interface never sends these.
- **Limits.** At most 4 players per room. Nicknames are cut to 20 characters. A room with no connected players for 5 minutes is deleted.

## Testing

- **`server/game.test.js`** (run with `node --test`) checks:
  - creating and joining rooms, including when a room is full, already playing, or doesn't exist
  - turn order, that a match keeps the turn, and that a miss passes it
  - scoring, and both a winner and a tie at the end
  - a disconnect during that player's turn, handing hosting to another player, and the last remaining player winning
  - getting a seat back with the same `playerId`
  - that face-down cards never include the logo URL or school name
- **End to end in headless Chromium** (driven over the Chrome DevTools Protocol, the same way the restart fix was tested):
  - two browsers create and join a room and play a full game, and both screens match after every move
  - a player reloads the page in the middle of the game
- **Single player.** Run the level checks again (card count and grid at desktop and phone widths, and Change Level) to confirm the refactor didn't change anything.

## Deployment

- **Game.** It stays on Vercel. The only new step is adding the `VITE_SOCKET_URL` environment variable.
- **Server.** `server/README.md` covers two options:
  - **Hostinger VPS:** clone the repo, run `npm ci` in `server/`, keep the server running with PM2, and put Nginx in front of it with HTTPS from Let's Encrypt. Nginx needs to pass WebSocket upgrade requests through.
  - **Render (free tier):** connect the repo, set the root directory to `server`, set the start command to `node index.js`, and set `CLIENT_ORIGIN`.
- **Local development.** Run `npm run dev` for the game and `npm run server` for the server in two terminals.

The user deploys the server themselves. Claude does not access their Hostinger or Render accounts.

## Not included

Spectators, chat, a time limit per turn, stats across rematches, accounts or login, and a database.

## Changes made during implementation

- **`playerId` is stored in `sessionStorage`, not `localStorage`.** `localStorage` is shared by every tab, so two tabs would have been the same player and two-player testing on one machine wouldn't work. `sessionStorage` is per tab and still survives a reload. The nickname stays in `localStorage`.
- **Players are identified by a public `seat` ID.** `room:state` doesn't include private `playerId`s. Otherwise anyone could copy another player's ID and take their seat. Each browser receives its own snapshot, and `you` is that player's seat.
- **A disconnect doesn't end the game.** Testing showed that a reload ended a 2-player game straight away. The game now ends early only when a seat is actually removed, through Leave or after the 60-second hold.
- **New `room:info` event.** It gives the join screen the host's name and the level before the player joins.
- **Empty rooms are deleted right away.** Seats are removed 60 seconds after a disconnect, and a room is deleted once it has no players left. This replaces the separate 5-minute rule.
- **`Card.vue` needed a small change.** It now handles a logo URL that only arrives when the card is turned face up, and it no longer shows an empty image for a face-down card.
- **Deployment is documented for the Hostinger VPS only,** because the user chose it. Render can be added later.
