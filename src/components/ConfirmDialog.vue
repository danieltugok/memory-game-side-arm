<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4"
    @click.self="$emit('cancel')"
    @keydown.esc="$emit('cancel')"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      class="confirm-dialog w-full max-w-sm rounded-2xl border border-orange-500 p-6 text-orange-500 roboto-mono flex flex-col gap-4"
    >
      <h2 :id="titleId" class="text-xl font-bold">{{ title }}</h2>
      <p class="text-sm text-white">{{ message }}</p>
      <div class="flex justify-end gap-3 mt-2">
        <button ref="cancelButton" class="btn-outline px-4 py-2" @click="$emit('cancel')">Cancel</button>
        <button class="btn-outline confirm px-4 py-2" @click="$emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, nextTick } from "vue";

let dialogCount = 0;

// Small yes/no dialog in the game's style. Esc or a click outside cancels.
export default {
  name: "ConfirmDialog",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    confirmLabel: { type: String, default: "Confirm" },
  },
  emits: ["confirm", "cancel"],
  setup(props) {
    const cancelButton = ref(null);
    const titleId = `confirm-title-${++dialogCount}`;

    // Focus the safe choice so Enter doesn't confirm by accident
    watch(
      () => props.open,
      async (open) => {
        if (!open) return;
        await nextTick();
        cancelButton.value?.focus();
      }
    );

    return { cancelButton, titleId };
  },
};
</script>

<style>
.confirm-dialog {
  background: #22384b;
}
.confirm-dialog .confirm {
  background: #f47d20;
  color: #22384b;
}
</style>
