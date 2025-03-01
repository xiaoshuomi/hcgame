<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue';

// 检测是否为移动设备
const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
  gameMode: 'classic', // 'classic' 或 'infinite'
  cameraOffset: { x: 0, y: 0 }, // 摄像机偏移量
  distanceTraveled: 0, // 在无限模式中行走的距离
  difficulty: 1, // 难度系数，随着距离增加而增加
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

// 添加调试状态
const debugMode = ref(false);

function toggleDebug() {
  debugMode.value = !debugMode.value;
}

// 生成随机平台
function generateRandomPlatform(startX: number, endX: number) {
  const minWidth = 100;
  const maxWidth = 250;
  const minHeight = 15;
  const maxHeight = 25;
  const minGap = 50; // 平台之间的最小水平间距
  const maxGap = 120; // 平台之间的最大水平间距
  const minY = 300; // 最高高度
  const maxY = 500; // 最低高度

  const width = Math.floor(Math.random() * (maxWidth - minWidth) + minWidth);
  const height = Math.floor(Math.random() * (maxHeight - minHeight) + minHeight);
  const x = startX + Math.floor(Math.random() * (maxGap - minGap) + minGap);
  const y = Math.floor(Math.random() * (maxY - minY) + minY);

  return {
    position: { x, y },
    width,
    height
  };
}

// 生成随机敌人
function generateRandomEnemy(platformX: number, platformWidth: number, platformY: number) {
  const enemyX = platformX + Math.random() * (platformWidth - 30);
  const enemyY = platformY - 35; // 敌人站在平台上方
  const enemyType = Math.random() > 0.7 ? 'advanced' : 'basic';
  const enemySpeed = Math.random() * gameState.difficulty + 0.5;
  const enemyDirection = Math.random() > 0.5 ? 'left' : 'right';

  return {
    position: { x: enemyX, y: enemyY },
    type: enemyType,
    direction: enemyDirection,
    speed: enemySpeed
  };
}

// 生成初始无限模式地图
function generateInfiniteMap() {
  platforms.length = 0; // 清空现有平台
  enemies.length = 0; // 清空现有敌人

  // 添加初始基础平台，保证玩家有立足之地
  platforms.push({
    position: { x: 0, y: 500 },
    width: 300,
    height: 20
  });

  // 预先生成10个平台
  let lastPlatformEnd = 300; // 从初始平台结束位置开始生成
  for (let i = 0; i < 10; i++) {
    const newPlatform = generateRandomPlatform(lastPlatformEnd, lastPlatformEnd + 200);
    platforms.push(newPlatform);
    lastPlatformEnd = newPlatform.position.x + newPlatform.width;

    // 在平台上随机添加敌人 (70%的概率)
    if (Math.random() > 0.3) {
      enemies.push(generateRandomEnemy(
        newPlatform.position.x, 
        newPlatform.width, 
        newPlatform.position.y
      ));
    }
  }
}

// 扩展地图生成
function expandInfiniteMap(playerX: number) {
  // 获取最远的平台右边缘位置
  const farthestPlatformX = Math.max(...platforms.map(p => p.position.x + p.width));
  
  // 如果玩家接近最远的平台右边缘，生成更多平台
  if (playerX > farthestPlatformX - 800) {
    let lastPlatformEnd = farthestPlatformX;
    // 生成5个新平台
    for (let i = 0; i < 5; i++) {
      const newPlatform = generateRandomPlatform(lastPlatformEnd, lastPlatformEnd + 200);
      platforms.push(newPlatform);
      lastPlatformEnd = newPlatform.position.x + newPlatform.width;
      
      // 随机添加敌人 (随着难度增加而增加概率)
      if (Math.random() > (0.4 - gameState.difficulty * 0.05)) {
        enemies.push(generateRandomEnemy(
          newPlatform.position.x, 
          newPlatform.width, 
          newPlatform.position.y
        ));
      }
    }
  }
  
  // 清理远离玩家的平台和敌人，优化性能
  const cleanupDistance = 1200; // 超出此距离的对象将被移除
  const cleanupX = playerX - cleanupDistance;
  
  // 清理平台
  for (let i = platforms.length - 1; i >= 0; i--) {
    if (platforms[i].position.x + platforms[i].width < cleanupX) {
      platforms.splice(i, 1);
    }
  }
  
  // 清理敌人
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].position.x < cleanupX) {
      enemies.splice(i, 1);
    }
  }
}

