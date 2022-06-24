<template>
  <div class="my-20 max-w-screen-xl flex flex-col justify-center items-center">
    <h1 class="text-3xl font-bold text-center mb-10">
      Memory Game <span>SideArm</span>
    </h1>

    <section class="game-board grid grid-cols-4 gap-8 justify-center sm:grid-cols-4 lg:grid-cols-6">
      <Card
        v-for="(card, index) in cardList"
        :key="index"
        :value="card.value"
        :visible="card.visible"
        :indexCard="card.indexCard"
        :matched="card.matched"
        @card-selected="flip"
      />
    </section>
    <!-- <h2>++++{{ cardsSelected }}</h2> -->
    <p>>>>>{{ statusSelection }}</p>
    <!-- <p>ooooo{{remainingPairs}}</p> -->
    <p>Matches: {{pairsMatched}}</p>
    <p>Game Status: {{GameStatus}}</p>
    <p>Clicks: {{clicks}}</p>
    <p>Tries/Moves: {{tries}}</p>
    <br/>
    <button @click="restarGame">Restar game</button>
  </div>
</template>

<script>
import { ref, watch, computed } from "vue";
import Card from "./components/Card.vue";
// import deck from './assets/cardsOnDeck.json'

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
    
    // const cardsOnDeck = ref(deck)

    const cardsOnDeck = [
      {name: 'american_a/tulsa_logo.png' },
      {name: 'swac/a5.png' },
      {name: 'america_ea/Binghamton_Bearcats.png' },
      {name: 'mountain_w/PrmLogo%20-%20light%20BG%20RGB.png' },
      {name: 'big_south/Charleston_Southern.png' },
      {name: 'southland/v6.png' },
      {name: 'conferences/Conf-USA.png' },
      {name: 'meac/delawarestate_200x200.png' },
      {name: 'missouri_v/Drake.png' },
      {name: 'sun_belt/Georgia-Southern.png' },
      {name: 'big_sky/Idaho-State.png' },
      {name: 'northeast/LIU-Sharks.png' },
    ];

    cardsOnDeck.forEach(card => {
      cardList.value.push({
        value: card.name,
        visible: false,
        indexCard: null,
        matched: false
      });

      cardList.value.push({
        value: card.name,
        visible: false,
        indexCard: null,
        matched: false
      });      
    })
    
    cardList.value = cardList.value.map((card,index) => {
      return {
        ...card,
        indexCard: index
      }
    });

    const GameStatus = computed(() => {
      return remainingPairs.value === 0 ? 'Player Wins' : `Remaning pairs: ${remainingPairs.value}`
    })

    const remainingPairs = computed(() => {
      return cardList.value.filter(card => card.matched === false).length / 2;
    })

    const tries = computed(() => {
      return Math.floor(clicks.value/2);
    })

    const pairsMatched = computed(() => {
      return cardsOnDeck.length - remainingPairs.value;
    })

    const restarGame = () => {
      console.log('restart the game');
      shuffleCards();
      cardList.value = cardList.value.map((card, index) => {
        return {
          ...card,
          matched: false,
          indexCard: index,
          visible: false
        }
     })
    }

    const shuffleCards = () => {
      cardList.value = cardList.value.sort(() => Math.random() - 0.5);
    }

    const flip = payload => {
      if (!cardList.value[payload.indexCard].visible){      
        cardList.value[payload.indexCard].visible = true;
        clicks.value++


        if (cardsSelected.value[0]){
          
          // Checking if clicked on the exactly same card
          if (cardsSelected.value[0].indexCard != payload.indexCard) {
            cardsSelected.value[1] = payload
          }
        } else {
          cardsSelected.value[0] = payload;
        }
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
            cardList.value[firstCard.indexCard].matched = true;
            cardList.value[secondCard.indexCard].matched = true;
          } else {
            statusSelection.value = "Opps! Not yet...";
            setTimeout(() => {
              cardList.value[firstCard.indexCard].visible = false;
              cardList.value[secondCard.indexCard].visible = false;              
            }, 1500);
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
      tries,
      clicks,
      pairsMatched
    };
  },
};
</script>

<style></style>
