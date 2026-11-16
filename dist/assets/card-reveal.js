const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const hero = document.querySelector('.hero');
const video = hero.querySelector('video');
const videoToggle = hero.querySelector('.video-toggle');
window.lightsReady = true;

// The hero starts dark and the lights come up once, as the page opens.
const lightSwitch = hero.querySelector('.light-switch');
const lightState = lightSwitch.querySelector('.light-state');
let lightsOnTimer = 0;
function setLights(on) {
  hero.classList.toggle('is-lit', on);
  lightSwitch.setAttribute('aria-checked', String(on));
  lightState.textContent = on ? 'on' : 'off';
}
lightSwitch.addEventListener('click', () => {
  clearTimeout(lightsOnTimer);
  setLights(lightSwitch.getAttribute('aria-checked') !== 'true');
});
if (reducedMotion.matches) {
  setLights(true);
} else {
  setLights(false);
  lightsOnTimer = setTimeout(() => setLights(true), 500);
}

// Keep the phone number in reach between the hero and the footer, where it already sits.
const callBar = document.querySelector('.call-bar');
if (callBar && 'IntersectionObserver' in window) {
  const covered = new Set([hero]);
  const callBarObserver = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (isIntersecting) covered.add(target); else covered.delete(target);
    }
    callBar.classList.toggle('is-visible', covered.size === 0);
  }, {rootMargin: '-85% 0px 0px 0px'}); // only the bottom strip, where the button sits
  callBarObserver.observe(hero);
  callBarObserver.observe(document.querySelector('.footer'));
}

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

