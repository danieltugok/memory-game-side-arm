<template>
  <div
    @click="cardSelected"
    class="flip-card w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 relative text-center group perspective-1000"
  >
    <div 
      class="flip-card-inner preserve-3d w-full h-full transition-transform" 
      :class="[visible?'rotate-y-180':'', `duration-${durationFlipCard}`]"
    >
      <div
        class="flip-card-front shadow-md border-4 border-gray-400 rounded p-2 bg-white text-black w-full h-full absolute rotate-y-180 backface-hidden"
        :class="matched?'opacity-10 border-green-500':''"
      >
        <!-- {{ value }} - {{ matched }} - {{indexCard}} - {{visible}} -->
        <img :src="`https://clients.sidearmsports.com/sidearm_files/logos/${value}`" alt="">
      </div>
      <div
        class="flip-card-back shadow-md cursor-pointer rounded bg-green-600 text-white w-full h-full absolute backface-hidden"
      >
        <img class="rounded" src="https://previews.123rf.com/images/shottythefirst/shottythefirst1403/shottythefirst140300042/26763558-abstract-blue-playing-card-back-pattern-texture.jpg" alt="">
      </div>
    </div>
  </div>
</template>

<script>
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

    const cardSelected = (ele) => {
      context.emit("card-selected", {
        indexCard: props.indexCard,
        cardValue: props.value,
        element: ele
      });
    };

    return {
      cardSelected,
      durationFlipCard
    };
  },
};
</script>

