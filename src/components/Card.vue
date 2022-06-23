<template>
  <div class="border-2 border-orange-500 w-24 h-24">
    {{value}}
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: Number,
      required: true
    }
  }
}
</script>

<style>

</style>