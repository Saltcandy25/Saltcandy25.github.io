const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.matches('a')) {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

const gameTabs = document.querySelectorAll('[data-game-select]');
const gamePanels = document.querySelectorAll('[data-game-panel]');

gameTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selectedGame = tab.dataset.gameSelect;
    gameTabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    gamePanels.forEach((panel) => { panel.hidden = panel.dataset.gamePanel !== selectedGame; });
    const heading = document.querySelector('#games-title');
    const intro = document.querySelector('.game-intro');
    if (heading) heading.textContent = selectedGame === 'pong' ? 'Cursor Pong / 02' : 'Worm / 01';
    if (intro) intro.textContent = selectedGame === 'pong' ? 'Move the paddle. Return the signal.' : 'Survive the machine. Grow the line.';
  });
});

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let framePending = false;
  let pointerX = 0;
  let pointerY = 0;

  window.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * -18;
    pointerY = (event.clientY / window.innerHeight - 0.5) * -12;
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      document.body.style.setProperty('--bg-x', pointerX.toFixed(2));
      document.body.style.setProperty('--bg-y', pointerY.toFixed(2));
      framePending = false;
    });
  });
}
