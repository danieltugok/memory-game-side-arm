import { ref, watch, computed } from "vue";
import constants from "../assets/constants";

const TROPHY_MS = 2500;

// Single player is played on the server in a one-seat "solo" room, through useMultiplayer:
// the browser never gets a face-down card's logo, and the server times the game and saves
// the score. This only turns that room into what the single-player screen shows.
export function useSinglePlayer(mp) {
  const room = computed(() => (mp.room?.solo ? mp.room : null));
  const leaderboard = ref(null); // after a win: { timeMs, moves, id, scores } or { error: true }

  const level = computed(() => room.value?.level ?? null);
  const cards = computed(() => room.value?.cards ?? []);
  const GameStatus = computed(() => (room.value?.phase === "finished" ? "YOU Win!" : undefined));
  const pairsMatched = computed(() => cards.value.filter((c) => c.matched).length / 2);
  const remainingPairs = computed(() => cards.value.filter((c) => !c.matched).length / 2);
  const moves = computed(() => room.value?.moves ?? 0);
  // The Timer is only for show; the server's clock also starts at the first flip
  const startStatus = computed(() => {
    if (room.value?.phase === "finished") return constants.TIMER_STOP;
    return room.value?.started ? constants.TIMER_START : constants.TIMER_RESET;
  });

  // Let the trophy animation finish before the leaderboard covers it.
  // The result can arrive before the final room:state, so time it from the result.
  watch(
    () => mp.result,
    (result) => {
      if (!result) return;
      setTimeout(() => {
        // Skip if the player restarted or left in the meantime
        if (mp.result === result) leaderboard.value = result;
      }, TROPHY_MS);
    }
  );

  const startLevel = (key, name) => {
    leaderboard.value = null;
    mp.createRoom(name, key, true);
  };

  // Restart mid-game, or play again after a win
  const restarGame = () => {
    leaderboard.value = null;
    if (room.value?.phase === "finished") mp.playAgain();
    else mp.restartGame();
  };

  const changeLevel = () => (leaderboard.value = null);

  return {
    level,
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
