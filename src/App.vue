<template>
  <div class="my-7 flex flex-col justify-center items-center relative md:my-20">
    <!-- w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 -->
    <div class="flex flex-col justify-between w-9/12 items-center mb-10 max-w-6xl md:flex-row ">
      <div>
        <h1 class="title text-5xl mb-10 mr-12 text-orange-500 text-center font-bold md:text-left md:mb-0 md:text-5xl ">
          SideArm <span>Match</span>
        </h1>
      </div>      

      <div class="text-orange-500 flex flex-col text-center gap-4">
        <div class="flex gap-4">
          <div
            class="bg-opacity-10 bg-white rounded-2xl py-3 px-4 relative text-4xl flex flex-col justify-center align-center content-center"
          >
            <div>
              <span class="text-center roboto-mono">{{ pairsMatched }}</span>
              <span class="text-sm right-2 roboto-mono">/{{ remainingPairs }}</span>
            </div>
            <span class="text-xs text-center font-bold roboto-mono">Matches</span>
          </div>
          <div
            class="bg-opacity-10 bg-white rounded-2xl py-3 px-4 relative text-4xl flex flex-col justify-center align-center content-center"
          >
          <span class="text-center roboto-mono">{{ moves }}</span>
          <span class="text-xs text-center font-bold roboto-mono">Moves</span>
          </div>

        <div
          class="flex flex-col justify-around items-center bg-opacity-10 bg-white rounded-2xl py-3 px-4"
        >
          <Timer :startStatus="startStatus" />
          <div class="font-bold text-xs roboto-mono">Timer</div>
        </div>

        </div>
      </div>
    </div>

    <div 
      v-if="GameStatus"
      class="w-[32rem] absolute z-50 top-[9%]"
    >
      <lottie-player 
        src="./trophy.json"
        background="transparent" 
        speed="1" 
        style="width: 512px; height: 512px;"
        autoplay
      />

      <div class="ribbon text-center absolute bottom-20 left-40">{{ GameStatus }}</div>
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
    
    <br />
    <button
      @click="restarGame"
      class="mb-10 md:mb-10 font-bold roboto-mono bg-transparent border border-orange-500 py-4 px-5 text-orange-500 rounded transition duration-300 hover:bg-orange-400 hover:text-blue-500"
    >
      Restart Game
    </button>
  </div>
</template>

<script>
import { ref, watch, computed } from "vue";
import Card from "./components/Card.vue";
import Timer from "./components/Timer.vue";
import cardsOnDeckFull from "./assets/cardsOnDeck.json";
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
    const cardsOnDeck = ref([]);

    // Shuffle the initial cards and selecting only 12 cards to start the game
    const chosenCards = () => {
      cardList.value = [];
      cardsOnDeck.value = cardsOnDeckFull.sort(() => Math.random() - 0.5).slice(0, 12);

      cardsOnDeck.value.forEach((card, index) => {
        cardList.value.push({
          value: card,
          visible: true,
          indexCard: index,
          matched: false,
          pair: "a",
        });

        cardList.value.push({
          value: card,
          visible: true,
          indexCard: cardsOnDeck.value.length + index + 1,
          matched: false,
          pair: "b",
        });
      });
    }


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
      return cardsOnDeck.value.length - remainingPairs.value;
    });

    const restarGame = () => {      
      clicks.value = 0;
      cardsSelected.value = [];
      startStatus.value = constants.TIMER_RESET;

      chosenCards();
      console.log("cardsOnDeck.value", cardsOnDeck.value);       

      cardList.value = cardList.value.map((card, index) => {
        return {
          ...card,
          visible: true,
        };
      });      

      setTimeout(() => {
        shuffleCards();
        cardList.value = cardList.value.map((card, index) => {
          return {
            ...card,
            matched: false,
            indexCard: index,
            visible: false,
          };
        });
      }, 3000);
    };

    const shuffleCards = () => {
      cardList.value = cardList.value.sort(() => Math.random() - 0.5);
    };

    const flip = (payload) => {
      // Checking if has 2 cards opened to lock the possibility to open others
      const hasCardsOpenedThatNotMatch = cardList.value.filter(item=>{
        return item.matched === false && item.visible === true
      })
      
      if (hasCardsOpenedThatNotMatch.length <= 1 && !cardList.value[payload.indexCard].visible) {
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
      startStatus
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
