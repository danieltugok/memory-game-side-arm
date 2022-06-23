<template>
  <div class="my-20 max-w-screen-xl flex flex-col justify-center items-center">
    <h1 class="text-3xl font-bold text-center">
      Memory Game <span>SideArm</span>
    </h1>

    <section class="game-board grid grid-cols-4 gap-8 justify-center">
      <Card 
        v-for="(card, index) in cardList"
        :key="`card-${index}`"
        :value="card"
      />
    </section>
  </div>
</template>

<script>
import Card from './components/Card.vue';

export default {
  name: 'App',
  components: {
    Card
  },
  setup(){
    const cardList = [];

    for (let i = 0; i < 16; i++) {
      cardList.push(i);      
    }

    return {
      cardList
    }
  }
}
</script>

<style>

</style>