const projectCategories = Array.from(document.querySelectorAll('.project-category'), section => ({
  section,
  heading: section.querySelector('summary'),
  gallery: section.querySelector('.project-gallery')
}));
const handoffTiming = {duration: 760, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both'};
let activeCategory = projectCategories.findIndex(({section}) => section.open);
let categoryTransition = false;
let queuedCategory = null;
let lastCategoryScroll = scrollY;
let handoffScroll = scrollY;
let categoryFrame = 0;
let lastProjectScrollInput = -Infinity;
function centerGallery(heading, startTop, endTop, opening) {
  let frame;
  let interrupted = false;
  const input = new AbortController();
  for (const type of ['wheel', 'touchmove', 'keydown']) {
    addEventListener(type, event => {
      if (type !== 'keydown' || ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
        interrupted = true;
      }
    }, {passive: true, signal: input.signal});
  }

  function position(progress) {
    const targetTop = startTop + (endTop - startTop) * progress;
    scrollTo({top: scrollY + heading.getBoundingClientRect().top - targetTop, behavior: 'instant'});
  }

  function tick() {
    if (interrupted) return;
    const progress = opening.effect.getComputedTiming().progress ?? 0;
    position(progress);
    if (progress < 1) frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    input.abort();
    if (!interrupted) position(1);
  };
}

async function openProjectCategory(index) {
  if (categoryTransition) {
    queuedCategory = index;
    return;
  }
  if (index === activeCategory) return;

  const previous = projectCategories[activeCategory];
  const next = projectCategories[index];
  activeCategory = index;
  categoryTransition = true;
  document.documentElement.classList.add('project-handoff');
  const previousHeight = previous.gallery.getBoundingClientRect().height;
  const nextHeading = next.heading.getBoundingClientRect();
  next.section.open = true;
  const nextHeight = next.gallery.getBoundingClientRect().height;
  const viewportHeight = window.visualViewport?.height ?? innerHeight;
  const centeredTop = Math.max(12, (viewportHeight - nextHeading.height - nextHeight) / 2);
  if (reducedMotion.matches) {
    previous.section.open = false;
    scrollTo({top: scrollY + next.heading.getBoundingClientRect().top - centeredTop, behavior: 'instant'});
  } else {
    previous.gallery.inert = true;
    next.gallery.inert = true;
    const closing = previous.gallery.animate([{height: `${previousHeight}px`}, {height: '0px'}], handoffTiming);
    const opening = next.gallery.animate([{height: '0px'}, {height: `${nextHeight}px`}], handoffTiming);
    const finishCentering = centerGallery(next.heading, nextHeading.top, centeredTop, opening);
    await Promise.allSettled([closing.finished, opening.finished]);
    previous.section.open = false;
    previous.gallery.inert = false;
    next.gallery.inert = false;
    closing.cancel();
    opening.cancel();
    finishCentering();
  }
  document.documentElement.classList.remove('project-handoff');
  lastCategoryScroll = handoffScroll = scrollY;
  categoryTransition = false;

  const pending = queuedCategory;
  queuedCategory = null;
  if (pending !== null) openProjectCategory(pending);
}

projectCategories.forEach(({heading}, index) => {
  heading.addEventListener('click', event => {
    event.preventDefault();
    openProjectCategory(index);
  });
});

function followProjectScroll() {
  categoryFrame = 0;
  const direction = Math.sign(scrollY - lastCategoryScroll);
  lastCategoryScroll = scrollY;
  const current = projectCategories[activeCategory];
  const keyboardFocus = current.gallery.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
  // Give the new gallery room before another scroll handoff.
  if (!direction || categoryTransition || keyboardFocus || Math.abs(scrollY - handoffScroll) < 64) return;
  if (performance.now() - lastProjectScrollInput > 900) return;

  const currentTop = current.heading.getBoundingClientRect().top;
  const neighbor = projectCategories[activeCategory + direction];
  if (!neighbor) return;
  const neighborTop = neighbor.heading.getBoundingClientRect().top;
  if (direction > 0 && currentTop <= innerHeight * .16 && neighborTop >= 0 && neighborTop <= innerHeight * .78) {
    openProjectCategory(activeCategory + 1);
  } else if (direction < 0 && currentTop >= innerHeight * .46 && currentTop < innerHeight && neighborTop >= 0) {
    openProjectCategory(activeCategory - 1);
  }
}

// Focus changes and anchor navigation can scroll the page too.
addEventListener('wheel', event => {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) lastProjectScrollInput = performance.now();
}, {passive: true});
addEventListener('touchmove', () => {
  lastProjectScrollInput = performance.now();
}, {passive: true});
addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) {
    lastProjectScrollInput = performance.now();
  }
});
addEventListener('scroll', () => {
  if (!categoryFrame) categoryFrame = requestAnimationFrame(followProjectScroll);
}, {passive: true});

for (const {gallery} of projectCategories) {
  const rail = gallery.querySelector('.project-rail');
  const cards = Array.from(rail.children);
  if (cards.length < 2) continue;
  const controls = gallery.querySelector('.project-controls');
  const previous = controls.querySelector('[data-project-step="-1"]');
  const next = controls.querySelector('[data-project-step="1"]');
  const count = controls.querySelector('.project-count');

  function activeIndex() {
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    return step ? Math.min(cards.length - 1, Math.round(rail.scrollLeft / step)) : 0;
  }

  function updateControls() {
    const index = activeIndex();
    const label = `${index + 1} of ${cards.length}`;
    if (count.textContent !== label) count.textContent = label;
    previous.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === cards.length - 1));
  }

  function moveProject(direction) {
    const current = activeIndex();
    const target = Math.max(0, Math.min(cards.length - 1, current + direction));
    if (current === target) return;
    rail.scrollTo({
      left: cards[target].offsetLeft - cards[0].offsetLeft,
      behavior: reducedMotion.matches ? 'instant' : 'smooth'
    });
  }

  previous.addEventListener('click', () => moveProject(-1));
  next.addEventListener('click', () => moveProject(1));
  rail.addEventListener('scroll', updateControls, { passive: true });
  rail.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveProject(event.key === 'ArrowLeft' ? -1 : 1);
  });

  updateControls();
  controls.hidden = false;
}

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
