if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      }
    }
  });

  for (const card of document.querySelectorAll('.service, .step, .cta-box')) {
    if (card.getBoundingClientRect().top > window.innerHeight) {
      card.classList.add('reveal-card', 'is-pending');
      observer.observe(card);
    }
  }
}