// 开始游戏
function startGame(mode = 'classic') {
  gameState.isPlaying = true;
  gameState.gameOver = false;
  gameState.score = 0;
  gameState.lives = 3;
  gameState.gameMode = mode;
  gameState.cameraOffset = { x: 0, y: 0 };
  gameState.distanceTraveled = 0;
  gameState.difficulty = 1;
  
  if (mode === 'infinite') {
    generateInfiniteMap();
  } else {
    // 恢复经典模式的平台和敌人
    platforms.length = 0;
    enemies.length = 0;
    platforms.push(
      { position: { x: 0, y: 500 }, width: 800, height: 20 },
      { position: { x: 300, y: 400 }, width: 200, height: 20 },
      { position: { x: 600, y: 300 }, width: 150, height: 20 }
    );
    enemies.push(
      { position: { x: 500, y: 465 }, type: 'basic', direction: 'left', speed: 1 }
    );
  }
  
  resetPlayerPosition();
  
  if (gameLoop) cancelAnimationFrame(gameLoop);
  gameLoop = requestAnimationFrame(update);
}

// 重置游戏
function resetGame() {
  startGame(gameState.gameMode);
}

// 重置玩家位置
function resetPlayerPosition() {
  player.position = { x: 100, y: 300 };
  player.velocity = { x: 0, y: 0 };
  player.direction = 'right';
  player.animationState = 'idle';
}

// 更新摄像机
function updateCamera() {
  if (gameState.gameMode === 'infinite') {
    // 在无限模式中，摄像机跟随玩家
    if (player.position.x > 400) {
      gameState.cameraOffset.x = player.position.x - 400;
    }
  }
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
  
  // 无限模式特定处理
  if (gameState.gameMode === 'infinite') {
    // 更新摄像机位置
    updateCamera();
    
    // 扩展地图
    expandInfiniteMap(player.position.x);
    
    // 更新行走距离
    if (player.velocity.x > 0) {
      gameState.distanceTraveled += player.velocity.x;
    }
    
    // 更新难度
    gameState.difficulty = 1 + Math.floor(gameState.distanceTraveled / 3000) * 0.2;
  }
  
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
      // 在无限模式下，敌人只在其平台上移动
      const enemyPlatform = platforms.find(p => 
        enemy.position.x >= p.position.x - 30 && 
        enemy.position.x <= p.position.x + p.width
      );
      if (enemyPlatform && enemy.position.x < enemyPlatform.position.x) {
        enemy.direction = 'right';
      } else if (!enemyPlatform && gameState.gameMode === 'classic' && enemy.position.x < 0) {
        enemy.direction = 'right';
      }
    } else {
      enemy.position.x += enemy.speed;
      // 在无限模式下，敌人只在其平台上移动
      const enemyPlatform = platforms.find(p => 
        enemy.position.x >= p.position.x - 30 && 
        enemy.position.x <= p.position.x + p.width
      );
      if (enemyPlatform && enemy.position.x + 30 > enemyPlatform.position.x + enemyPlatform.width) {
        enemy.direction = 'left';
      } else if (!enemyPlatform && gameState.gameMode === 'classic' && enemy.position.x > 800) {
        enemy.direction = 'left';
      }
    }
    
    // 检测玩家与敌人碰撞
    if (
      player.position.x < enemy.position.x + 30 &&
      player.position.x + player.width > enemy.position.x &&
      player.position.y < enemy.position.y + 30 &&
      player.position.y + player.height > enemy.position.y
    ) {
      gameState.lives--;
      
      if (gameState.gameMode === 'classic') {
        resetPlayerPosition();
      } else {
        // 无限模式下，只后退一段距离而不是重置
        player.position.x = Math.max(player.position.x - 150, 100);
        player.velocity.y = player.jumpForce / 2; // 小跳一下
      }
      
      if (gameState.lives <= 0) {
        gameState.gameOver = true;
        gameState.isPlaying = false;
      }
    }
  }
  
  // 边界检查
  if (player.position.x < 0) player.position.x = 0;
  
  if (gameState.gameMode === 'classic') {
    // 经典模式有右边界
    if (player.position.x + player.width > 800) player.position.x = 800 - player.width;
  }
  
  // 检查玩家是否掉出屏幕
  if (player.position.y > 600) {
    gameState.lives--;
    
    if (gameState.gameMode === 'classic') {
      resetPlayerPosition();
    } else {
      // 无限模式下，重新放置在最近的平台上
      const nearestPlatform = [...platforms].sort((a, b) => 
        Math.abs(a.position.x - player.position.x) - Math.abs(b.position.x - player.position.x)
      )[0];
      
      if (nearestPlatform) {
        player.position.x = nearestPlatform.position.x + nearestPlatform.width / 2 - player.width / 2;
        player.position.y = nearestPlatform.position.y - player.height;
        player.velocity = { x: 0, y: 0 };
      } else {
        resetPlayerPosition();
      }
    }
    
    if (gameState.lives <= 0) {
      gameState.gameOver = true;
      gameState.isPlaying = false;
    }
  }
  
  // 更新游戏分数
  if (gameState.isPlaying && !gameState.gameOver) {
    if (gameState.gameMode === 'classic') {
      // 经典模式每秒增加1分
      gameState.score += 1/60;
    } else {
      // 无限模式根据行走距离积分
      gameState.score = Math.floor(gameState.distanceTraveled / 50);
    }
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

// 移动设备按钮事件处理
function handleMobileButtonPress(button: 'left' | 'right' | 'jump') {
  if (button === 'left') {
    keys.left = true;
  } else if (button === 'right') {
    keys.right = true;
  } else if (button === 'jump' && player.isOnGround) {
    player.velocity.y = player.jumpForce;
    player.isOnGround = false;
  }
}

function handleMobileButtonRelease(button: 'left' | 'right' | 'jump') {
  if (button === 'left') {
    keys.left = false;
  } else if (button === 'right') {
    keys.right = false;
  }
}

// 组件挂载和卸载时的事件处理
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  console.log('游戏组件已挂载');
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (gameLoop) cancelAnimationFrame(gameLoop);
  console.log('游戏组件已卸载');
});
</script>

