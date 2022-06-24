<template>
  <div
    @click="cardSelected"
    class="flip-card border-2 border-orange-500 w-24 h-24 relative text-center"
  >
  <div class="flip-card-inner">
    <div
      v-if="visible"
      class="flip-card-front bg-red-600 text-white min-w-full min-h-full absolute"
    >
      {{ value }} - {{matched}}
    </div>
    <div
      v-else
      class="flip-card-back bg-green-600 text-white min-w-full min-h-full absolute"
    >
      Back
    </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    indexCard: {
      type: Number,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    visible: {
      type: Boolean,
      default: false
    },
    matched: {
      type: Boolean,
      default: false
    }
  },

  setup({indexCard, value}, context) {
    const cardSelected = () => {
      context.emit("card-selected", {
        indexCard,
        cardValue: value
      });
    };

    return {
      cardSelected,
    };
  },
};
</script>

<style></style>
