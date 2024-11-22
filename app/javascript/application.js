// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import '@hotwired/turbo-rails'
import 'controllers'
import 'flowbite';
import './nav_menu';

window.scrollToElement = function (elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    window.scrollTo({
      top: element.offsetTop - 100, // Scroll to the top of the element
      behavior: 'smooth'            // Smooth scroll effect
    });
  } else {
    console.error(`Element with id "${elementId}" not found.`);
  }
};

window.scrollToTop = function() {
  window.scrollTo({
    top: 0,               // Scroll to the top of the page
    behavior: 'smooth'    // Smooth scroll effect
  });
};

// Get the button element
const scrollToTopBtn = document.getElementById('scrollToTopBtn');

// Show or hide the button based on scroll position
window.onscroll = function () {
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    scrollToTopBtn.style.display = 'block'; // Show button
  } else {
    scrollToTopBtn.style.display = 'none';  // Hide button
  }
};

document.querySelectorAll('#main a').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.target.getAttribute('href').startsWith('#')) {
      event.preventDefault();
      const elementId = event.target.getAttribute('href').substring(1);
      scrollToElement(elementId);
    }
  });
});
