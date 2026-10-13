<template>
  <div class="lobby w-full max-w-md px-4 flex flex-col items-center gap-6 text-orange-500 roboto-mono">
    <h2 class="text-xl font-bold text-center">Waiting room · {{ levelLabel }}</h2>

    <div class="w-full flex flex-col gap-2">
      <label class="text-xs font-bold" for="share-link">Send this link to the other players</label>
      <div class="flex gap-2">
        <input
          id="share-link"
          :value="shareUrl"
          readonly
          class="flex-1 min-w-0 bg-white bg-opacity-10 rounded-lg px-3 py-2 text-sm text-white"
          @focus="$event.target.select()"
        />
        <button class="btn-outline shrink-0 px-4 py-2" @click="copyLink">{{ copied ? "Copied!" : "Copy link" }}</button>
      </div>
    </div>

    <ul class="w-full flex flex-col gap-2">
      <li
        v-for="player in room.players"
        :key="player.seat"
        class="flex justify-between items-center bg-white bg-opacity-10 rounded-xl px-4 py-3"
        :class="player.connected ? '' : 'opacity-40'"
      >
        <span class="font-bold truncate">
          {{ player.name }}<span v-if="player.seat === room.you" class="font-normal"> (you)</span>
        </span>
        <span class="text-xs shrink-0 ml-2">{{ player.seat === room.host ? "Host" : player.connected ? "" : "Reconnecting…" }}</span>
      </li>
      <li
        v-for="n in openSeats"
        :key="`open-${n}`"
        class="border border-dashed border-orange-500 border-opacity-40 rounded-xl px-4 py-3 text-sm opacity-60"
      >
        Open seat
      </li>
    </ul>

    <div class="flex gap-4">
      <button
        v-if="isHost"
        class="btn-outline px-5 py-4 disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canStart"
        @click="$emit('start')"
      >
        Start game
      </button>
      <button class="btn-outline px-5 py-4" @click="$emit('leave')">Leave</button>
    </div>
    <p class="text-sm text-center h-5">
      <template v-if="!canStart">Waiting for at least one more player…</template>
      <template v-else-if="!isHost">Waiting for the host to start…</template>
    </p>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import constants from "../assets/constants";

const MAX_PLAYERS = 4;

export default {
  name: "Lobby",
  props: {
    room: { type: Object, required: true },
    isHost: { type: Boolean, default: false },
  },
  emits: ["start", "leave"],
  setup(props) {
    const copied = ref(false);
    const shareUrl = computed(() => `${location.origin}${location.pathname}?room=${props.room.id}`);
    const levelLabel = computed(() => constants.LEVELS[props.room.level]?.label ?? "");
    const openSeats = computed(() => Math.max(0, MAX_PLAYERS - props.room.players.length));
    const canStart = computed(() => props.room.players.filter((p) => p.connected).length >= 2);

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl.value);
      } catch {
        // Clipboard API needs https or localhost; fall back to selecting the text
        document.getElementById("share-link")?.select();
        document.execCommand?.("copy");
      }
      copied.value = true;
      setTimeout(() => (copied.value = false), 2000);
    };

    return { copied, shareUrl, levelLabel, openSeats, canStart, copyLink };
  },
};
</script>

