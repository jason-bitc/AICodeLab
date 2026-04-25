/**
 * 洛克王国世界主题跑酷原型（微信小游戏）
 * 主角：卡瓦重（占位绘制）
 * 障碍物：矿石、木桩、大树
 * 收集物：可口果、魔力果（可累计为后续升级资源）
 */

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const { windowWidth, windowHeight, pixelRatio } = wx.getSystemInfoSync();
canvas.width = windowWidth * pixelRatio;
canvas.height = windowHeight * pixelRatio;
ctx.scale(pixelRatio, pixelRatio);

const GROUND_HEIGHT = 96;
const GRAVITY = 0.8;
const JUMP_VELOCITY = -15;
const BASE_SPEED = 6;

const GAME_STATE = {
  READY: 'ready',
  RUNNING: 'running',
  GAME_OVER: 'game_over'
};

const obstacleTypes = {
  ore: {
    label: '矿石',
    width: 42,
    height: 40,
    color: '#6F7A86'
  },
  stump: {
    label: '木桩',
    width: 36,
    height: 52,
    color: '#8B5A2B'
  },
  tree: {
    label: '大树',
    width: 50,
    height: 78,
    color: '#3C6E47'
  }
};

const fruitTypes = {
  tastyFruit: {
    label: '可口果',
    radius: 14,
    color: '#FF9F1C'
  },
  magicFruit: {
    label: '魔力果',
    radius: 14,
    color: '#8A5CFF'
  }
};

const game = {
  state: GAME_STATE.READY,
  score: 0,
  distance: 0,
  speed: BASE_SPEED,
  frame: 0,
  obstacleTimer: 0,
  fruitTimer: 0,
  inventory: {
    tastyFruit: 0,
    magicFruit: 0
  },
  player: {
    x: 80,
    y: windowHeight - GROUND_HEIGHT - 72,
    width: 56,
    height: 72,
    vy: 0,
    isJumping: false
  },
  obstacles: [],
  fruits: []
};

function resetRound() {
  game.state = GAME_STATE.READY;
  game.score = 0;
  game.distance = 0;
  game.speed = BASE_SPEED;
  game.frame = 0;
  game.obstacleTimer = 0;
  game.fruitTimer = 0;
  game.player.y = windowHeight - GROUND_HEIGHT - game.player.height;
  game.player.vy = 0;
  game.player.isJumping = false;
  game.obstacles.length = 0;
  game.fruits.length = 0;
}

function startRun() {
  if (game.state === GAME_STATE.RUNNING) return;
  if (game.state === GAME_STATE.GAME_OVER) {
    resetRound();
  }
  game.state = GAME_STATE.RUNNING;
}

