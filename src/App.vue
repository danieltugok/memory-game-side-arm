<template>
  <div class="my-7 flex flex-col justify-center items-center relative md:my-20">
    <!-- w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 -->
    <div class="flex flex-col justify-between w-9/12 items-center mb-10 max-w-6xl md:flex-row ">
      <div>
        <h1 class="title text-5xl mb-10 mr-12 text-orange-500 text-center font-bold md:text-left md:mb-0 md:text-5xl ">
          SideArm <span>Match</span>
        </h1>
      </div>      

      <div v-if="level" class="text-orange-500 flex flex-col text-center gap-4">
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

    <div
      v-if="!level"
      class="level-menu w-full max-w-md px-4 flex flex-col items-center gap-6 text-orange-500 roboto-mono"
    >
      <h2 class="text-xl font-bold">Choose your level</h2>
      <div class="w-full flex flex-col gap-4">
        <button
          v-for="(option, key) in levels"
          :key="key"
          @click="startLevel(key)"
          class="w-full flex justify-between items-center bg-white bg-opacity-10 border border-orange-500 rounded-2xl py-4 px-6 transition duration-300 hover:bg-orange-400 hover:text-blue-500"
        >
          <span class="text-2xl font-bold">{{ option.label }}</span>
          <span class="text-sm">{{ option.pairs * 2 }} cards</span>
        </button>
      </div>
    </div>

    <TransitionGroup
      v-else
      name="shuffle"
      tag="div"
      class="game-board grid mb-10 justify-center"
      :class="levels[level].boardClass"
    >
      <Card
        v-for="card in cardList"
        :key="`${card.value}-${card.pair}`"
        :value="card.value"
        :name="card.name"
        :sizeClass="levels[level].cardSizeClass"
        :visible="card.visible"
        :indexCard="card.indexCard"
        :matched="card.matched"
        @card-selected="flip"
      />
    </TransitionGroup>


    <!-- <p>statusSelection: {{ statusSelection }}</p> -->
    
    <br />
    <div v-if="level" class="flex gap-4 mb-10">
      <button
        @click="restarGame"
        class="font-bold roboto-mono bg-transparent border border-orange-500 py-4 px-5 text-orange-500 rounded transition duration-300 hover:bg-orange-400 hover:text-blue-500"
      >
        Restart Game
      </button>
      <button
        @click="changeLevel"
        class="font-bold roboto-mono bg-transparent border border-orange-500 py-4 px-5 text-orange-500 rounded transition duration-300 hover:bg-orange-400 hover:text-blue-500"
      >
        Change Level
      </button>
    </div>
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
    const level = ref(null);
    const levels = constants.LEVELS;

    // Shuffle the full deck and pick as many logos as the level has pairs
    const chosenCards = () => {
      cardList.value = [];
      cardsOnDeck.value = [...cardsOnDeckFull]
        .sort(() => Math.random() - 0.5)
        .slice(0, levels[level.value].pairs);

      cardsOnDeck.value.forEach((card, index) => {
        cardList.value.push({
          value: card.logo,
          name: card.name,
          visible: true,
          indexCard: index,
          matched: false,
          pair: "a",
        });

        cardList.value.push({
          value: card.logo,
          name: card.name,
          visible: true,
          indexCard: cardsOnDeck.value.length + index + 1,
          matched: false,
          pair: "b",
        });
      });
    }


    const GameStatus = computed(() => {
      if (cardList.value.length && cardList.value.every((item) => item.matched === true)) {
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

    let startGameTimeout = null;

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

      // Cancel a pending shuffle from a previous restart so it can't hide the new deck early
      clearTimeout(startGameTimeout);
      startGameTimeout = setTimeout(() => {
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

    const startLevel = (key) => {
      level.value = key;
      restarGame();
    };

    const changeLevel = () => {
      clearTimeout(startGameTimeout);
      clicks.value = 0;
      cardsSelected.value = [];
      cardList.value = [];
      cardsOnDeck.value = [];
      startStatus.value = constants.TIMER_RESET;
      level.value = null;
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
            const deck = cardList.value;
            setTimeout(() => {
              // Skip if the player restarted or changed level in the meantime
              if (cardList.value !== deck) return;
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
      level,
      levels,
      startLevel,
      changeLevel
    };
  },
};
</script>

<style>
/* Only animate the shuffle. Vue also puts the move class on leaving cards, so
   any transition on them keeps the old deck in the grid next to the new one
   on restart. Leaving cards get no transition and are hidden right away. */
.shuffle-move:not(.shuffle-leave-active) {
  transition: transform 0.6s ease;
}

.shuffle-leave-active {
  display: none;
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
