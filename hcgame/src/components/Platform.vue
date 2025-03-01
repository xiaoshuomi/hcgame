<template>
  <div 
    class="platform bg-gray-700"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${width}px`,
      height: `${height}px`
    }"
  ></div>
</template>

<script setup lang="ts">
import { defineOptions } from 'vue';

defineOptions({
  name: 'Platform'
});

defineProps<{
  position: { x: number, y: number };
  width: number;
  height: number;
}>();

export default {};
</script> 