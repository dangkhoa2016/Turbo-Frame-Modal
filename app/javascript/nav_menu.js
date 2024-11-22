const navbarNavId = 'navbarNav';

const toggleMenuVisibility = (navbarNav) => {
  if (navbarNav.classList.contains('hidden')) {
    navbarNav.classList.remove('hidden');
    setTimeout(() => navbarNav.classList.toggle('max-h-screen'), 50);
  } else
    navbarNav.classList.toggle('max-h-screen');
};

const initToggleMenu = () => {
  const navbarNav = document.getElementById(navbarNavId);
  if (navbarNav)
    toggleMenuVisibility(navbarNav);
};

const isToggleMenuTriggered = (target) => {
  while (target) {
    if (target.getAttribute('aria-controls') === navbarNavId)
      return true;
    target = target.parentElement;
  }
  return false;
};

document.addEventListener('click', (event) => {
  if (isToggleMenuTriggered(event.target))
    initToggleMenu();
});
