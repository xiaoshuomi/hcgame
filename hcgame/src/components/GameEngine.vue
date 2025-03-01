<template>
  <div class="game-canvas" ref="gameCanvas">
    <StickFigure
      v-if="gameState.isPlaying"
      :position="player.position"
      :animationState="player.animationState"
      :direction="player.direction"
    />
    
    <Platform 
      v-for="(platform, index) in platforms" 
      :key="index" 
      :position="platform.position" 
      :width="platform.width" 
      :height="platform.height" 
    />
    
    <Enemy 
      v-for="(enemy, index) in enemies" 
      :key="index" 
      :position="enemy.position" 
      :type="enemy.type" 
    />
    
    <div v-if="!gameState.isPlaying" class="absolute inset-0 flex flex-col items-center justify-center">
      <h1 class="text-4xl font-bold mb-8">火柴人冒险</h1>
      <button @click="startGame" class="game-button">开始游戏</button>
    </div>
    
    <div v-if="gameState.isPlaying" class="game-ui">
      <div>得分: {{ gameState.score }}</div>
      <div>生命: {{ gameState.lives }}</div>
    </div>
    
    <div v-if="gameState.gameOver" class="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
      <h2 class="text-3xl font-bold mb-4">游戏结束</h2>
      <p class="text-xl mb-6">最终得分: {{ gameState.score }}</p>
      <button @click="resetGame" class="game-button">重新开始</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { defineOptions } from 'vue';
import StickFigure from './StickFigure.vue';
import Platform from './Platform.vue';
import Enemy from './Enemy.vue';

defineOptions({
  name: 'GameEngine'
});

// 游戏画布引用
const gameCanvas = ref<HTMLDivElement | null>(null);

// 游戏状态
const gameState = reactive({
  isPlaying: false,
  gameOver: false,
  score: 0,
  lives: 3,
  gravity: 0.5,
  timeStep: 1000 / 60, // 约60fps
});

// 玩家状态
const player = reactive({
  position: { x: 100, y: 300 },
  velocity: { x: 0, y: 0 },
  direction: 'right', // 'left' 或 'right'
  animationState: 'idle', // 'idle', 'run', 'jump'
  width: 30,
  height: 60,
  speed: 5,
  jumpForce: -13,
  isOnGround: false,
});

// 平台
const platforms = reactive([
  { position: { x: 0, y: 500 }, width: 800, height: 20 },
  { position: { x: 300, y: 400 }, width: 200, height: 20 },
  { position: { x: 600, y: 300 }, width: 150, height: 20 },
]);

// 敌人
const enemies = reactive([
  { position: { x: 500, y: 465 }, type: 'basic', direction: 'left', speed: 1 },
]);

// 按键状态
const keys = reactive({
  left: false,
  right: false,
  up: false,
});

// 游戏循环
let gameLoop: number | null = null;

// 开始游戏
function startGame() {
  gameState.isPlaying = true;
  gameState.gameOver = false;
  gameState.score = 0;
  gameState.lives = 3;
  
  resetPlayerPosition();
  
  if (gameLoop) cancelAnimationFrame(gameLoop);
  gameLoop = requestAnimationFrame(update);
}

// 重置游戏
function resetGame() {
  startGame();
}

// 重置玩家位置
function resetPlayerPosition() {
  player.position = { x: 100, y: 300 };
  player.velocity = { x: 0, y: 0 };
  player.direction = 'right';
  player.animationState = 'idle';
}

// 游戏更新函数
function update() {
  if (!gameState.isPlaying) return;
  
  // 处理玩家移动
  if (keys.left) {
    player.velocity.x = -player.speed;
    player.direction = 'left';
    player.animationState = player.isOnGround ? 'run' : 'jump';
  } else if (keys.right) {
    player.velocity.x = player.speed;
    player.direction = 'right';
    player.animationState = player.isOnGround ? 'run' : 'jump';
  } else {
    player.velocity.x = 0;
    player.animationState = player.isOnGround ? 'idle' : 'jump';
  }
  
  // 应用重力
  player.velocity.y += gameState.gravity;
  
  // 更新玩家位置
  player.position.x += player.velocity.x;
  player.position.y += player.velocity.y;
  
  // 检测玩家与平台碰撞
  player.isOnGround = false;
  for (const platform of platforms) {
    if (
      player.position.y + player.height >= platform.position.y &&
      player.position.y + player.height <= platform.position.y + 10 &&
      player.position.x + player.width > platform.position.x &&
      player.position.x < platform.position.x + platform.width
    ) {
      player.isOnGround = true;
      player.velocity.y = 0;
      player.position.y = platform.position.y - player.height;
    }
  }
  
  // 更新敌人
  for (const enemy of enemies) {
    // 简单的敌人移动逻辑
    if (enemy.direction === 'left') {
      enemy.position.x -= enemy.speed;
      if (enemy.position.x < 0) enemy.direction = 'right';
    } else {
      enemy.position.x += enemy.speed;
      if (enemy.position.x > 800) enemy.direction = 'left';
    }
    
    // 检测玩家与敌人碰撞
    if (
      player.position.x < enemy.position.x + 30 &&
      player.position.x + player.width > enemy.position.x &&
      player.position.y < enemy.position.y + 30 &&
      player.position.y + player.height > enemy.position.y
    ) {
      gameState.lives--;
      resetPlayerPosition();
      
      if (gameState.lives <= 0) {
        gameState.gameOver = true;
        gameState.isPlaying = false;
      }
    }
  }
  
  // 边界检查
  if (player.position.x < 0) player.position.x = 0;
  if (player.position.x + player.width > 800) player.position.x = 800 - player.width;
  
  // 检查玩家是否掉出屏幕
  if (player.position.y > 600) {
    gameState.lives--;
    resetPlayerPosition();
    
    if (gameState.lives <= 0) {
      gameState.gameOver = true;
      gameState.isPlaying = false;
    }
  }
  
  // 更新游戏分数 (每秒增加1分)
  if (gameState.isPlaying && !gameState.gameOver) {
    gameState.score += 1/60;
  }
  
  // 持续游戏循环
  if (gameState.isPlaying) {
    gameLoop = requestAnimationFrame(update);
  }
}

// 键盘事件监听
function handleKeyDown(e: KeyboardEvent) {
  switch(e.key) {
    case 'ArrowLeft':
    case 'a':
      keys.left = true;
      break;
    case 'ArrowRight':
    case 'd':
      keys.right = true;
      break;
    case 'ArrowUp':
    case 'w':
    case ' ':
      if (player.isOnGround) {
        player.velocity.y = player.jumpForce;
        player.isOnGround = false;
      }
      break;
  }
}

function handleKeyUp(e: KeyboardEvent) {
  switch(e.key) {
    case 'ArrowLeft':
    case 'a':
      keys.left = false;
      break;
    case 'ArrowRight':
    case 'd':
      keys.right = false;
      break;
  }
}

// 组件挂载和卸载时的事件处理
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (gameLoop) cancelAnimationFrame(gameLoop);
});

export default {};
</script> 