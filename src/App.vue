<template>
  <div class="my-20 flex flex-col justify-center items-center">
    <h1 class="text-3xl font-bold text-center mb-10">
      Memory Game <span>SideArm</span>
    </h1>

       <TransitionGroup
        name="shuffle" tag="div"
        class="game-board grid grid-cols-4 gap-2 justify-center md:grid-cols-6 md:gap-4 lg:grid-cols-8"
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

    <p>{{GameStatus}}</p>
    <p>statusSelection: {{ statusSelection }}</p>
    <p>Matches: {{pairsMatched}}</p>
    <p>Moves: {{moves}}</p>
    <br/>
    <button 
      @click="restarGame"
      class="bg-orange-500 py-4 px-5 text-blue-500 rounded font-bold transition duration-300 hover:bg-orange-400 ">
      Restart Game
    </button>
  </div>
</template>

<script>
import { ref, watch, computed } from "vue";
import Card from "./components/Card.vue";
import cardsOnDeck from './assets/cardsOnDeck.json'
import party from 'party-js'
import constants from './assets/constants'

export default {
  name: "App",
  components: {
    Card,
  },
  setup() {
    const cardList = ref([]);
    const cardsSelected = ref([]);
    const statusSelection = ref("");
    const clicks = ref(0); 

    cardsOnDeck.forEach((card,index) => {
      cardList.value.push({
        value: card,
        visible: false,
        indexCard: index,
        matched: false,
        pair: "a"
      });

      cardList.value.push({
        value: card,
        visible: false,
        indexCard: cardsOnDeck.length + index + 1,
        matched: false,
        pair: "b"
      });      
    })

    const GameStatus = computed(() => {
      return cardList.value.every(item=>item.matched === true) ? 'YOU Win' : `Remaning pairs: ${remainingPairs.value}`
    })

    const remainingPairs = computed(() => {
      return cardList.value.filter(card => card.matched === false).length / 2;
    })

    const moves = computed(() => {
      return Math.floor(clicks.value/2);
    })

    const pairsMatched = computed(() => {
      return cardsOnDeck.length - remainingPairs.value;
    })

    const restarGame = () => {
      cardList.value = cardList.value.map(card => {
        return {
          ...card,
          visible: false
        }
      })

      setTimeout(() => {
        shuffleCards();
        cardList.value = cardList.value.map((card, index) => {
          return {
            ...card,
            matched: false,
            indexCard: index,
            visible: false
          }
        })      
      }, constants.TIME_FLIPPING_CARD);
    }

    const shuffleCards = () => {
      cardList.value = cardList.value.sort(() => Math.random() - 0.5);
    }

    const flip = payload => {
      if (!cardList.value[payload.indexCard].visible){      
        cardList.value[payload.indexCard].visible = true;
        clicks.value++

        if (cardsSelected.value[0]){          
          // Check if clicked on the exactly same card
          if (cardsSelected.value[0].indexCard != payload.indexCard) cardsSelected.value[1] = payload
        } else cardsSelected.value[0] = payload;
      }
    };

    restarGame();

    watch(
      cardsSelected,
      (currentValue) =>{ 
        if (currentValue.length === 2) {
          const firstCard = currentValue[0];
          const secondCard = currentValue[1];          

          if (firstCard.cardValue === secondCard.cardValue) {
            statusSelection.value = "Match!";
            party.sparkles(firstCard.element.target,{shapes: ["star"]});
            party.sparkles(secondCard.element.target,{shapes: ["star"]});
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
      pairsMatched
    };
  },
};
</script>

<style>
 .shuffle-enter-active,
 .shuffle-leave-active,
 .shuffle-move {
  transition: all .6s ease;
 }
</style>