<template>
  <div 
    class="platform"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: `${width}px`,
      height: `${height}px`
    }"
  ></div>
</template>

<script setup lang="ts">
defineProps<{
  position: { x: number, y: number };
  width: number;
  height: number;
}>();
</script> 