<template>
  <div class="game-container w-full h-screen bg-gray-900 overflow-hidden p-0 m-0">
    <div class="game-canvas w-full h-full bg-gray-800" ref="gameCanvas">
      <!-- 游戏内容区域，添加摄像机偏移 -->
      <div 
        class="relative w-full h-full" 
        :style="{ 
          transform: `translateX(-${gameState.cameraOffset.x}px)` 
        }"
      >
        <!-- 火柴人角色 -->
        <div 
          v-if="gameState.isPlaying"
          class="stick-figure absolute" 
          :style="{ 
            left: `${player.position.x}px`, 
            top: `${player.position.y}px`,
            transform: player.direction === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
          }"
        >
          <svg width="30" height="60" viewBox="0 0 30 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 头部 -->
            <circle cx="15" cy="10" r="8" stroke="white" stroke-width="2"/>
            
            <!-- 身体 -->
            <line x1="15" y1="18" x2="15" y2="35" stroke="white" stroke-width="2"/>
            
            <!-- 手臂 - 根据动画状态改变 -->
            <g v-if="player.animationState === 'idle'">
              <line x1="15" y1="24" x2="5" y2="28" stroke="white" stroke-width="2"/>
              <line x1="15" y1="24" x2="25" y2="28" stroke="white" stroke-width="2"/>
            </g>
            
            <g v-if="player.animationState === 'run'">
              <line x1="15" y1="24" x2="5" y2="20" stroke="white" stroke-width="2"/>
              <line x1="15" y1="24" x2="25" y2="20" stroke="white" stroke-width="2"/>
            </g>
            
            <g v-if="player.animationState === 'jump'">
              <line x1="15" y1="24" x2="5" y2="18" stroke="white" stroke-width="2"/>
              <line x1="15" y1="24" x2="25" y2="18" stroke="white" stroke-width="2"/>
            </g>
            
            <!-- 腿部 - 根据动画状态改变 -->
            <g v-if="player.animationState === 'idle'">
              <line x1="15" y1="35" x2="8" y2="50" stroke="white" stroke-width="2"/>
              <line x1="15" y1="35" x2="22" y2="50" stroke="white" stroke-width="2"/>
            </g>
            
            <g v-if="player.animationState === 'run'">
              <line x1="15" y1="35" x2="8" y2="45" stroke="white" stroke-width="2"/>
              <line x1="15" y1="35" x2="25" y2="48" stroke="white" stroke-width="2"/>
            </g>
            
            <g v-if="player.animationState === 'jump'">
              <line x1="15" y1="35" x2="5" y2="40" stroke="white" stroke-width="2"/>
              <line x1="15" y1="35" x2="25" y2="40" stroke="white" stroke-width="2"/>
            </g>
          </svg>
        </div>
        
        <!-- 平台 -->
        <div 
          v-for="(platform, index) in platforms" 
          :key="'p' + index" 
          class="platform absolute bg-gray-700"
          :style="{
            left: `${platform.position.x}px`,
            top: `${platform.position.y}px`,
            width: `${platform.width}px`,
            height: `${platform.height}px`
          }"
        ></div>
        
        <!-- 敌人 -->
        <div 
          v-for="(enemy, index) in enemies" 
          :key="'e' + index" 
          class="enemy absolute"
          :style="{
            left: `${enemy.position.x}px`,
            top: `${enemy.position.y}px`
          }"
        >
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 基础敌人 -->
            <g v-if="enemy.type === 'basic'">
              <circle cx="15" cy="15" r="12" stroke="red" stroke-width="2"/>
              <circle cx="10" cy="10" r="2" fill="red"/>
              <circle cx="20" cy="10" r="2" fill="red"/>
              <path d="M10 20C10 20 15 16 20 20" stroke="red" stroke-width="2"/>
            </g>
            
            <!-- 高级敌人 -->
            <g v-if="enemy.type === 'advanced'">
              <circle cx="15" cy="15" r="12" stroke="#ff6600" stroke-width="2"/>
              <circle cx="10" cy="10" r="2" fill="#ff6600"/>
              <circle cx="20" cy="10" r="2" fill="#ff6600"/>
              <path d="M7 22C7 22 15 14 23 22" stroke="#ff6600" stroke-width="2"/>
            </g>
          </svg>
        </div>
      </div>
      
      <!-- 游戏开始界面 -->
      <div v-if="!gameState.isPlaying" class="absolute inset-0 flex flex-col items-center justify-center">
        <h1 class="text-4xl font-bold mb-8 text-white">火柴人冒险</h1>
        <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <button @click="startGame('classic')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
            经典模式
          </button>
          <button @click="startGame('infinite')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors">
            无限模式
          </button>
        </div>
      </div>
      
      <!-- 游戏UI，不受摄像机影响 -->
      <div v-if="gameState.isPlaying" class="fixed top-4 left-4 p-2 bg-gray-800/80 rounded-lg text-white">
        <div>得分: {{ Math.floor(gameState.score) }}</div>
        <div>生命: {{ gameState.lives }}</div>
        <div v-if="gameState.gameMode === 'infinite'">模式: 无限</div>
        <div v-else>模式: 经典</div>
        <div v-if="gameState.gameMode === 'infinite'">行进: {{ Math.floor(gameState.distanceTraveled / 100) }}m</div>
      </div>
      
      <!-- 游戏结束界面 -->
      <div v-if="gameState.gameOver" class="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
        <h2 class="text-3xl font-bold mb-4 text-white">游戏结束</h2>
        <p class="text-xl mb-2 text-white">最终得分: {{ Math.floor(gameState.score) }}</p>
        <p v-if="gameState.gameMode === 'infinite'" class="text-lg mb-6 text-white">
          行进距离: {{ Math.floor(gameState.distanceTraveled / 100) }}m
        </p>
        <div class="flex space-x-4">
          <button @click="resetGame()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
            重新开始
          </button>
          <button @click="startGame('classic')" v-if="gameState.gameMode === 'infinite'" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors">
            切换经典模式
          </button>
          <button @click="startGame('infinite')" v-if="gameState.gameMode === 'classic'" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors">
            切换无限模式
          </button>
        </div>
      </div>
      
      <!-- 移动设备虚拟控制器 -->
      <div v-if="gameState.isPlaying && isMobile" class="fixed bottom-4 inset-x-0 flex justify-between px-4">
        <div class="flex space-x-2">
          <button 
            @touchstart="handleMobileButtonPress('left')"
            @touchend="handleMobileButtonRelease('left')"
            class="w-16 h-16 bg-blue-600/70 rounded-full flex items-center justify-center text-white text-2xl"
          >
            &larr;
          </button>
          <button 
            @touchstart="handleMobileButtonPress('right')"
            @touchend="handleMobileButtonRelease('right')"
            class="w-16 h-16 bg-blue-600/70 rounded-full flex items-center justify-center text-white text-2xl"
          >
            &rarr;
          </button>
        </div>
        <button 
          @touchstart="handleMobileButtonPress('jump')"
          @touchend="handleMobileButtonRelease('jump')"
          class="w-16 h-16 bg-blue-600/70 rounded-full flex items-center justify-center text-white text-2xl"
        >
          &uarr;
        </button>
      </div>
      
      <!-- 调试按钮 -->
      <div class="fixed top-4 right-4">
        <button 
          @click="toggleDebug" 
          class="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 text-sm rounded"
        >
          调试
        </button>
      </div>
      
      <!-- 调试信息 -->
      <div v-if="debugMode" class="fixed bottom-4 right-4 p-2 bg-black/80 text-white text-xs rounded">
        <div>玩家位置: x={{ Math.floor(player.position.x) }}, y={{ Math.floor(player.position.y) }}</div>
        <div>玩家速度: vx={{ player.velocity.x.toFixed(2) }}, vy={{ player.velocity.y.toFixed(2) }}</div>
        <div>地面状态: {{ player.isOnGround ? '在地面' : '在空中' }}</div>
        <div>动画状态: {{ player.animationState }}</div>
        <div>摄像机偏移: {{ Math.floor(gameState.cameraOffset.x) }}</div>
        <div>平台数量: {{ platforms.length }}</div>
        <div>敌人数量: {{ enemies.length }}</div>
        <div>难度系数: {{ gameState.difficulty.toFixed(2) }}</div>
        <div v-if="gameState.gameMode === 'infinite'">距离: {{ Math.floor(gameState.distanceTraveled) }}</div>
      </div>
    </div>
  </div>
</template>
