<template>
  <div class="my-20 flex flex-col justify-center items-center">
    <h1 class="title text-7xl text-orange-500 font-bold text-center mb-10">
      SideArm <span>Match</span>
    </h1>

    <div 
      v-if="GameStatus"
      class="w-96 absolute z-50"
      >

      <img
        class="img-circle"
        src="https://i0.wp.com/www.pyroshows.com/wp-content/uploads/Trophy-Icon-Blue.png?ssl=1"
        alt="Trophy"
      />

      <div class="ribbon text-center absolute bottom-32 left-24">{{ GameStatus }}</div>
    </div>

    <TransitionGroup
      name="shuffle"
      tag="div"
      class="game-board grid grid-cols-4 gap-2 mb-10 justify-center md:grid-cols-6 md:gap-4 lg:grid-cols-8"
    >
      <Card
        v-for="card in cardList"
        :key="`${card.value}-${card.pair}`"
        :value="card.value"
        :visible="card.visible"
        :indexCard="card.indexCard"
        :matched="card.matched"
        @card-selected="flip"
      />
    </TransitionGroup>
    <!-- <p>statusSelection: {{ statusSelection }}</p> -->
    <div class="text-orange-500 flex flex-col text-center gap-4">
      <div class="flex gap-4">
        <div
          class="bg-opacity-10 bg-white rounded-2xl p-3 relative text-7xl flex flex-col justify-center align-center content-center"
        >
          <div>
            <span class="text-center">{{ pairsMatched }}</span>
            <span class="text-sm right-2">/ {{ remainingPairs }}</span>
          </div>
          <span class="text-lg text-center">Matches</span>
        </div>
        <div
          class="bg-opacity-10 bg-white rounded-2xl p-3 relative text-7xl flex flex-col justify-center align-center content-center"
        >
          <span class="text-center">{{ moves }}</span>
          <span class="text-lg text-center">Moves</span>
        </div>
      </div>

      <div
        class="flex justify-around items-center bg-opacity-10 bg-white rounded-2xl p-3"
      >
        <div>Timer</div>
        <Timer :startStatus="startStatus" />
      </div>
    </div>
    <br />
    <button
      @click="restarGame"
      class="bg-transparent border border-orange-500 py-4 px-5 text-orange-500 rounded font-bold transition duration-300 hover:bg-orange-400 hover:text-blue-500"
    >
      Restart Game
    </button>
  </div>
</template>

<script>
import { ref, watch, computed } from "vue";
import Card from "./components/Card.vue";
import Timer from "./components/Timer.vue";
import cardsOnDeck from "./assets/cardsOnDeck.json";
import party from "party-js";
import constants from "./assets/constants";

export default {
  name: "App",
  components: {
    Card,
    Timer,
  },
  setup() {
    const cardList = ref([]);
    const cardsSelected = ref([]);
    const statusSelection = ref("");
    const clicks = ref(0);
    const startStatus = ref(null);
    const firstPlay = ref(true);

    cardsOnDeck.forEach((card, index) => {
      cardList.value.push({
        value: card,
        visible: true,
        indexCard: index,
        matched: false,
        pair: "a",
      });

      cardList.value.push({
        value: card,
        visible: false,
        indexCard: cardsOnDeck.length + index + 1,
        matched: false,
        pair: "b",
      });
    });

    const GameStatus = computed(() => {
      if (cardList.value.every((item) => item.matched === true)) {
        startStatus.value = constants.TIMER_STOP;
        return "YOU Win!";
      }
      return;
    });

    const remainingPairs = computed(() => {
      return cardList.value.filter((card) => card.matched === false).length / 2;
    });

    const moves = computed(() => {
      return Math.floor(clicks.value / 2);
    });

    const pairsMatched = computed(() => {
      return cardsOnDeck.length - remainingPairs.value;
    });

    const restarGame = () => {
      clicks.value = 0;
      startStatus.value = constants.TIMER_RESET;

      if (firstPlay.value === false) {
        shuffleCards();
        cardList.value = cardList.value.map((card, index) => {
          return {
            ...card,
            matched: false,
            indexCard: index,
            visible: false,
          };
        });
      } else {
        cardList.value = cardList.value.map((card, index) => {
          return {
            ...card,
            matched: false,
            indexCard: index,
          };
        });
        firstPlay.value = false;

        setTimeout(() => {
          restarGame();
        }, 3000);
      }
    };

    const shuffleCards = () => {
      cardList.value = cardList.value.sort(() => Math.random() - 0.5);
    };

    const flip = (payload) => {
      // const hasCardsOpenedThatNotMatch = cardList.value.some(item=>{
      //   return item.matched === false && item.visible === true
      // })

      if (!cardList.value[payload.indexCard].visible) {
        startStatus.value = constants.TIMER_START;
        cardList.value[payload.indexCard].visible = true;
        clicks.value++;

        if (cardsSelected.value[0]) {
          // Check if clicked on the exactly same card
          if (cardsSelected.value[0].indexCard != payload.indexCard)
            cardsSelected.value[1] = payload;
        } else cardsSelected.value[0] = payload;
      }
    };

    restarGame();

    watch(
      cardsSelected,
      (currentValue) => {
        if (currentValue.length === 2) {
          const firstCard = currentValue[0];
          const secondCard = currentValue[1];

          if (firstCard.cardValue === secondCard.cardValue) {
            statusSelection.value = "Match!";
            // party.confetti(firstCard.element.target);
            // party.confetti(secondCard.element.target);
            party.sparkles(firstCard.element.target, { shapes: ["star"] });
            party.sparkles(secondCard.element.target, { shapes: ["star"] });
            cardList.value[firstCard.indexCard].matched = true;
            cardList.value[secondCard.indexCard].matched = true;
          } else {
            statusSelection.value = "Opps! Not yet...";
            setTimeout(() => {
              cardList.value[firstCard.indexCard].visible = false;
              cardList.value[secondCard.indexCard].visible = false;
            }, constants.TIME_SHOWING_CARD);
          }

          cardsSelected.value.length = 0;
        }
      },
      { deep: true }
    );

    return {
      cardList,
      flip,
      cardsSelected,
      statusSelection,
      remainingPairs,
      GameStatus,
      shuffleCards,
      restarGame,
      moves,
      clicks,
      pairsMatched,
      startStatus,
      firstPlay,
    };
  },
};
</script>

<style>
.shuffle-enter-active,
.shuffle-leave-active,
.shuffle-move {
  transition: all 0.6s ease;
}

.title {
  font-family: "Kaushan Script", cursive;
}

.ribbon {
  background: #4b9ae5;
  display: inline-block;
  color: #f4f4f4;
  padding: 0.5em 0.7em;
  font-weight: 900;
  letter-spacing: 0.2em;
  position: relative;
  font-size: 1.5em;
  text-transform: uppercase;
  transform-style: preserve-3d;
  transform: rotate(-20deg) skew(-20deg, 10deg);
}

</style>
