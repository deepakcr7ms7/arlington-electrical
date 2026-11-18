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

// Selected work: tabs choose a service, the photo browses its projects.
// The projects live in the HTML, so the section still reads without scripting.
function initShowcase(root) {
  const body = root.querySelector('.showcase-body');
  const photo = root.querySelector('.showcase-photo');
  const tracks = Array.from(root.querySelectorAll('.showcase-track'));
  const caption = root.querySelector('.showcase-caption');
  const title = caption.querySelector('.showcase-title');
  const description = caption.querySelector('.showcase-description');
  const controls = root.querySelector('.showcase-controls');
  const previous = controls.querySelector('[data-step="-1"]');
  const next = controls.querySelector('[data-step="1"]');
  const count = controls.querySelector('.showcase-count');
  const thumbs = root.querySelector('.showcase-thumbs');
  const status = root.querySelector('[data-showcase-status]');

  let service = -1;
  let index = 0;
  let track = null;
  let slides = [];
  let thumbButtons = [];

  const tablist = document.createElement('div');
  tablist.className = 'showcase-tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Services');
  const tabs = tracks.map((item, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'showcase-tab';
    tab.id = `showcase-tab-${i}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'showcase-panel');
    tab.innerHTML = `<span class="sw-label"></span><span class="sw-well" aria-hidden="true"><span class="sw-rocker"></span></span>`;
    tab.querySelector('.sw-label').textContent = item.dataset.service;
    tab.addEventListener('click', () => selectService(i));
    return tab;
  });
  tablist.append(...tabs);
  root.prepend(tablist);

  body.id = 'showcase-panel';
  body.setAttribute('role', 'tabpanel');
  photo.tabIndex = 0;
  photo.setAttribute('role', 'group');
  photo.setAttribute('aria-roledescription', 'carousel');
  photo.setAttribute('aria-label', 'Project photos. Swipe or use the up and down arrow keys to browse.');

  function loadPhotos(item) {
    for (const img of item.querySelectorAll('img')) img.loading = 'eager';
  }

  function slideTitle(slide) {
    return slide.querySelector('h4').textContent;
  }

  function setIndex(target, {instant = false, announce = false} = {}) {
    const previousIndex = index;
    index = Math.max(0, Math.min(slides.length - 1, target));
    if (instant) track.style.transition = 'none';
    track.style.transform = `translateY(${-index * 100}%)`;
    if (instant) {
      track.offsetHeight;
      track.style.transition = '';
    }
    const slide = slides[index];
    slides.forEach((item, i) => item.setAttribute('aria-hidden', String(i !== index)));
    thumbButtons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    title.textContent = slideTitle(slide);
    description.textContent = slide.querySelector('.showcase-slide-copy p').textContent;
    count.textContent = `${index + 1} of ${slides.length}`;
    previous.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === slides.length - 1));
    const single = slides.length < 2;
    controls.classList.toggle('is-idle', single); thumbs.classList.toggle('is-idle', single);
    controls.inert = thumbs.inert = single;
    if (index !== previousIndex || instant) {
      caption.classList.remove('is-changing');
      if (!instant) {
        caption.offsetWidth;
        caption.classList.add('is-changing');
      }
    }
    if (announce) status.textContent = `Project ${index + 1} of ${slides.length}: ${slideTitle(slide)}`;
  }

  function buildThumbs() {
    thumbButtons = slides.map((slide, i) => {
      const button = document.createElement('button');
      const img = document.createElement('img');
      button.type = 'button';
      button.className = 'showcase-thumb';
      button.setAttribute('aria-label', `Show ${slideTitle(slide)}`);
      img.src = slide.querySelector('img').getAttribute('src');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      button.append(img);
      button.addEventListener('click', () => setIndex(i, {announce: true}));
      return button;
    });
    thumbs.replaceChildren(...thumbButtons);
  }

  function selectService(i, {initial = false, focus = false} = {}) {
    if (i === service) return;
    service = i;
    tracks.forEach((item, k) => { item.hidden = k !== i; });
    track = tracks[i];
    slides = Array.from(track.querySelectorAll('.showcase-slide'));
    tabs.forEach((tab, k) => {
      tab.setAttribute('aria-selected', String(k === i));
      tab.tabIndex = k === i ? 0 : -1;
    });
    body.setAttribute('aria-labelledby', tabs[i].id);
    buildThumbs();
    setIndex(0, {instant: true});
    if (!initial) {
      loadPhotos(track);
      track.classList.remove('is-entering');
      track.offsetWidth;
      track.classList.add('is-entering');
      const tab = tabs[i];
      tablist.scrollTo({left: tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
      status.textContent = `${tracks[i].dataset.service}: project 1 of ${slides.length}`;
    }
    if (focus) tabs[i].focus();
  }

  tablist.addEventListener('keydown', event => {
    const keys = {ArrowRight: 1, ArrowLeft: -1};
    const current = tabs.indexOf(document.activeElement);
    if (current < 0) return;
    let target;
    if (event.key in keys) target = (current + keys[event.key] + tabs.length) % tabs.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = tabs.length - 1;
    else return;
    event.preventDefault();
    selectService(target, {focus: true});
  });

  previous.addEventListener('click', () => setIndex(index - 1, {announce: true}));
  next.addEventListener('click', () => setIndex(index + 1, {announce: true}));
  photo.addEventListener('keydown', event => {
    const step = {ArrowUp: -1, PageUp: -1, ArrowDown: 1, PageDown: 1}[event.key];
    if (!step || slides.length < 2) return;
    event.preventDefault();
    setIndex(index + step, {announce: true});
  });

  // Vertical swipes on the photo browse projects; everywhere else the page scrolls as usual.
  // (Mouse users have the buttons, thumbnails and arrow keys, and the wheel keeps scrolling the page.)
  let drag = null;
  photo.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary || slides.length < 2) return;
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp, dy: 0, axis: ''};
  });
  photo.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.axis && Math.hypot(dx, dy) > 8) drag.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    if (drag.axis !== 'y') return;
    drag.dy = dy;
    const pastEdge = (index === 0 && dy > 0) || (index === slides.length - 1 && dy < 0);
    track.style.transition = 'none';
    track.style.transform = `translateY(calc(${-index * 100}% + ${pastEdge ? dy * .25 : dy}px))`;
  });
  function endDrag(event, cancelled) {
    if (!drag || event.pointerId !== drag.id) return;
    const {dy, axis, time} = drag;
    drag = null;
    track.style.transition = '';
    if (axis !== 'y') return;
    const flick = Math.abs(dy) > 24 && Math.abs(dy) / Math.max(1, event.timeStamp - time) > .45;
    const moved = !cancelled && (Math.abs(dy) > Math.min(56, photo.clientHeight * .15) || flick);
    setIndex(index + (moved ? (dy < 0 ? 1 : -1) : 0), {announce: moved});
  }
  photo.addEventListener('pointerup', event => endDrag(event, false));
  photo.addEventListener('pointercancel', event => endDrag(event, true));

  caption.hidden = false; controls.hidden = false; thumbs.hidden = false;
  root.dataset.enhanced = '';
  selectService(0, {initial: true});

  // Reserve room for the longest caption so the section never changes height.
  function measureCaption() {
    const t0 = title.textContent, d0 = description.textContent;
    caption.style.minHeight = '0';
    let max = 0;
    for (const slide of root.querySelectorAll('.showcase-slide')) {
      title.textContent = slide.querySelector('h4').textContent;
      description.textContent = slide.querySelector('.showcase-slide-copy p').textContent;
      max = Math.max(max, caption.offsetHeight);
    }
    title.textContent = t0; description.textContent = d0;
    caption.style.minHeight = max + 'px';
  }

  // The wire: runs under the plates, drops from each, and one connection reaches the top of the photo.
  const NS = 'http://www.w3.org/2000/svg';
  const wire = document.createElementNS(NS, 'svg');
  wire.setAttribute('class', 'showcase-wire');
  wire.setAttribute('aria-hidden', 'true');
  wire.setAttribute('focusable', 'false');
  root.append(wire);
  function drawWire() {
    const rb = root.getBoundingClientRect(), rail = tablist.getBoundingClientRect(), pb = photo.getBoundingClientRect();
    if (!rb.width) return;
    wire.setAttribute('viewBox', `0 0 ${rb.width} ${rb.height}`);
    const rects = tabs.map(tab => tab.getBoundingClientRect());
    const xs = rects.map(r => r.left + r.width / 2 - rb.left);
    const plateBottom = rects[0].bottom - rb.top;
    const y = plateBottom + 26;
    const top = pb.top - rb.top;
    const clipL = rail.left - rb.left, clipR = rail.right - rb.left;
    const sx = xs[service];
    const px = Math.max(pb.left - rb.left + 28, Math.min(pb.right - rb.left - 28, sx, clipR - 24), clipL + 24);
    const [lo, hi] = sx < px ? [sx, px] : [px, sx];
    let svg = `<defs><clipPath id="sw-clip"><rect x="${clipL}" y="0" width="${clipR - clipL}" height="${rb.height}"/></clipPath></defs><g clip-path="url(#sw-clip)">`;
    svg += `<path class="sw-line" d="M${xs[0]} ${y}H${xs[xs.length - 1]}"/>`;
    xs.forEach((x, i) => { svg += `<path class="sw-line" d="M${x} ${plateBottom}V${y}"/>`; });
    svg += `<path class="sw-live" d="M${sx} ${plateBottom}V${y}"/>`;
    if (hi > lo) svg += `<path class="sw-live" d="M${lo} ${y}H${hi}"/>`;
    svg += `<path class="sw-live" d="M${px} ${y}V${top}" opacity=".9"/>`;
    xs.forEach((x, i) => { svg += `<circle class="sw-node${i === service ? ' is-on' : ''}" cx="${x}" cy="${y}" r="${i === service ? 5 : 3.5}"/>`; });
    svg += `<circle class="sw-node is-on" cx="${px}" cy="${top}" r="3.5"/></g>`;
    wire.innerHTML = svg;
  }
  let frame = 0;
  const redraw = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(drawWire); };
  const relayout = () => { measureCaption(); redraw(); };
  relayout();
  new ResizeObserver(relayout).observe(root);
  tablist.addEventListener('scroll', redraw, {passive: true});
  addEventListener('resize', relayout);
  document.fonts?.ready.then(relayout);
  tabs.forEach(tab => tab.addEventListener('click', redraw));
  tablist.addEventListener('keydown', redraw);
  // Photos load as the card nears the screen, and each service's photos load when its tab opens.
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      loadPhotos(track);
      near.disconnect();
    }, {rootMargin: '800px 0px'});
    near.observe(root);
  } else {
    loadPhotos(track);
  }
}

const showcase = document.querySelector('[data-showcase]');
if (showcase) initShowcase(showcase);

function initServices(root) {
  const rows = [...root.querySelectorAll('.svc-row')];
  const spots = [...root.querySelectorAll('.svc-spot')];
  const keys = rows.map(r => r.dataset.svc);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  // Lock panel height to the tallest description so total height never changes on selection.
  const measure = () => {
    let max = 0;
    for (const row of rows) max = Math.max(max, row.querySelector('.svc-panel-inner').scrollHeight);
    root.style.setProperty('--panel-h', max + 'px');
  };
  const select = (key, focusTrigger) => {
    root.dataset.active = key;
    rows.forEach(row => {
      const on = row.dataset.svc === key;
      if (on) row.dataset.selected = 'true'; else delete row.dataset.selected;
      row.querySelector('.svc-trigger').setAttribute('aria-expanded', String(on));
    });
    spots.forEach(spot => spot.setAttribute('aria-pressed', String(spot.dataset.svc === key)));
    if (focusTrigger) root.querySelector(`#svc-t-${key}`).focus({ preventScroll: true });
  };
  measure();
  root.dataset.enhanced = '';
  addEventListener('resize', measure);
  document.fonts?.ready.then(measure);
  rows.forEach(row => row.querySelector('.svc-trigger').addEventListener('click', () => select(row.dataset.svc)));
  spots.forEach(spot => spot.addEventListener('click', () => select(spot.dataset.svc)));
  root.querySelector('.svc-rows').addEventListener('keydown', event => {
    const i = keys.indexOf(event.target.closest('.svc-row')?.dataset.svc);
    if (i < 0 || !event.target.matches('.svc-trigger')) return;
    const next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: keys.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    root.querySelector(`#svc-t-${keys[(next + keys.length) % keys.length]}`).focus({ preventScroll: true });
  });
  select(keys[0]);
}
const services = document.querySelector('[data-services]');
if (services) initServices(services);

