(() => {
  const menuButton = document.getElementById('landingMenu');
  const nav = document.getElementById('landingNav');

  menuButton?.addEventListener('click', () => nav.classList.toggle('open'));
  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });
})();
