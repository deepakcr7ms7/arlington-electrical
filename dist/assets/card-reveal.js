const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
const video = hero.querySelector('video');
const videoToggle = hero.querySelector('.video-toggle');

if (!reducedMotion.matches) {
  video.addEventListener('playing', () => {
    video.classList.add('is-playing');
    videoToggle.classList.add('is-playing');
    videoToggle.setAttribute('aria-label', 'Pause project reel');
    videoToggle.hidden = false;
  });
  video.addEventListener('pause', () => {
    videoToggle.classList.remove('is-playing');
    videoToggle.setAttribute('aria-label', 'Play project reel');
  });
  video.addEventListener('error', () => {
    video.classList.remove('is-playing');
    videoToggle.hidden = true;
  });
  videoToggle.addEventListener('click', () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
  video.src = video.dataset.src;
  video.play().catch(() => {
    if (!video.error) videoToggle.hidden = false;
  });

  let scrollFrame = 0;
  function updateHero() {
    scrollFrame = 0;
    const {top, height} = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -top / height));
    hero.style.setProperty('--hero-shift', `${progress * height * .06}px`);
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHero);
  }, {passive: true});
  updateHero();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      }
    }, {threshold: .12});
    for (const element of document.querySelectorAll('.reveal')) {
      if (element.getBoundingClientRect().top < innerHeight) continue;
      element.classList.add('is-pending');
      observer.observe(element);
    }
  }
}

const gallery = document.querySelector('.project-carousel');
const slides = Array.from(gallery.querySelectorAll('.project-images img'));
const dots = Array.from(gallery.querySelectorAll('[data-project]'));
const ghost = gallery.querySelector('.ghost-words');
const ghostWords = [
  ['Built', 'to', 'light', 'up'],
  ['Light', 'in', 'every', 'line'],
  ['After', 'dark', 'still', 'bright'],
  ['Power', 'behind', 'the', 'walls']
];
let active = 0;

function showProject(index) {
  const next = (index + slides.length) % slides.length;
  if (next === active) return;
  slides[active].hidden = true;
  slides[active].classList.remove('is-entering');
  dots[active].removeAttribute('aria-current');
  active = next;
  slides[active].hidden = false;
  slides[active].classList.add('is-entering');
  dots[active].setAttribute('aria-current', 'true');
  gallery.querySelector('.project-index').textContent = `${String(active + 1).padStart(2, '0')} / 04`;
  gallery.querySelector('.project-title').textContent = dots[active].getAttribute('aria-label');
  ghost.replaceChildren(...ghostWords[active].map(word => {
    const span = document.createElement('span');
    span.textContent = word;
    return span;
  }));
  ghost.classList.add('is-changing');
}

gallery.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  showProject(button.hasAttribute('data-project')
    ? Number(button.dataset.project)
    : active + Number(button.dataset.projectStep));
});
gallery.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  showProject(active + (event.key === 'ArrowRight' ? 1 : -1));
});

const menu = document.querySelector('#menu');
const menuToggle = document.querySelector('.menu-toggle');
const booking = document.querySelector('#booking');
const service = document.querySelector('#service');

function updatePrep() {
  document.querySelector('#prep').textContent = service.value === 'TV & entertainment setup'
    ? 'Have your TV size, wall type, and a photo of the intended location handy.'
    : 'Have a few photos of the space and a short description of the work handy.';
}

menuToggle.addEventListener('click', () => {
  menu.showModal();
  menuToggle.setAttribute('aria-expanded', 'true');
});
menu.addEventListener('close', () => menuToggle.setAttribute('aria-expanded', 'false'));
menu.querySelector('nav').addEventListener('click', event => {
  if (event.target.closest('a')) menu.close();
});

for (const dialog of [menu, booking]) {
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
  });
}

for (const button of document.querySelectorAll('[data-estimate]')) {
  button.addEventListener('click', () => {
    if (menu.open) menu.close();
    service.value = button.dataset.estimate || service.options[0].value;
    updatePrep();
    booking.showModal();
  });
}
service.addEventListener('change', updatePrep);
