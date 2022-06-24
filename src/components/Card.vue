<template>
  <div
    @click="cardSelected"
    class="flip-card w-40 h-40 relative text-center group perspective-1000"
  >
    <div 
      class="flip-card-inner shadow-md preserve-3d w-full h-full transition-transform duration-700" 
      :class="visible?'rotate-y-180':''"
    >
      <div
        class="flip-card-front border-4 border-gray-400 rounded p-2 bg-blue-200 text-black w-full h-full absolute rotate-y-180 backface-hidden"
        :class="matched?'opacity-40 border-green-500':''"
      >
        <!-- {{ value }} - {{ matched }} - {{indexCard}} - {{visible}} -->
        <img :src="`https://clients.sidearmsports.com/sidearm_files/logos/${value}`" alt="">
      </div>
      <div
        class="flip-card-back cursor-pointer rounded bg-green-600 text-white w-full h-full absolute backface-hidden"
      >
        <img class="rounded" src="https://previews.123rf.com/images/shottythefirst/shottythefirst1403/shottythefirst140300042/26763558-abstract-blue-playing-card-back-pattern-texture.jpg" alt="">
      </div>
    </div>
  </div>
</template>

<script>

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

    const cardSelected = () => {
        context.emit("card-selected", {
          indexCard: props.indexCard,
          cardValue: props.value,
        });
    };

    return {
      cardSelected
    };
  },
};
</script>

<style></style>
