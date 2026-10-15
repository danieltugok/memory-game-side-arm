# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"SideArm Match": a memory (pair-matching) card game built with Vue 3 + Vite 2 + Tailwind CSS 3. It tracks moves and elapsed time. Deployed on Vercel (https://matchgame.vercel.app/).

## Commands

```shell
npm install
npm run dev      # Vite dev server
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run collect-logos  # rebuild src/assets/cardsOnDeck.json from scripts/schools.txt
npm run server   # game server on :3001; run it next to `npm run dev` (Vite forwards /socket.io to it). Both modes need it
npm start        # production: serves dist/ and multiplayer on one port (run `npm run build` first)
npm test         # server tests (node:test); one test: node --test --test-name-pattern="<name>" server/game.test.js
```

The server's game rules and score validation have tests. The Vue app has no tests, and the repo has no linter or formatter.

The project `.npmrc` sets the public npm registry. Keep it: the user-level `~/.npmrc` points to a private CodeArtifact registry, and without the override `npm install` asks for a login.

## Architecture

`App.vue` only decides which screen to show: the start screen, single player, the connection screen, the lobby or a multiplayer game. The server in `server/` runs both modes (see the Multiplayer section): single player is a one-seat "solo" room, so the browser never sees a face-down card and can't report its own score. Both modes draw the server's cards with one `GameBoard.vue`, which expects cards as `{ key, value, name, visible, matched, indexCard }`.

### Single player

- **Played on the server.** `useSinglePlayer.js` takes the `useMultiplayer()` instance. `startLevel()` sends `room:create` with `solo: true`, and the server deals right away (no lobby). A solo room has one seat: `joinRoom()` and `room:info` answer `NOT_FOUND` to anyone else, and its id is never put in the URL. The composable only derives the header numbers, `GameStatus` and the Timer's `startStatus` from the room state. `restarGame()` sends `game:restart` during a game and `game:again` after a win. Single player therefore needs the server running.
- **Deck**: `src/assets/cardsOnDeck.json` is generated, so don't edit it by hand. `scripts/collect-logos.mjs` reads each SIDEARM client site listed in `scripts/schools.txt`. It finds the site's own logo (`images/logos/site/site.png`), checks that the URL serves an image, and writes `{ name, logo }` entries with full URLs. If fewer than 12 logos work, it refuses to write the file. The server deals from it. `Card.vue` shows the school name when a logo fails to load.
- **Levels**: the level is picked on `StartScreen.vue`. `constants.LEVELS` sets each level's number of pairs (Easy 6, Medium 12, Hard 24). It also holds the grid and card-size Tailwind classes as full literal strings so the JIT compiler finds them. Hard needs at least 24 logos in the deck.
- **Timer**: `Timer.vue` uses the Options API and is only for show. The parent drives it only through the `startStatus` prop (`start`/`stop`/`reset`, defined in `src/assets/constants.js`), and it reacts in a watcher. The time that counts is measured by the server.
- **Constants**: `TIME_FLIPPING_CARD` in `src/assets/constants.js` is interpolated into a Tailwind class (`duration-${...}`). That works only because the matching `duration-700` class is generated. If you change the value, use another Tailwind duration that exists, or safelist it.
- **Leaderboard**: `flipCard()` counts moves (one per pair of flips) and times the game from the first flip to the last match. When a solo game ends, `server/index.js` saves `{ name, level, timeMs, moves }` through `server/scores.js` (MySQL) and sends the browser `solo:result` with the level's top 10 (fastest time, then fewer moves). Browsers can't post scores: `/api/scores` only answers `GET ?level=`. `Leaderboard.vue` shows the result after the trophy animation, with a tab per level. The Leaderboard button at the bottom of every screen opens the same dialog without a result. Without `DB_HOST`, the result has `error: true` and the dialog says the score wasn't saved.
- **Win animation**: a `<lottie-player>` web component plays `public/trophy.json` in both modes. The component comes from the npm package `@lottiefiles/lottie-player`, pinned to an exact version. `src/main.js` loads it in the background, and `vite.config.js` registers it as a custom element. Keep its `:src` a binding: with only static attributes, Vue's production build copies the first trophy element for later wins, the copy loses `src` and `autoplay` (Vue sets them as properties), and every trophy after the first stays blank. This only happens in production builds.

### Multiplayer

- **The server decides everything.** `server/game.js` holds the game rules as pure functions with no sockets or timers, and `server/game.test.js` tests them. `server/index.js` connects them to Socket.IO: it runs the timers (3-second preview, 1.2-second flip-back after a miss, a 60-second hold on a disconnected player's seat) and sends `room:state` to each browser after every change. Browsers only send actions: `room:create`, `room:join`, `room:info`, `game:start`, `game:again`, `game:restart`, `card:flip` and `room:leave`. Besides `room:state`, the server can send `room:error` (a failed join), `room:notice` (a short message such as "Ana restarted the game") and `solo:result` (a single-player score).
- **Restart vs Play again.** Only the host can do either. `restartGame()` works during a game (preview, playing or resolving): it keeps disconnected seats, and the server cancels the pending flip-back timer. `startGame()` covers the first game and Play again: it works in the lobby or after the game ends, and drops disconnected seats.
- **Hidden information.** `publicState()` never includes the logo or school name of a face-down card, and `endPreview()` gives cards new ids so nobody can follow a card from the face-up preview. It identifies players by a public `seat` ID and never by their private `playerId`. Keep both rules when you change what the server sends.
- **Identity.** The private `playerId` is kept in `sessionStorage`, so each tab is a different player and a reload keeps the same player. A known `playerId` can always take its seat back, even during a game.
- **Disconnects.** A disconnect only skips that player's turns. The game ends early only when a seat is actually removed, either through Leave or after the 60-second hold. Otherwise a reload would end the game.
- **One origin.** In production, `server/index.js` serves the Vite build (`dist/`) and Socket.IO from one port, with a health check at `/health`. The client connects to the address the page came from. In dev, `vite.config.js` forwards `/socket.io` to `:3001`, or to `SERVER_PORT` when that is set (for example `PORT=3002 npm run server` together with `SERVER_PORT=3002 npm run dev`). `VITE_SOCKET_URL` and `CLIENT_ORIGIN` are only needed if the page and the server are ever hosted separately.
- **Packages.** The server's dependency (`socket.io`) is in the root `package.json`, because Hostinger installs from the root. `server/package.json` only sets `"type": "module"`. The server reads the same deck file as the client (`src/assets/cardsOnDeck.json`). `LEVEL_PAIRS` in `game.js` must match `LEVELS` in `constants.js`.
- **Deployment.** The whole game is a Hostinger Node.js Web app: root directory `./`, build command `build`, entry file `server/index.js`. The settings are in `server/README.md`. Vercel is no longer used. Database settings (`DB_*`) are set in hPanel and, locally, in a gitignored `.env` that `npm run server` loads.

## Styling

`tailwind.config.js` overrides the `blue-500`, `orange-500` and `green-500` colors with brand values. It also adds custom 3D utilities for the card flip: `backface-hidden`, `rotate-y-180`, `perspective-1000` and `preserve-3d`. `src/index.css` holds the global styles and font imports.
