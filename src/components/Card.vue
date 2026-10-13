<template>
  <div
    @click="cardSelected"
    class="flip-card w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 relative text-center group perspective-1000"
  >
    <div 
      class="flip-card-inner preserve-3d w-full h-full transition-transform" 
      :class="[visible?'rotate-y-180':'', `duration-${durationFlipCard}`]"
    >
      <div
        class="flip-card-front shadow-md border-4 rounded p-2 bg-white text-black w-full h-full absolute rotate-y-180 backface-hidden"
        :class="matched?'opacity-10 border-green-500':''"
      >
        <img
          v-if="!imageFailed"
          :src="value"
          :alt="name"
          class="w-full h-full object-contain"
          @error="imageFailed = true"
        >
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-xs md:text-sm font-bold leading-tight"
        >
          {{ name }}
        </div>
      </div>
      <div
        class="flip-card-back p-4 bg-green-500 shadow-md cursor-pointer rounded text-white w-full h-full absolute backface-hidden"
      >
        <img class="rounded" src="../assets/img/sidearm_logo.png" alt="">
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import constants from '../assets/constants'

export default {
  props: {
    indexCard: {
      type: Number,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: '',
    },
    visible: {
      type: Boolean,
      default: false,
    },
    matched: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, context) { 
    const durationFlipCard = constants.TIME_FLIPPING_CARD
    const imageFailed = ref(false)

    const cardSelected = (ele) => {
      context.emit("card-selected", {
        indexCard: props.indexCard,
        cardValue: props.value,
        element: ele
      });
    };

    return {
      cardSelected,
      durationFlipCard,
      imageFailed
    };
  },
};
</script>

