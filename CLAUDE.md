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
```

The repo has no test suite, linter or formatter.

The project `.npmrc` sets the public npm registry. Keep it: the user-level `~/.npmrc` points to a private CodeArtifact registry, and without the override `npm install` asks for a login.

## Architecture

All game state and logic live in `src/App.vue` (Composition API `setup()`). `Card.vue` and `Timer.vue` are presentational.

- **Deck**: `src/assets/cardsOnDeck.json` is generated, so don't edit it by hand. `scripts/collect-logos.mjs` reads each SIDEARM client site listed in `scripts/schools.txt`. It finds the site's own logo (`images/logos/site/site.png`), checks that the URL serves an image, and writes `{ name, logo }` entries with full URLs. If fewer than 12 logos work, it refuses to write the file. `chosenCards()` picks as many random entries as the current level has pairs and pushes two cards for each one (`pair: "a"`/`"b"`). A card's `value` is the logo URL, which is also how matches are compared. The `v-for` key is `${value}-${pair}`. `Card.vue` shows the school name when a logo fails to load.
- **Levels**: the game opens on a level menu (`level` is `null`). `constants.LEVELS` sets each level's number of pairs (Easy 6, Medium 12, Hard 24). It also holds the grid and card-size Tailwind classes as full literal strings so the JIT compiler finds them. `startLevel()` sets the level and calls `restarGame()`. `changeLevel()` cancels any pending start timer and returns to the menu. Hard needs at least 24 logos in the deck.
- **`indexCard` must equal the card's position in `cardList`**. `flip()` and the match watcher index straight into `cardList.value[payload.indexCard]`. `restarGame()` shows every card for 3s, then shuffles and reassigns `indexCard` to the new array index. If you reorder `cardList` anywhere else, reassign `indexCard` there too.
- **Turn flow**: `flip()` only allows a flip when at most one unmatched card is face-up. It pushes the payload into `cardsSelected`. A deep `watch` on `cardsSelected` handles each pair. On a match, it marks both cards `matched` and fires `party-js` sparkles on the clicked DOM elements (`payload.element.target`). On a miss, it hides both again after `TIME_SHOWING_CARD`.
- **Derived state**: `moves = floor(clicks / 2)`. `GameStatus` is a computed that returns "YOU Win!" when every card is matched. It also sets the timer to stop as a side effect.
- **Timer**: `Timer.vue` uses the Options API. The parent drives it only through the `startStatus` prop (`start`/`stop`/`reset`, defined in `src/assets/constants.js`), and it reacts in a watcher.
- **Constants**: timing values are in `src/assets/constants.js`. `TIME_FLIPPING_CARD` is interpolated into a Tailwind class (`duration-${...}`). That works only because the matching `duration-700` class is generated. If you change the value, use another Tailwind duration that exists, or safelist it.
- **Win animation**: a `<lottie-player>` web component plays `public/trophy.json`. The component is loaded from unpkg via a `<script>` tag in `index.html`; it is not an npm dependency.

## Styling

`tailwind.config.js` overrides the `blue-500`, `orange-500` and `green-500` colors with brand values. It also adds custom 3D utilities for the card flip: `backface-hidden`, `rotate-y-180`, `perspective-1000` and `preserve-3d`. `src/index.css` holds the global styles and font imports.
