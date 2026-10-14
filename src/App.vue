<template>
  <div class="my-7 flex flex-col justify-center items-center relative md:my-20">
    <div class="flex flex-col justify-between w-9/12 items-center mb-10 max-w-6xl md:flex-row ">
      <div>
        <h1 class="title text-5xl mb-10 mr-12 text-orange-500 text-center font-bold md:text-left md:mb-0 md:text-5xl ">
          SideArm <span>Match</span>
        </h1>
      </div>

      <div v-if="screen === 'single'" class="text-orange-500 flex flex-col text-center gap-4">
        <div class="flex gap-4">
          <div
            class="bg-opacity-10 bg-white rounded-2xl py-3 px-4 relative text-4xl flex flex-col justify-center align-center content-center"
          >
            <div>
              <span class="text-center roboto-mono">{{ single.pairsMatched }}</span>
              <span class="text-sm right-2 roboto-mono">/{{ single.remainingPairs }}</span>
            </div>
            <span class="text-xs text-center font-bold roboto-mono">Matches</span>
          </div>
          <div
            class="bg-opacity-10 bg-white rounded-2xl py-3 px-4 relative text-4xl flex flex-col justify-center align-center content-center"
          >
          <span class="text-center roboto-mono">{{ single.moves }}</span>
          <span class="text-xs text-center font-bold roboto-mono">Moves</span>
          </div>

        <div
          class="flex flex-col justify-around items-center bg-opacity-10 bg-white rounded-2xl py-3 px-4"
        >
          <Timer :startStatus="single.startStatus" />
          <div class="font-bold text-xs roboto-mono">Timer</div>
        </div>

        </div>
      </div>

      <Scoreboard v-else-if="screen === 'multi'" :room="mp.room" />
    </div>

    <div
      v-if="winText"
      class="w-[32rem] absolute z-50 top-[9%]"
    >
      <!-- :src must stay a binding. With only static attributes, Vue's production build copies the
           first trophy element for later wins, and the copy loses src/autoplay (set as properties). -->
      <lottie-player
        :src="trophySrc"
        background="transparent"
        speed="1"
        style="width: 512px; height: 512px;"
        autoplay
      />

      <div class="ribbon text-center absolute bottom-20 left-40">{{ winText }}</div>
    </div>

    <div
      v-if="mp.status === 'reconnecting' && mp.room"
      class="fixed top-0 inset-x-0 z-50 bg-orange-500 text-blue-500 text-center font-bold roboto-mono py-2"
    >
      Connection lost. Reconnecting…
    </div>

    <div
      v-else-if="mp.notice && screen === 'multi'"
      role="status"
      class="fixed top-0 inset-x-0 z-50 bg-orange-500 text-blue-500 text-center font-bold roboto-mono py-2"
    >
      {{ mp.notice }}
    </div>

    <ConfirmDialog
      :open="confirmRestart"
      title="Restart the game?"
      message="Everyone gets a new deck and all scores go back to 0."
      confirmLabel="Restart"
      @confirm="restartMulti"
      @cancel="confirmRestart = false"
    />

    <Leaderboard
      v-if="(screen === 'single' && single.leaderboard) || showLeaderboard"
      :key="single.leaderboard ? 'result' : 'browse'"
      :result="screen === 'single' ? single.leaderboard : null"
      :level="single.level || 'easy'"
      @close="closeLeaderboard"
      @play-again="single.restarGame"
    />

    <StartScreen
      v-if="screen === 'start'"
      :joinInfo="joinInfo"
      @play="onPlay"
      @join="onJoin"
      @cancel-join="backToStart"
    />

    <div
      v-else-if="screen === 'connecting'"
      class="w-full max-w-md px-4 flex flex-col items-center gap-6 text-orange-500 roboto-mono text-center"
    >
      <template v-if="mp.status === 'unreachable'">
        <h2 class="text-xl font-bold">Couldn't reach the game server</h2>
        <div class="flex gap-4">
          <button class="btn-outline px-5 py-4" @click="mp.retry">Retry</button>
          <button class="btn-outline px-5 py-4" @click="backToStart">Play single player</button>
        </div>
      </template>
      <template v-else>
        <div class="spinner" aria-hidden="true"></div>
        <h2 class="text-xl font-bold">Connecting to game server…</h2>
        <button class="btn-outline px-5 py-3 text-sm" @click="backToStart">Cancel</button>
      </template>
    </div>

    <Lobby
      v-else-if="screen === 'lobby'"
      :room="mp.room"
      :isHost="mp.isHost"
      @start="mp.startGame"
      @leave="backToStart"
    />

    <GameBoard
      v-else-if="screen === 'single'"
      :cards="single.cards"
      :level="single.level"
      @flip="single.flip"
    />

    <GameBoard
      v-else-if="screen === 'multi'"
      :cards="multiCards"
      :level="mp.room.level"
      sparkleOnMatch
      @flip="onMultiFlip"
    />

    <div v-if="screen === 'single'" class="flex gap-4 mb-10">
      <button class="btn-outline roboto-mono py-4 px-5" @click="single.restarGame">
        Restart Game
      </button>
      <button class="btn-outline roboto-mono py-4 px-5" @click="backToStart">
        Change Level
      </button>
    </div>

    <div v-else-if="screen === 'multi'" class="flex flex-col items-center gap-3 mb-10 roboto-mono text-orange-500">
      <div class="flex gap-4">
        <button
          v-if="mp.room.phase === 'finished' && mp.isHost"
          class="btn-outline py-4 px-5"
          @click="mp.playAgain"
        >
          Play again
        </button>
        <button
          v-else-if="mp.isHost"
          class="btn-outline py-4 px-5"
          @click="confirmRestart = true"
        >
          Restart game
        </button>
        <button class="btn-outline py-4 px-5" @click="backToStart">Leave</button>
      </div>
      <p v-if="mp.room.phase === 'finished' && !mp.isHost" class="text-sm">Waiting for the host to start a new game…</p>
    </div>

    <button class="btn-outline roboto-mono py-3 px-5 mt-4" @click="showLeaderboard = true">Leaderboard</button>
  </div>
