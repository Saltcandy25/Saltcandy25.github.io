(() => {
  const canvas = document.querySelector('#pong-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const board = document.querySelector('#pong-board-wrap');
  const scoreElement = document.querySelector('#pong-score');
  const computerScoreElement = document.querySelector('#pong-computer-score');
  const lifeElement = document.querySelector('#pong-life');
  const statusElement = document.querySelector('#pong-status');
  const messageElement = document.querySelector('#pong-message');
  const startButton = document.querySelector('#pong-start');
  const pauseButton = document.querySelector('#pong-pause');
  const restartButton = document.querySelector('#pong-restart');
  const width = canvas.width;
  const height = canvas.height;
  const paddle = { width: 12, height: 72, inset: 24 };
  const player = { x: paddle.inset, y: height / 2 - paddle.height / 2, velocity: 0 };
  const computer = { x: width - paddle.inset - paddle.width, y: height / 2 - paddle.height / 2 };
  const ball = { radius: 7, x: width / 2, y: height / 2, vx: 260, vy: 120 };
  const maxScore = 11;
  const initialLife = 5;
  let score = 0;
  let computerScore = 0;
  let life = initialLife;
  let running = false;
  let paused = false;
  let animationFrame = null;
  let lastTime = 0;
  let lastPointerY = height / 2;
  let lastPointerTime = 0;

  const format = (value) => String(value).padStart(2, '0');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const setStatus = (value) => { statusElement.textContent = value; };
  const setMessage = (value, visible = true) => { messageElement.textContent = value; messageElement.classList.toggle('is-hidden', !visible); };
  const keepPaddleInBounds = () => { player.y = clamp(player.y, 0, height - paddle.height); };

  function updateHud() {
    scoreElement.textContent = format(score);
    computerScoreElement.textContent = format(computerScore);
    lifeElement.textContent = format(life);
  }

  function resetBall(direction = 1) {
    ball.x = width / 2;
    ball.y = height / 2;
    ball.vx = 260 * direction;
    ball.vy = (Math.random() > 0.5 ? 1 : -1) * 120;
  }

  function resetGame() {
    score = 0;
    computerScore = 0;
    life = initialLife;
    player.y = height / 2 - paddle.height / 2;
    computer.y = player.y;
    updateHud();
    resetBall(Math.random() > 0.5 ? 1 : -1);
  }

  function finish(message) {
    running = false;
    paused = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    pauseButton.disabled = true;
    setStatus('GAME OVER');
    setMessage(`${message} · PRESS START TO PLAY`);
    draw();
  }

  function scorePoint(side) {
    if (side === 'player') score += 1;
    else { computerScore += 1; life -= 1; }
    updateHud();
    if (life <= 0) return finish('NO LIVES LEFT');
    if (score >= maxScore || computerScore >= maxScore) return finish(score >= maxScore ? 'PLAYER WINS' : 'COMPUTER WINS');
    resetBall(side === 'player' ? 1 : -1);
  }

  function overlaps(target) {
    return ball.x - ball.radius < target.x + paddle.width && ball.x + ball.radius > target.x && ball.y + ball.radius > target.y && ball.y - ball.radius < target.y + paddle.height;
  }

  function reflectFromPaddle(target, direction) {
    const relative = clamp((ball.y - (target.y + paddle.height / 2)) / (paddle.height / 2), -1, 1);
    const motionEffect = clamp(player.velocity / 560, -0.55, 0.55);
    const angle = clamp((relative + motionEffect) * (Math.PI / 4), -Math.PI / 4, Math.PI / 4);
    const speed = clamp(Math.hypot(ball.vx, ball.vy) * 1.02, 260, 560);
    ball.vx = direction * speed * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
    ball.x = direction > 0 ? target.x + paddle.width + ball.radius : target.x - ball.radius;
  }

  function update(delta) {
    const previousPlayerY = player.y;
    player.y += player.velocity * delta;
    keepPaddleInBounds();
    player.velocity = (player.y - previousPlayerY) / Math.max(delta, 0.001);
    const computerTarget = ball.y - paddle.height / 2;
    computer.y += clamp(computerTarget - computer.y, -210 * delta, 210 * delta);
    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;
    if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= height) { ball.vy *= -1; ball.y = clamp(ball.y, ball.radius, height - ball.radius); }
    if (ball.vx < 0 && overlaps(player)) reflectFromPaddle(player, 1);
    if (ball.vx > 0 && overlaps(computer)) reflectFromPaddle(computer, -1);
    if (ball.x < -ball.radius) scorePoint('computer');
    if (ball.x > width + ball.radius) scorePoint('player');
  }

  function draw() {
    context.fillStyle = '#060606';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(255,255,255,.12)';
    context.setLineDash([8, 12]);
    context.beginPath(); context.moveTo(width / 2, 0); context.lineTo(width / 2, height); context.stroke(); context.setLineDash([]);
    context.fillStyle = '#b8e34b'; context.fillRect(player.x, player.y, paddle.width, paddle.height);
    context.fillStyle = '#e50914'; context.fillRect(computer.x, computer.y, paddle.width, paddle.height);
    context.fillStyle = '#f4f1eb'; context.beginPath(); context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); context.fill();
  }

  function loop(timestamp) {
    if (!running) return;
    const delta = Math.min((timestamp - lastTime) / 1000 || 0, 0.05);
    lastTime = timestamp;
    if (!paused) { update(delta); draw(); }
    animationFrame = requestAnimationFrame(loop);
  }

  function startGame() {
    if (running) return;
    resetGame(); running = true; paused = false; setStatus('RUNNING'); setMessage('', false); pauseButton.disabled = false; pauseButton.textContent = 'Pause'; lastTime = performance.now(); animationFrame = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused; setStatus(paused ? 'PAUSED' : 'RUNNING'); pauseButton.textContent = paused ? 'Resume' : 'Pause'; setMessage('PAUSED', paused); if (!paused) { lastTime = performance.now(); }
  }

  function movePlayerTo(clientY) {
    const rect = canvas.getBoundingClientRect();
    player.y = ((clientY - rect.top) / rect.height) * height - paddle.height / 2;
    keepPaddleInBounds();
    lastPointerY = clientY;
  }

  board.addEventListener('pointermove', (event) => { if (running && !paused) { const now = performance.now(); player.velocity = ((event.clientY - lastPointerY) / Math.max(now - lastPointerTime, 16)) * 1000; movePlayerTo(event.clientY); lastPointerTime = now; } });
  board.addEventListener('pointerdown', (event) => { board.setPointerCapture?.(event.pointerId); movePlayerTo(event.clientY); });
  document.addEventListener('keydown', (event) => { if (!running || paused) return; if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') { player.velocity = -300; event.preventDefault(); } if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') { player.velocity = 300; event.preventDefault(); } });
  document.addEventListener('keyup', (event) => { if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(event.key)) player.velocity = 0; });
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', () => { if (running) { finish('RESTARTING'); } resetGame(); startGame(); });
  pauseButton.addEventListener('click', togglePause);
  resetGame(); draw();
})();
