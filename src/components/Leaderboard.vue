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
      <h2 id="leaderboard-title" class="text-xl font-bold">Leaderboard</h2>
      <p v-if="result" class="text-sm text-white">
        Your time: <strong>{{ formatTime(result.timeMs) }}</strong> · {{ result.moves }} moves
        <span v-if="result.error"><br />Couldn't save your score this time.</span>
      </p>

      <div role="tablist" class="grid grid-cols-3 gap-2">
        <button
          v-for="(option, key) in levels"
          :key="key"
          role="tab"
          :aria-selected="active === key"
          class="btn-outline px-2 py-1 text-sm"
          :class="{ confirm: active === key }"
          @click="show(key)"
        >
          {{ option.label }}
        </button>
      </div>

      <div role="tabpanel" class="min-h-[18rem]">
        <p v-if="tabs[active] === 'loading'" class="text-sm text-white">Loading…</p>
        <p v-else-if="tabs[active] === 'error'" class="text-sm text-white">Couldn't load the scores.</p>
        <p v-else-if="!tabs[active].length" class="text-sm text-white">No scores yet. Be the first!</p>
        <table v-else class="w-full text-sm text-left">
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
              v-for="(score, index) in tabs[active]"
              :key="score.id"
              :class="{ 'bg-orange-500 text-blue-500 font-bold': isYours(score) }"
            >
              <td class="py-1 px-1">{{ index + 1 }}</td>
              <td class="py-1 break-all">{{ score.name }}</td>
              <td class="py-1 text-right">{{ formatTime(score.timeMs) }}</td>
              <td class="py-1 px-1 text-right">{{ score.moves }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="result?.scores && active === result.level && !tabs[active].some(isYours)" class="text-sm text-white mt-2">
          Not in the top 10 yet. Try again!
        </p>
      </div>

      <div class="flex justify-end gap-3">
        <button ref="closeButton" class="btn-outline px-4 py-2" @click="$emit('close')">Close</button>
        <button v-if="result" ref="againButton" class="btn-outline confirm px-4 py-2" @click="$emit('play-again')">
          Play again
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from "vue";
import constants from "../assets/constants";

// Top 10 per level, one tab each. After a single-player win, `result` is the player's score
// ({ level, timeMs, moves, id, scores } or { level, timeMs, moves, error: true }): its tab opens first
// with the player's row highlighted.
export default {
  name: "Leaderboard",
  props: {
    result: { type: Object, default: null },
    level: { type: String, default: "easy" },
  },
  emits: ["close", "play-again"],
  setup(props) {
    const closeButton = ref(null);
    const againButton = ref(null);
    const active = ref(props.result?.level ?? props.level);
    const tabs = reactive({}); // level -> scores array | "loading" | "error"
    if (props.result?.scores) tabs[props.result.level] = props.result.scores;

    const show = async (level) => {
      active.value = level;
      if (Array.isArray(tabs[level]) || tabs[level] === "loading") return;
      tabs[level] = "loading";
      try {
        const res = await fetch(`/api/scores?level=${level}`, { signal: AbortSignal.timeout(10_000) });
        tabs[level] = res.ok ? (await res.json()).scores : "error";
      } catch {
        tabs[level] = "error";
      }
    };

    show(active.value);
    onMounted(() => (againButton.value ?? closeButton.value)?.focus());

    const isYours = (score) => score.id === props.result?.id;

    // 83456 -> "1:23.4"
    const formatTime = (ms) => {
      const tenths = Math.floor(ms / 100);
      const sec = Math.floor(tenths / 10) % 60;
      return `${Math.floor(tenths / 600)}:${String(sec).padStart(2, "0")}.${tenths % 10}`;
    };

    return { levels: constants.LEVELS, active, tabs, show, isYours, formatTime, closeButton, againButton };
  },
};
</script>
