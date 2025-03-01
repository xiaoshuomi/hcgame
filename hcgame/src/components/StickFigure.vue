<template>
  <div 
    class="stick-figure" 
    :style="{ 
      left: `${position.x}px`, 
      top: `${position.y}px`,
      transform: direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
    }"
  >
    <svg width="30" height="60" viewBox="0 0 30 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- 头部 -->
      <circle cx="15" cy="10" r="8" stroke="white" stroke-width="2"/>
      
      <!-- 身体 -->
      <line x1="15" y1="18" x2="15" y2="35" stroke="white" stroke-width="2"/>
      
      <!-- 手臂 - 根据动画状态改变 -->
      <g v-if="animationState === 'idle'">
        <line x1="15" y1="24" x2="5" y2="28" stroke="white" stroke-width="2"/>
        <line x1="15" y1="24" x2="25" y2="28" stroke="white" stroke-width="2"/>
      </g>
      
      <g v-if="animationState === 'run'">
        <line x1="15" y1="24" x2="5" y2="20" stroke="white" stroke-width="2"/>
        <line x1="15" y1="24" x2="25" y2="20" stroke="white" stroke-width="2"/>
      </g>
      
      <g v-if="animationState === 'jump'">
        <line x1="15" y1="24" x2="5" y2="18" stroke="white" stroke-width="2"/>
        <line x1="15" y1="24" x2="25" y2="18" stroke="white" stroke-width="2"/>
      </g>
      
      <!-- 腿部 - 根据动画状态改变 -->
      <g v-if="animationState === 'idle'">
        <line x1="15" y1="35" x2="8" y2="50" stroke="white" stroke-width="2"/>
        <line x1="15" y1="35" x2="22" y2="50" stroke="white" stroke-width="2"/>
      </g>
      
      <g v-if="animationState === 'run'">
        <line x1="15" y1="35" x2="8" y2="45" stroke="white" stroke-width="2"/>
        <line x1="15" y1="35" x2="25" y2="48" stroke="white" stroke-width="2"/>
      </g>
      
      <g v-if="animationState === 'jump'">
        <line x1="15" y1="35" x2="5" y2="40" stroke="white" stroke-width="2"/>
        <line x1="15" y1="35" x2="25" y2="40" stroke="white" stroke-width="2"/>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  position: { x: number, y: number };
  animationState: 'idle' | 'run' | 'jump';
  direction: 'left' | 'right';
}>();
</script> 