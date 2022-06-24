<template>
  <div class="my-20 max-w-screen-xl flex flex-col justify-center items-center">
    <h1 class="text-3xl font-bold text-center mb-10">
      Memory Game <span>SideArm</span>
    </h1>

    <section class="game-board grid grid-cols-4 gap-8 justify-center lg:grid-cols-6">
      <Card
        v-for="(card, index) in cardList"
        :key="`card-${index}`"
        :value="card.value"
        :visible="card.visible"
        :indexCard="card.indexCard"
        :matched="card.matched"
        @card-selected="flip"
      />
    </section>
    <h2>{{ cardsSelected }}</h2>
    <p>{{ statusSelection }}</p>
    <p>{{remainingPairs}}</p>
    <p>{{GameStatus}}</p>
    <button @click="shuffleCards">Shuffle cards</button>
    <button @click="restarGame">Restar game</button>
  </div>
</template>

<script>
import { ref, watch, computed } from "vue";
import Card from "./components/Card.vue";

export default {
  name: "App",
  components: {
    Card,
  },
  setup() {
    const cardList = ref([]);
    const cardsSelected = ref([]);
    const statusSelection = ref("");

    const cardsOnDeck = [1,2,3,4,5,6,7,8,9,10,11,12];

    cardsOnDeck.forEach((card,index) => {
      cardList.value.push({
        value: card,
        visible: false,
        indexCard: null,
        matched: false
      });

      cardList.value.push({
        value: card,
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

    // for (let i = 0; i < 24; i++) {
    //   cardList.value.push({
    //     value: i,
    //     visible: true,
    //     indexCard: i,
    //     matched: false
    //   });
    // }

    const GameStatus = computed(() => {
      return remainingPairs.value === 0 ? 'Player Wins' : `Remaning pairs: ${remainingPairs.value}`
    })

    const remainingPairs = computed(() => {
      return cardList.value.filter(card => card.matched === false).length / 2;
    })

    const restarGame = () => {
      shuffleCards();
      cardList.value = cardList.value.map((card, index) => {
        return {
          ...card,
          matched: false,
          indexCard: index,
          visible: true
        }
    })

    }

    const shuffleCards = () => {
      cardList.value = cardList.value.sort(() => Math.random() - 0.5);
    }

    const flip = (payload) => {
      cardList.value[payload.indexCard].visible = true;

      cardsSelected.value[0]
        ? (cardsSelected.value[1] = payload)
        : (cardsSelected.value[0] = payload);
    };

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
            cardList.value[firstCard.indexCard].visible = false;
            cardList.value[secondCard.indexCard].visible = false;
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
      restarGame
    };
  },
};
</script>

<style></style>