</template>

<script>
import { ref, reactive, computed, watch } from "vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import GameBoard from "./components/GameBoard.vue";
import Leaderboard from "./components/Leaderboard.vue";
import Lobby from "./components/Lobby.vue";
import Scoreboard from "./components/Scoreboard.vue";
import StartScreen from "./components/StartScreen.vue";
import Timer from "./components/Timer.vue";
import { useSinglePlayer } from "./composables/useSinglePlayer";
import { useMultiplayer } from "./composables/useMultiplayer";

const setRoomInUrl = (roomId) => {
  const url = roomId ? `${location.pathname}?room=${roomId}` : location.pathname;
  history.replaceState(null, "", url);
};

export default {
  name: "App",
  components: {
    ConfirmDialog,
    GameBoard,
    Leaderboard,
    Lobby,
    Scoreboard,
    StartScreen,
    Timer,
  },
  setup() {
    // reactive() unwraps the refs, so the template can use single.cards, mp.room, ...
    const single = reactive(useSinglePlayer());
    const mp = reactive(useMultiplayer());

    const mode = ref(null); // null (start screen) | "single" | "multi"
    const joinInfo = ref(null); // room summary when opened from a room link
    const loadingRoomInfo = ref(false);
    const confirmRestart = ref(false);
    const showLeaderboard = ref(false);
    const trophySrc = "./trophy.json";
    let nickname = "";

    const screen = computed(() => {
      if (mode.value === "single") return "single";
      if (mp.room) return mp.room.phase === "lobby" ? "lobby" : "multi";
      if (mode.value === "multi" || loadingRoomInfo.value) return "connecting";
      return "start";
    });

    const winText = computed(() => {
      if (screen.value === "single") return single.GameStatus;
      if (screen.value !== "multi" || mp.room.phase !== "finished") return null;
      const { winners, you, players } = mp.room;
      if (winners.length > 1) return "Tie!";
      if (winners[0] === you) return "You win!";
      const winner = players.find((p) => p.seat === winners[0]);
      return winner ? `${winner.name} wins!` : null;
    });

    // Server cards in the shape GameBoard expects. Face-down cards have no logo yet.
    const multiCards = computed(() =>
      (mp.room?.cards ?? []).map((card, index) => ({
        key: card.id,
        value: card.logo || "",
        name: card.name || "",
        visible: card.faceUp,
        matched: card.matched,
        indexCard: index,
      }))
    );

    const loadJoinInfo = async (roomId) => {
      loadingRoomInfo.value = true;
      const info = await mp.fetchRoomInfo(roomId);
      loadingRoomInfo.value = false;
      joinInfo.value = { ...info, id: roomId };
    };

    const onPlay = ({ nickname: name, mode: chosenMode, level }) => {
      nickname = name;
      mode.value = chosenMode;
      if (chosenMode === "single") single.startLevel(level, name);
      else mp.createRoom(name, level);
    };

    const onJoin = ({ nickname: name }) => {
      nickname = name;
      mode.value = "multi";
      mp.joinRoom(joinInfo.value.id, name);
    };

    const restartMulti = () => {
      confirmRestart.value = false;
      mp.restartGame();
    };

    // The game ended (or we left) while the dialog was open: restarting no longer applies
    watch(screen, (current) => {
      if (current !== "multi") confirmRestart.value = false;
    });
    watch(
      () => mp.room?.phase,
      (phase) => {
        if (phase === "finished") confirmRestart.value = false;
      }
    );

    const closeLeaderboard = () => {
      showLeaderboard.value = false;
      single.leaderboard = null;
    };

    const onMultiFlip = (payload) => {
      if (mp.isMyTurn) mp.flip(payload.indexCard);
    };

    const backToStart = () => {
      if (mode.value === "single") single.changeLevel();
      mp.leave();
      mode.value = null;
      joinInfo.value = null;
      loadingRoomInfo.value = false;
      setRoomInUrl(null);
    };

    // Entered a room: put it in the URL and remember it so a reload rejoins
    watch(
      () => mp.room?.id,
      (roomId) => {
        if (!roomId) return;
        mp.rememberRoom(nickname);
        setRoomInUrl(roomId);
        joinInfo.value = null;
      }
    );

    // Couldn't join (or lost the seat): show why on the start screen
    watch(
      () => mp.error,
      (error) => {
        if (!error) return;
        mode.value = null;
        joinInfo.value = { error: error.code };
      }
    );

    // Opened from a room link: rejoin if this tab was already in it (reload), otherwise ask for a nickname
    const linkRoom = new URLSearchParams(location.search).get("room")?.toUpperCase();
    if (linkRoom) {
      const saved = mp.savedRoom();
      if (saved.roomId === linkRoom && saved.nickname) {
        nickname = saved.nickname;
        mode.value = "multi";
        mp.joinRoom(linkRoom, saved.nickname);
      } else {
        loadJoinInfo(linkRoom);
      }
    }

    return {
      single,
      mp,
      screen,
      joinInfo,
      winText,
      multiCards,
      onPlay,
      onJoin,
      onMultiFlip,
      backToStart,
      confirmRestart,
      restartMulti,
      trophySrc,
      showLeaderboard,
      closeLeaderboard,
    };
  },
};
</script>

<style>
/* Only animate the shuffle. Vue also puts the move class on leaving cards, so
   any transition on them keeps the old deck in the grid next to the new one
   on restart. Leaving cards get no transition and are hidden right away. */
.shuffle-move:not(.shuffle-leave-active) {
  transition: transform 0.6s ease;
}

.shuffle-leave-active {
  display: none;
}

.title {
  font-family: "Kaushan Script", cursive;
}

.ribbon {
  background: #4b9ae5;
  display: inline-block;
  color: #f4f4f4;
  padding: 0.5em 0.7em;
  font-weight: 900;
  letter-spacing: 0.2em;
  position: relative;
  font-size: 1.5em;
  text-transform: uppercase;
  transform-style: preserve-3d;
  transform: rotate(-20deg) skew(-20deg, 10deg);
}

.spinner {
  width: 2.5rem;
  height: 2.5rem;
  border: 4px solid rgba(244, 125, 32, 0.25);
  border-top-color: #f47d20;
  border-radius: 9999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