function jump() {
  if (game.state !== GAME_STATE.RUNNING) {
    startRun();
    return;
  }

  const groundY = windowHeight - GROUND_HEIGHT - game.player.height;
  if (!game.player.isJumping && Math.abs(game.player.y - groundY) < 1) {
    game.player.vy = JUMP_VELOCITY;
    game.player.isJumping = true;
  }
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnObstacle() {
  const keys = Object.keys(obstacleTypes);
  const type = keys[randomInRange(0, keys.length - 1)];
  const config = obstacleTypes[type];
  const obstacle = {
    type,
    x: windowWidth + randomInRange(0, 120),
    y: windowHeight - GROUND_HEIGHT - config.height,
    width: config.width,
    height: config.height
  };
  game.obstacles.push(obstacle);
}

function spawnFruit() {
  const keys = Object.keys(fruitTypes);
  const type = keys[randomInRange(0, keys.length - 1)];
  const config = fruitTypes[type];
  const fruit = {
    type,
    x: windowWidth + randomInRange(0, 120),
    y: windowHeight - GROUND_HEIGHT - randomInRange(90, 160),
    radius: config.radius
  };
  game.fruits.push(fruit);
}

function isRectCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function isCircleRectCollision(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function update() {
  if (game.state !== GAME_STATE.RUNNING) return;

  game.frame += 1;
  game.distance += game.speed;
  game.score = Math.floor(game.distance / 20);
  game.speed = BASE_SPEED + Math.min(4, Math.floor(game.score / 120));

  const groundY = windowHeight - GROUND_HEIGHT - game.player.height;

  game.player.vy += GRAVITY;
  game.player.y += game.player.vy;
  if (game.player.y >= groundY) {
    game.player.y = groundY;
    game.player.vy = 0;
    game.player.isJumping = false;
  }

  game.obstacleTimer += 1;
  if (game.obstacleTimer > randomInRange(55, 105)) {
    spawnObstacle();
    game.obstacleTimer = 0;
  }

  game.fruitTimer += 1;
  if (game.fruitTimer > randomInRange(75, 140)) {
    spawnFruit();
    game.fruitTimer = 0;
  }

  for (let i = game.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = game.obstacles[i];
    obstacle.x -= game.speed;

    if (obstacle.x + obstacle.width < -20) {
      game.obstacles.splice(i, 1);
      continue;
    }

    if (isRectCollision(game.player, obstacle)) {
      game.state = GAME_STATE.GAME_OVER;
    }
  }

  for (let i = game.fruits.length - 1; i >= 0; i -= 1) {
    const fruit = game.fruits[i];
    fruit.x -= game.speed;

    if (fruit.x + fruit.radius < -20) {
      game.fruits.splice(i, 1);
      continue;
    }

    const circle = {
      x: fruit.x,
      y: fruit.y,
      radius: fruit.radius
    };

    if (isCircleRectCollision(circle, game.player)) {
      game.inventory[fruit.type] += 1;
      game.fruits.splice(i, 1);
    }
  }
}

function drawBackground() {
  const skyGradient = ctx.createLinearGradient(0, 0, 0, windowHeight);
  skyGradient.addColorStop(0, '#89CFF0');
  skyGradient.addColorStop(1, '#E9F7FF');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, windowWidth, windowHeight);

  ctx.fillStyle = '#86C166';
  ctx.fillRect(0, windowHeight - GROUND_HEIGHT, windowWidth, GROUND_HEIGHT);

  ctx.fillStyle = '#629F43';
  for (let x = 0; x < windowWidth; x += 36) {
    ctx.fillRect(x, windowHeight - GROUND_HEIGHT, 20, 6);
  }
}

function drawPlayer() {
  const p = game.player;

  // 卡瓦重占位绘制：身体+壳
  ctx.fillStyle = '#455A64';
  ctx.fillRect(p.x, p.y + 18, p.width, p.height - 18);

  ctx.fillStyle = '#607D8B';
  ctx.beginPath();
  ctx.arc(p.x + p.width / 2, p.y + 24, 24, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#CFD8DC';
  ctx.fillRect(p.x + 8, p.y + 34, 12, 10);
  ctx.fillRect(p.x + p.width - 20, p.y + 34, 12, 10);
}

function drawObstacles() {
  game.obstacles.forEach((obstacle) => {
    const config = obstacleTypes[obstacle.type];

    ctx.fillStyle = config.color;
    if (obstacle.type === 'ore') {
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width * 0.1, obstacle.y + obstacle.height);
      ctx.lineTo(obstacle.x + obstacle.width * 0.5, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width * 0.9, obstacle.y + obstacle.height);
      ctx.closePath();
      ctx.fill();
    } else if (obstacle.type === 'stump') {
      ctx.fillRect(obstacle.x, obstacle.y + 10, obstacle.width, obstacle.height - 10);
      ctx.fillStyle = '#A67642';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 14);
    } else {
      ctx.fillStyle = '#6B4226';
      ctx.fillRect(obstacle.x + obstacle.width * 0.35, obstacle.y + 22, obstacle.width * 0.3, obstacle.height - 22);
      ctx.fillStyle = config.color;
      ctx.beginPath();
      ctx.arc(obstacle.x + obstacle.width / 2, obstacle.y + 18, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawFruits() {
  game.fruits.forEach((fruit) => {
    const config = fruitTypes[fruit.type];
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(fruit.x - 2, fruit.y - fruit.radius - 8, 4, 8);
  });
}

function drawHUD() {
  ctx.fillStyle = '#1F2D3D';
  ctx.font = '18px sans-serif';
  ctx.fillText(`分数: ${game.score}`, 16, 34);

  ctx.font = '15px sans-serif';
  ctx.fillText(`可口果: ${game.inventory.tastyFruit}`, 16, 58);
  ctx.fillText(`魔力果: ${game.inventory.magicFruit}`, 16, 80);

  if (game.state === GAME_STATE.READY) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, windowWidth, windowHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px sans-serif';
    ctx.fillText('卡瓦重跑酷（原型）', windowWidth / 2 - 110, windowHeight / 2 - 30);
    ctx.font = '18px sans-serif';
    ctx.fillText('点击屏幕开始并跳跃', windowWidth / 2 - 90, windowHeight / 2 + 6);
  }

  if (game.state === GAME_STATE.GAME_OVER) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, windowWidth, windowHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '28px sans-serif';
    ctx.fillText('游戏结束', windowWidth / 2 - 58, windowHeight / 2 - 22);
    ctx.font = '18px sans-serif';
    ctx.fillText('点击重新开始', windowWidth / 2 - 64, windowHeight / 2 + 10);
  }
}

function render() {
  drawBackground();
  drawPlayer();
  drawObstacles();
  drawFruits();
  drawHUD();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

wx.onTouchStart(() => {
  if (game.state === GAME_STATE.GAME_OVER) {
    startRun();
    return;
  }

  if (game.state === GAME_STATE.READY) {
    startRun();
  }
  jump();
});

resetRound();
loop();
