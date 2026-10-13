<template>
  <form
    class="start-screen w-full max-w-md px-4 flex flex-col items-center gap-6 text-orange-500 roboto-mono"
    @submit.prevent="submit"
  >
    <!-- Joining from a shared link -->
    <template v-if="joinInfo">
      <template v-if="joinInfo.error">
        <h2 class="text-xl font-bold text-center">{{ errorMessages[joinInfo.error] || "Can't join this room" }}</h2>
        <button type="button" class="btn-outline px-5 py-4" @click="$emit('cancel-join')">Back to start</button>
      </template>
      <template v-else>
        <h2 class="text-xl font-bold text-center">
          Join {{ joinInfo.hostName }}'s room · {{ levels[joinInfo.level]?.label }}
        </h2>
        <label class="w-full flex flex-col gap-2">
          <span class="text-sm font-bold">Your nickname</span>
          <input v-model="nickname" v-bind="nicknameAttrs" />
        </label>
        <div class="flex gap-4">
          <button type="submit" class="btn-outline px-5 py-4 disabled:opacity-40" :disabled="!nickname.trim()">Join</button>
          <button type="button" class="btn-outline px-5 py-4" @click="$emit('cancel-join')">Cancel</button>
        </div>
      </template>
    </template>

    <!-- New game -->
    <template v-else>
      <label class="w-full flex flex-col gap-2">
        <span class="text-sm font-bold">Your nickname</span>
        <input v-model="nickname" v-bind="nicknameAttrs" />
      </label>

      <fieldset class="w-full flex flex-col gap-2">
        <legend class="text-sm font-bold mb-2">Players</legend>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="option in modes"
            :key="option.key"
            type="button"
            class="option"
            :class="{ selected: mode === option.key }"
            :aria-pressed="mode === option.key"
            @click="mode = option.key"
          >
            <span class="text-lg font-bold">{{ option.label }}</span>
            <span class="text-xs">{{ option.hint }}</span>
          </button>
        </div>
      </fieldset>

      <fieldset class="w-full flex flex-col gap-2">
        <legend class="text-sm font-bold mb-2">Level</legend>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="(option, key) in levels"
            :key="key"
            type="button"
            class="option"
            :class="{ selected: level === key }"
            :aria-pressed="level === key"
            @click="level = key"
          >
            <span class="text-lg font-bold">{{ option.label }}</span>
            <span class="text-xs">{{ option.pairs * 2 }} cards</span>
          </button>
        </div>
      </fieldset>

      <button type="submit" class="btn-outline w-full px-5 py-4 text-lg disabled:opacity-40" :disabled="!nickname.trim()">
        {{ mode === "single" ? "Play" : "Create room" }}
      </button>
    </template>
  </form>
</template>

<script>
import { ref } from "vue";
import constants from "../assets/constants";

const NAME_KEY = "sam-nickname";
const loadName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
};
const saveName = (name) => {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage blocked: the name just won't be prefilled next time
  }
};

export default {
  name: "StartScreen",
  props: {
    // Set when the page was opened from a room link: { hostName, level, error }
    joinInfo: { type: Object, default: null },
  },
  emits: ["play", "join", "cancel-join"],
  setup(props, { emit }) {
    const nickname = ref(loadName());
    const mode = ref("single");
    const level = ref("medium");

    const submit = () => {
      const name = nickname.value.trim();
      if (!name) return;
      saveName(name);
      if (props.joinInfo) {
        if (!props.joinInfo.error) emit("join", { nickname: name });
      } else {
        emit("play", { nickname: name, mode: mode.value, level: level.value });
      }
    };

    return {
      nickname,
      mode,
      level,
      submit,
      levels: constants.LEVELS,
      modes: [
        { key: "single", label: "Single", hint: "Just you" },
        { key: "multi", label: "Multiplayer", hint: "2–4 players" },
      ],
      nicknameAttrs: {
        maxlength: 20,
        required: true,
        autocomplete: "nickname",
        placeholder: "e.g. Daniel",
        class: "w-full bg-white bg-opacity-10 rounded-lg px-4 py-3 text-white text-lg placeholder-orange-200 placeholder-opacity-50",
      },
      errorMessages: {
        NOT_FOUND: "Room not found",
        FULL: "Room is full",
        IN_PROGRESS: "Game already in progress",
      },
    };
  },
};
</script>

<style>
.start-screen .option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 0.5rem;
  border: 1px solid rgba(244, 125, 32, 0.5);
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s, color 0.3s, border-color 0.3s;
}
.start-screen .option:hover {
  border-color: #f47d20;
}
.start-screen .option.selected {
  background: #f47d20;
  border-color: #f47d20;
  color: #22384b;
}
</style>
