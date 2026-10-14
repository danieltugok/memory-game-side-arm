<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      class="confirm-dialog w-full max-w-md rounded-2xl border border-orange-500 p-6 text-orange-500 roboto-mono flex flex-col gap-4"
    >
      <h2 id="leaderboard-title" class="text-xl font-bold">{{ levelLabel }} leaderboard</h2>
      <p class="text-sm text-white">
        Your time: <strong>{{ formatTime(result.timeMs) }}</strong> · {{ result.moves }} moves
      </p>

      <p v-if="result.error" class="text-sm text-white">Couldn't save your score this time.</p>
      <template v-else>
        <table class="w-full text-sm text-left">
          <thead>
            <tr class="border-b border-orange-500">
              <th class="py-1">#</th>
              <th class="py-1">Name</th>
              <th class="py-1 text-right">Time</th>
              <th class="py-1 text-right">Moves</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr
              v-for="(score, index) in result.scores"
              :key="score.id"
              :class="{ 'bg-orange-500 text-blue-500 font-bold': score.id === result.id }"
            >
              <td class="py-1 px-1">{{ index + 1 }}</td>
              <td class="py-1 break-all">{{ score.name }}</td>
              <td class="py-1 text-right">{{ formatTime(score.timeMs) }}</td>
              <td class="py-1 px-1 text-right">{{ score.moves }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!result.scores.some((s) => s.id === result.id)" class="text-sm text-white">
          Not in the top 10 yet. Try again!
        </p>
      </template>

      <div class="flex justify-end gap-3 mt-2">
        <button class="btn-outline px-4 py-2" @click="$emit('close')">Close</button>
        <button ref="againButton" class="btn-outline confirm px-4 py-2" @click="$emit('play-again')">Play again</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";

// Shown after a single-player win: the player's result and the level's top 10.
// result: { id, timeMs, moves, scores: [{ id, name, timeMs, moves }] } or { timeMs, moves, error: true }
export default {
  name: "Leaderboard",
  props: {
    result: { type: Object, required: true },
    levelLabel: { type: String, required: true },
  },
  emits: ["close", "play-again"],
  setup() {
    const againButton = ref(null);
    onMounted(() => againButton.value?.focus());

    // 83456 -> "1:23.4"
    const formatTime = (ms) => {
      const tenths = Math.floor(ms / 100);
      const sec = Math.floor(tenths / 10) % 60;
      return `${Math.floor(tenths / 600)}:${String(sec).padStart(2, "0")}.${tenths % 10}`;
    };

    return { againButton, formatTime };
  },
};
</script>
