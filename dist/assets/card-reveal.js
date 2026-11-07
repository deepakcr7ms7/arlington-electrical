const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const heroVideo = document.querySelector('.hero-project-video');
const videoToggle = document.querySelector('.hero-video-toggle');

if (heroVideo && videoToggle && !reducedMotion.matches) {
  heroVideo.addEventListener('playing', () => {
    heroVideo.classList.add('is-playing');
    videoToggle.textContent = 'Pause video';
    videoToggle.hidden = false;
  });

  heroVideo.addEventListener('pause', () => {
    videoToggle.textContent = 'Play video';
  });

  videoToggle.addEventListener('click', () => {
    if (heroVideo.paused) {
      heroVideo.play().catch(() => {});
    } else {
      heroVideo.pause();
    }
  });

  heroVideo.src = heroVideo.dataset.src;
  heroVideo.play().catch(() => {
    // Keep the project photo visible when autoplay is blocked.
  });
}

const hero = document.querySelector('.hero-project');

if (hero && !reducedMotion.matches) {
  let pendingFrame = false;

  function updateHeroScroll() {
    pendingFrame = false;
    const distance = -hero.getBoundingClientRect().top;
    const progress = Math.min(1, Math.max(0, distance / hero.offsetHeight));
    hero.style.setProperty('--hero-shift', `${progress * Math.min(hero.offsetHeight * .025, 24)}px`);
    hero.style.setProperty('--hero-shade', String(.22 + progress * .32));
  }

  window.addEventListener('scroll', () => {
    if (!pendingFrame) {
      pendingFrame = true;
      requestAnimationFrame(updateHeroScroll);
    }
  }, { passive: true });

  updateHeroScroll();
}

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: .12 });

  for (const card of document.querySelectorAll('.service, .process > div:first-child, .step, .cta-box')) {
    if (card.getBoundingClientRect().top > window.innerHeight) {
      card.classList.add('reveal-card', 'is-pending');
      observer.observe(card);
    }
  }
}