function initWires(root) {
  const grid = root.querySelector('.svc-grid');
  const svg = grid.querySelector('.svc-wires');
  const NS = 'http://www.w3.org/2000/svg';
  const make = (tag, cls, parent) => { const el = document.createElementNS(NS, tag); if (cls) el.setAttribute('class', cls); parent.append(el); return el; };
  const wires = [...root.querySelectorAll('.svc-row')].map((row, i) => {
    const g = make('g', 'svc-wire', svg);
    const base = make('path', 'svc-wire-base', g);
    const live = make('path', 'svc-wire-live', g); live.setAttribute('pathLength', '1');
    const flow = make('path', 'svc-wire-flow', g); flow.setAttribute('pathLength', '1');
    const e1 = make('circle', 'svc-end', g), e2 = make('circle', 'svc-end', g);
    [e1, e2].forEach(e => e.setAttribute('r', '5'));
    return { key: row.dataset.svc, row, g, paths: [base, live, flow], e1, e2, i };
  });
  const rounded = (pts, r) => {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let k = 1; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
      const rr = Math.min(r, l1 / 2, l2 / 2);
      if (rr < 1) { d += `L${x1} ${y1}`; continue; }
      d += `L${x1 - (x1 - x0) / l1 * rr} ${y1 - (y1 - y0) / l1 * rr}Q${x1} ${y1} ${x1 + (x2 - x1) / l2 * rr} ${y1 + (y2 - y1) / l2 * rr}`;
    }
    const last = pts[pts.length - 1];
    return d + `L${last[0]} ${last[1]}`;
  };
  const layout = () => {
    const gb = grid.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${gb.width} ${gb.height}`);
    const stacked = innerWidth <= 880;
    const items = wires.map(w => {
      const t = w.row.querySelector('.svc-trigger').getBoundingClientRect();
      const s = root.querySelector(`.svc-spot[data-svc="${w.key}"]`).getBoundingClientRect();
      return { w, sx: t.left - gb.left, sy: t.top + 32 - gb.top, ex: s.left + s.width / 2 - gb.left, ey: s.top + s.height / 2 - gb.top };
    });
    // lane order: keep verticals from crossing where possible
    const sorted = [...items].sort((a, b) => stacked ? b.ey - a.ey : a.ey - b.ey);
    const art = root.querySelector('.svc-art').getBoundingClientRect();
    const laneBase = stacked ? 6 : (art.right - gb.left) + Math.max(8, (root.querySelector('.svc-rows').getBoundingClientRect().left - art.right) / 2 - sorted.length * 4);
    sorted.forEach((it, n) => { it.lane = stacked ? laneBase + n * 7 : laneBase + n * 8; });
    for (const it of items) {
      const pts = [[it.sx, it.sy], [it.lane, it.sy], [it.lane, it.ey], [it.ex, it.ey]];
      const d = rounded(pts, 10);
      it.w.paths.forEach(p => p.setAttribute('d', d));
      it.w.e1.setAttribute('cx', it.sx); it.w.e1.setAttribute('cy', it.sy);
      it.w.e2.setAttribute('cx', it.ex); it.w.e2.setAttribute('cy', it.ey);
    }
  };
  const sync = () => wires.forEach(w => w.g.classList.toggle('is-on', w.row.dataset.selected === 'true'));
  let raf = 0;
  const settle = () => { cancelAnimationFrame(raf); const t0 = performance.now(); const tick = () => { layout(); if (performance.now() - t0 < 520) raf = requestAnimationFrame(tick); }; tick(); };
  new MutationObserver(() => { sync(); settle(); }).observe(root.querySelector('.svc-rows'), { subtree: true, attributes: true, attributeFilter: ['data-selected'] });
  addEventListener('resize', settle);
  document.fonts?.ready.then(settle);
  layout(); sync();
}
if (services) initWires(services);

// Hero tagline highlighter + KPI count-up
const heroHeading = document.querySelector('.hero-heading');
if (heroHeading) {
  const runHl = () => { heroHeading.classList.remove('hl-run'); void heroHeading.offsetWidth; heroHeading.classList.add('hl-run'); };
  setTimeout(runHl, 500);
  document.querySelector('.light-switch')?.addEventListener('click', () => setTimeout(runHl, 250));
}
const kpis = document.querySelector('[data-kpis]');
if (kpis) {
  const nums = [...kpis.querySelectorAll('[data-count]')];
  nums.forEach(el => { if (el.dataset.since) el.dataset.count = new Date().getFullYear() - +el.dataset.since; });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = (el, v) => { el.querySelector('[aria-hidden]').textContent = v + el.dataset.suffix; };
  if (reduced) nums.forEach(el => show(el, el.dataset.count));
  else {
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        const el = entry.target, end = +el.dataset.count, t0 = performance.now(), dur = 1500 + end * 12;
        const step = now => {
          const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
          show(el, Math.round(end * e));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.6 });
    nums.forEach(el => io.observe(el));
  }
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
