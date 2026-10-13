<template>
  <TransitionGroup
    ref="board"
    name="shuffle"
    tag="div"
    class="game-board grid mb-10 justify-center"
    :class="levels[level].boardClass"
  >
    <Card
      v-for="card in cards"
      :key="card.key"
      :value="card.value"
      :name="card.name"
      :sizeClass="levels[level].cardSizeClass"
      :visible="card.visible"
      :indexCard="card.indexCard"
      :matched="card.matched"
      @card-selected="$emit('flip', $event)"
    />
  </TransitionGroup>
</template>

<script>
import { ref, watch } from "vue";
import party from "party-js";
import Card from "./Card.vue";
import constants from "../assets/constants";

// The card grid. Cards come in as { key, value, name, visible, matched, indexCard }.
export default {
  name: "GameBoard",
  components: { Card },
  props: {
    cards: { type: Array, required: true },
    level: { type: String, required: true },
    // Multiplayer matches happen on other screens too, so sparkles are driven by the
    // card state here. Single player fires its own sparkles from the click.
    sparkleOnMatch: { type: Boolean, default: false },
  },
  emits: ["flip"],
  setup(props) {
    const board = ref(null);

    watch(
      () => props.cards.map((c) => c.matched),
      (matched, before = []) => {
        if (!props.sparkleOnMatch || matched.length !== before.length) return;
        const elements = board.value?.$el?.children ?? [];
        matched.forEach((isMatched, i) => {
          if (isMatched && !before[i] && elements[i]) party.sparkles(elements[i], { shapes: ["star"] });
        });
      }
    );

    return { board, levels: constants.LEVELS };
  },
};
</script>
