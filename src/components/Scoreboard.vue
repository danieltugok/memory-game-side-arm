<template>
  <div class="text-orange-500 roboto-mono flex flex-col items-center gap-2 md:items-end">
    <div class="flex flex-wrap justify-center gap-2 md:gap-3">
      <div
        v-for="player in room.players"
        :key="player.seat"
        class="bg-white bg-opacity-10 rounded-2xl py-2 px-4 text-center border-2 transition duration-300"
        :class="[
          player.seat === room.turn ? 'border-orange-500' : 'border-transparent',
          player.connected ? '' : 'opacity-40',
        ]"
      >
        <div class="text-3xl">{{ player.score }}</div>
        <div class="text-xs font-bold max-w-[7rem] truncate">
          {{ player.name }}<span v-if="player.seat === room.you"> (you)</span>
        </div>
      </div>
    </div>
    <div class="text-sm font-bold h-5">{{ turnLabel }}</div>
  </div>
</template>

<script>
import { computed } from "vue";

export default {
  name: "Scoreboard",
  props: {
    room: { type: Object, required: true },
  },
  setup(props) {
    const turnLabel = computed(() => {
      const { phase, turn, you, players } = props.room;
      if (phase === "preview") return "Memorize the cards…";
      if (phase === "finished") return "Game over";
      if (!turn) return "";
      if (turn === you) return "Your turn";
      return `${players.find((p) => p.seat === turn)?.name ?? "Someone"}'s turn`;
    });
    return { turnLabel };
  },
};
</script>
