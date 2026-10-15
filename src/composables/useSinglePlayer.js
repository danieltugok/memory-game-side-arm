import { ref, watch, computed } from "vue";
import cardsOnDeckFull from "../assets/cardsOnDeck.json";
import party from "party-js";
import constants from "../assets/constants";

const TROPHY_MS = 2500;

// Single-player game: all state lives in this browser.
// `indexCard` must always equal the card's position in cardList (flip() indexes by it).
export function useSinglePlayer() {
  const cardList = ref([]);
  const cardsSelected = ref([]);
  const statusSelection = ref("");
  const clicks = ref(0);
  const startStatus = ref(null);
  const cardsOnDeck = ref([]);
  const level = ref(null);
  const levels = constants.LEVELS;
  const nickname = ref("");
  const leaderboard = ref(null); // after a win: { id, timeMs, moves, scores } or { error: true }
  let startedAt = null; // first flip, like the Timer

  // Shuffle the full deck and pick as many logos as the level has pairs
  const chosenCards = () => {
    cardList.value = [];
    cardsOnDeck.value = [...cardsOnDeckFull]
      .sort(() => Math.random() - 0.5)
      .slice(0, levels[level.value].pairs);

    cardsOnDeck.value.forEach((card, index) => {
      cardList.value.push({
        value: card.logo,
        name: card.name,
        visible: true,
        indexCard: index,
        matched: false,
        pair: "a",
      });

      cardList.value.push({
        value: card.logo,
        name: card.name,
        visible: true,
        indexCard: cardsOnDeck.value.length + index + 1,
        matched: false,
        pair: "b",
      });
    });
  };

  // Cards in the shape GameBoard expects
  const cards = computed(() =>
    cardList.value.map((card) => ({ ...card, key: `${card.value}-${card.pair}` }))
  );

  const GameStatus = computed(() => {
    if (cardList.value.length && cardList.value.every((item) => item.matched === true)) {
      startStatus.value = constants.TIMER_STOP;
      return "YOU Win!";
    }
    return;
  });

  const remainingPairs = computed(() => {
    return cardList.value.filter((card) => card.matched === false).length / 2;
  });

  const moves = computed(() => {
    return Math.floor(clicks.value / 2);
  });

  const pairsMatched = computed(() => {
    return cardsOnDeck.value.length - remainingPairs.value;
  });

  let startGameTimeout = null;

  const restarGame = () => {
    clicks.value = 0;
    startedAt = null;
    leaderboard.value = null;
    cardsSelected.value = [];
    startStatus.value = constants.TIMER_RESET;

    chosenCards();

    cardList.value = cardList.value.map((card) => {
      return {
        ...card,
        visible: true,
      };
    });

    // Cancel a pending shuffle from a previous restart so it can't hide the new deck early
    clearTimeout(startGameTimeout);
    startGameTimeout = setTimeout(() => {
      shuffleCards();
      cardList.value = cardList.value.map((card, index) => {
        return {
          ...card,
          matched: false,
          indexCard: index,
          visible: false,
        };
      });
    }, constants.BEGGINING_TIME_SHOWING_CARD);
  };

  const startLevel = (key, name) => {
    level.value = key;
    nickname.value = name;
    restarGame();
  };

  const changeLevel = () => {
    clearTimeout(startGameTimeout);
    clicks.value = 0;
    startedAt = null;
    leaderboard.value = null;
    cardsSelected.value = [];
    cardList.value = [];
    cardsOnDeck.value = [];
    startStatus.value = constants.TIMER_RESET;
    level.value = null;
  };

  const shuffleCards = () => {
    cardList.value = cardList.value.sort(() => Math.random() - 0.5);
  };

  const flip = (payload) => {
    // Checking if has 2 cards opened to lock the possibility to open others
    const hasCardsOpenedThatNotMatch = cardList.value.filter((item) => {
      return item.matched === false && item.visible === true;
    });

    if (hasCardsOpenedThatNotMatch.length <= 1 && !cardList.value[payload.indexCard].visible) {
      startStatus.value = constants.TIMER_START;
      startedAt ??= Date.now();
      cardList.value[payload.indexCard].visible = true;
      clicks.value++;

      if (cardsSelected.value[0]) {
        // Check if clicked on the exactly same card
        if (cardsSelected.value[0].indexCard != payload.indexCard)
          cardsSelected.value[1] = payload;
      } else cardsSelected.value[0] = payload;
    }
  };

  watch(
    cardsSelected,
    (currentValue) => {
      if (currentValue.length === 2) {
        const firstCard = currentValue[0];
        const secondCard = currentValue[1];

        // Compare the real logos: the board hides a face-down card's value, so the click payload has none
        if (cardList.value[firstCard.indexCard].value === cardList.value[secondCard.indexCard].value) {
          statusSelection.value = "Match!";
          party.sparkles(firstCard.element.target, { shapes: ["star"] });
          party.sparkles(secondCard.element.target, { shapes: ["star"] });
          cardList.value[firstCard.indexCard].matched = true;
          cardList.value[secondCard.indexCard].matched = true;
        } else {
          statusSelection.value = "Opps! Not yet...";
          const deck = cardList.value;
          setTimeout(() => {
            // Skip if the player restarted or changed level in the meantime
            if (cardList.value !== deck) return;
            cardList.value[firstCard.indexCard].visible = false;
            cardList.value[secondCard.indexCard].visible = false;
          }, constants.TIME_SHOWING_CARD);
        }

        cardsSelected.value.length = 0;
      }
    },
    { deep: true }
  );

  // Save the record on a win and keep the level's top 10 to show
  watch(GameStatus, async (won) => {
    if (!won) return;
    const deck = cardList.value;
    const score = { name: nickname.value, level: level.value, timeMs: Date.now() - startedAt, moves: moves.value };
    const save = fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(score),
      // A server that never answers must not keep the leaderboard from opening
      signal: AbortSignal.timeout(10_000),
    })
      .then((res) => (res.ok ? res.json() : { error: true }))
      .catch(() => ({ error: true }));
    // Let the trophy animation finish before the leaderboard covers it
    const [result] = await Promise.all([save, new Promise((done) => setTimeout(done, TROPHY_MS))]);
    // Skip if the player restarted or changed level in the meantime
    if (cardList.value === deck) leaderboard.value = { ...score, ...result };
  });

  return {
    cards,
    level,
    levels,
    flip,
    startLevel,
    restarGame,
    changeLevel,
    GameStatus,
    remainingPairs,
    pairsMatched,
    moves,
    startStatus,
    leaderboard,
  };
}
