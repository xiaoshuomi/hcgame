<template>
  <div 
    class="enemy"
    :style="{
      left: `${position.x}px`,
      top: `${position.y}px`
    }"
  >
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 基础敌人 -->
      <g v-if="type === 'basic'">
        <circle cx="15" cy="15" r="12" stroke="red" stroke-width="2"/>
        <circle cx="10" cy="10" r="2" fill="red"/>
        <circle cx="20" cy="10" r="2" fill="red"/>
        <path d="M10 20C10 20 15 16 20 20" stroke="red" stroke-width="2"/>
      </g>
      
      <!-- 可以添加更多敌人类型 -->
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  position: { x: number, y: number };
  type: 'basic' | 'advanced' | 'boss'; // 扩展敌人类型
}>();
</script> 