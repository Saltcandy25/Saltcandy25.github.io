(() => {
  const canvas = document.querySelector('#game-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const cell = 24;
  const columns = canvas.width / cell;
  const rows = canvas.height / cell;
  const maxEnemies = 4;
  const directions = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const levelElement = document.querySelector('#level');
  const statusElement = document.querySelector('#game-status');
  const messageElement = document.querySelector('#game-message');
  const startButton = document.querySelector('#start-button');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  let worm = [];
  let food = null;
  let enemies = [];
  let direction = directions.right;
  let nextDirection = direction;
  let running = false;
  let paused = false;
  let score = 0;
  let level = 1;
  let best = Number(localStorage.getItem('worm-best-score') || 0);
  const baseMoveInterval = 400;
  const levelSpeedStep = 20;
  const minimumMoveInterval = 50;
  const maximumLevel = Math.ceil((baseMoveInterval - minimumMoveInterval) / levelSpeedStep) + 1;
  let tickTimer = null;
  let enemyTimer = null;
  let explosionTimer = null;
  let respawnTimer = null;

  highScoreElement.textContent = formatScore(best);
  levelElement.textContent = formatLevel(level);

  function formatScore(value) { return String(value).padStart(3, '0'); }
  function formatLevel(value) { return String(value).padStart(2, '0'); }
  function randomCell() { return { x: Math.floor(Math.random() * columns), y: Math.floor(Math.random() * rows) }; }

  function isOccupied(point) {
    return worm.some((segment) => segment.x === point.x && segment.y === point.y) || enemies.some((enemy) => enemy.active && enemy.x === point.x && enemy.y === point.y);
  }

  function randomFreeCell() {
    let point = randomCell();
    let attempts = 0;
    while (isOccupied(point) && attempts < 100) { point = randomCell(); attempts += 1; }
    return point;
  }

  function clearTimers() {
    [tickTimer, enemyTimer, explosionTimer].forEach((timer) => { if (timer) clearInterval(timer); });
    if (respawnTimer) clearTimeout(respawnTimer);
    tickTimer = enemyTimer = explosionTimer = respawnTimer = null;
  }

  function setStatus(value) { statusElement.textContent = value; }
  function currentMoveInterval() { return Math.max(minimumMoveInterval, baseMoveInterval - ((level - 1) * levelSpeedStep)); }
  function targetEnemyCount() { return Math.min(maxEnemies, 1 + Math.floor(level / 2)); }

  function restartTickTimer() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, currentMoveInterval());
  }

  function addEnemiesForLevel() {
    while (enemies.length < targetEnemyCount()) {
      enemies.push({ ...randomFreeCell(), direction: directions.left, active: true, explosionUntil: 0 });
    }
  }

  function startGame() {
    clearTimers();
    const head = randomCell();
    worm = [head, { x: Math.max(0, head.x - 1), y: head.y }, { x: Math.max(0, head.x - 2), y: head.y }];
    direction = directions.right;
    nextDirection = direction;
    food = randomFreeCell();
    enemies = [{ ...randomFreeCell(), direction: directions.left, active: true, explosionUntil: 0 }];
    score = 0;
    level = 1;
    running = true;
    paused = false;
    scoreElement.textContent = formatScore(score);
    levelElement.textContent = formatLevel(level);
    setStatus('RUNNING');
    messageElement.classList.add('is-hidden');
    pauseButton.disabled = false;
    pauseButton.textContent = 'Pause';
    restartTickTimer();
    enemyTimer = setInterval(moveEnemies, 520);
    explosionTimer = setInterval(explodeEnemies, 4000);
    draw();
  }

  function tick() {
    if (!running || paused) return;
    direction = nextDirection;
    const head = { x: worm[0].x + direction.x, y: worm[0].y + direction.y };
    const hitWall = head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows;
    const hitSelf = worm.some((segment) => segment.x === head.x && segment.y === head.y);
    const hitEnemy = enemies.some((enemy) => enemy.active && head.x === enemy.x && head.y === enemy.y);
    if (hitWall || hitSelf || hitEnemy) { endGame('GAME OVER'); return; }
    worm.unshift(head);
    if (food && head.x === food.x && head.y === food.y) {
      score += 1;
      if (score % 3 === 0 && level < maximumLevel) {
        level += 1;
        levelElement.textContent = formatLevel(level);
        addEnemiesForLevel();
        restartTickTimer();
      }
      scoreElement.textContent = formatScore(score);
      food = randomFreeCell();
    } else worm.pop();
    draw();
  }

  function moveEnemies() {
    if (!running || paused) return;
    enemies.forEach((enemy) => {
      if (!enemy.active) return;
      const options = Object.values(directions).filter((candidate) => candidate.x !== -enemy.direction.x || candidate.y !== -enemy.direction.y);
      enemy.direction = options[Math.floor(Math.random() * options.length)];
      const next = { x: enemy.x + enemy.direction.x, y: enemy.y + enemy.direction.y };
      if (next.x < 0 || next.x >= columns || next.y < 0 || next.y >= rows) enemy.direction = { x: -enemy.direction.x, y: -enemy.direction.y };
      enemy.x += enemy.direction.x;
      enemy.y += enemy.direction.y;
      if (worm.some((segment) => segment.x === enemy.x && segment.y === enemy.y)) endGame('GAME OVER');
    });
    draw();
  }

  function explodeEnemies() {
    if (!running || paused) return;
    let hitWorm = false;
    enemies.forEach((enemy) => {
      if (!enemy.active) return;
      enemy.explosionUntil = Date.now() + 320;
      enemy.active = false;
      if (worm.some((segment) => segment.x === enemy.x && segment.y === enemy.y)) hitWorm = true;
    });
    if (hitWorm) endGame('GAME OVER');
    draw();
    respawnTimer = setTimeout(respawnEnemies, 1000);
  }

  function respawnEnemies() {
    enemies.forEach((enemy) => {
      if (!enemy.active) { const point = randomFreeCell(); enemy.x = point.x; enemy.y = point.y; enemy.active = true; enemy.explosionUntil = 0; }
    });
    draw();
  }

  function endGame(message) {
    running = false;
    paused = false;
    clearTimers();
    if (score > best) { best = score; localStorage.setItem('worm-best-score', String(best)); highScoreElement.textContent = formatScore(best); }
    setStatus(message);
    messageElement.textContent = `${message} · PRESS START TO TRY AGAIN`;
    messageElement.classList.remove('is-hidden');
    pauseButton.disabled = true;
    draw();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    setStatus(paused ? 'PAUSED' : 'RUNNING');
    if (paused) { messageElement.textContent = 'PAUSED'; messageElement.classList.remove('is-hidden'); } else messageElement.classList.add('is-hidden');
    draw();
  }

  function setDirection(name) {
    const candidate = directions[name];
    if (!candidate || (candidate.x === -direction.x && candidate.y === -direction.y)) return;
    nextDirection = candidate;
  }

  function draw() {
    context.fillStyle = '#060606';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(255,255,255,.045)';
    for (let x = 0; x <= columns; x += 1) { context.beginPath(); context.moveTo(x * cell, 0); context.lineTo(x * cell, canvas.height); context.stroke(); }
    for (let y = 0; y <= rows; y += 1) { context.beginPath(); context.moveTo(0, y * cell); context.lineTo(canvas.width, y * cell); context.stroke(); }
    if (food) { context.fillStyle = '#e50914'; context.fillRect(food.x * cell + 7, food.y * cell + 7, 10, 10); }
    enemies.forEach((enemy) => {
      if (!enemy.active && enemy.explosionUntil <= Date.now()) return;
      const exploding = enemy.explosionUntil > Date.now();
      context.fillStyle = exploding ? '#f4f1eb' : '#e50914';
      context.beginPath(); context.arc(enemy.x * cell + 12, enemy.y * cell + 12, exploding ? 11 : 8, 0, Math.PI * 2); context.fill();
    });
    worm.forEach((segment, index) => { context.fillStyle = index === 0 ? '#f4f1eb' : '#b8e34b'; context.fillRect(segment.x * cell + 3, segment.y * cell + 3, 18, 18); });
  }

  document.addEventListener('keydown', (event) => {
    const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keyMap[event.key]) { event.preventDefault(); setDirection(keyMap[event.key]); }
    if (event.key.toLowerCase() === 'p') togglePause();
  });

  document.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('pointerdown', () => setDirection(button.dataset.direction)));
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', togglePause);
  draw();
})();
