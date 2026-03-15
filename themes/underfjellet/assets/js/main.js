// ── Reviews carousel + optional Google Places fetch ──────────
(function () {
  // ── Carousel engine ──────────────────────────────────────
  const track  = document.getElementById('reviews-track');
  const dotsEl = document.getElementById('reviews-dots');
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');
  if (!track) return;

  let current = 0;
  let autoTimer;

  function getCards()  { return Array.from(track.querySelectorAll('.review-card')); }
  function getDots()   { return dotsEl ? Array.from(dotsEl.querySelectorAll('.dot')) : []; }

  function showCard(idx) {
    const cards = getCards();
    const dots  = getDots();
    if (!cards.length) return;
    idx = ((idx % cards.length) + cards.length) % cards.length;
    cards.forEach((c, i) => c.classList.toggle('active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    if (prevBtn) prevBtn.disabled = cards.length <= 1;
    if (nextBtn) nextBtn.disabled = cards.length <= 1;
    current = idx;
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => showCard(current + 1), 6000);
  }
  function stopAuto() { clearInterval(autoTimer); }

  if (prevBtn) prevBtn.addEventListener('click', () => { stopAuto(); showCard(current - 1); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { stopAuto(); showCard(current + 1); startAuto(); });
  if (dotsEl)  dotsEl.addEventListener('click', (e) => {
    const dot = e.target.closest('.dot');
    if (dot) { stopAuto(); showCard(parseInt(dot.dataset.index, 10)); startAuto(); }
  });

  // Pause on hover
  if (track) {
    track.addEventListener('mouseenter', stopAuto);
    track.addEventListener('mouseleave', startAuto);
  }

  // Touch swipe
  let touchX = null;
  track.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const diff = touchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { stopAuto(); showCard(diff > 0 ? current + 1 : current - 1); startAuto(); }
    touchX = null;
  });

  showCard(0);
  if (getCards().length > 1) startAuto();

  // ── Google Places API (New) fetch ────────────────────────
  // Activated when window.GOOGLE_PLACES_CONFIG is defined (set via config.toml params)
  const cfg = window.GOOGLE_PLACES_CONFIG;
  if (!cfg || !cfg.placeId || !cfg.apiKey) return;

  fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(cfg.placeId)}` +
    `?fields=reviews,rating,userRatingCount&languageCode=nb&key=${encodeURIComponent(cfg.apiKey)}`
  )
  .then(r => r.ok ? r.json() : Promise.reject(r.status))
  .then(data => {
    const reviews = (data.reviews || []).filter(r => r.rating >= 4);
    if (!reviews.length) return;

    // Replace static cards with fetched ones
    track.innerHTML = '';
    if (dotsEl) dotsEl.innerHTML = '';

    reviews.forEach((r, i) => {
      const text = (r.text && r.text.text) || (r.originalText && r.originalText.text) || '';
      const author = r.authorAttribution ? r.authorAttribution.displayName : 'Google-bruker';
      const ago = r.relativePublishTimeDescription || '';
      const stars = r.rating;

      const card = document.createElement('div');
      card.className = 'review-card' + (i === 0 ? ' active' : '');
      card.dataset.index = i;
      card.innerHTML = `
        <div class="review-stars">${'<svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>'.repeat(Math.round(stars))}</div>
        <blockquote class="review-text"><p>${text}</p></blockquote>
        <div class="review-author">— ${author}</div>
        ${ago ? `<div class="review-time">${ago}</div>` : ''}
      `;
      track.appendChild(card);

      if (dotsEl) {
        const dot = document.createElement('button');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.dataset.index = i;
        dot.setAttribute('aria-label', `Anmeldelse ${i + 1}`);
        dotsEl.appendChild(dot);
      }
    });

    // Update aggregate rating display
    const aggEl = document.getElementById('reviews-aggregate');
    if (aggEl && data.rating) {
      const stars = '★'.repeat(Math.round(data.rating));
      const count = data.userRatingCount ? `(${data.userRatingCount} anmeldelser)` : '';
      aggEl.innerHTML = `<span class="agg-stars">${stars}</span><span>${data.rating.toFixed(1)}</span><span class="agg-count">${count}</span>`;
    }

    current = 0;
    if (reviews.length > 1) { stopAuto(); startAuto(); }
  })
  .catch(() => { /* silently fall back to static reviews */ });
})();

// ── Booking drawer ───────────────────────────────────────────
(function () {
  const drawer   = document.getElementById('booking-drawer');
  if (!drawer) return;

  const panel    = drawer.querySelector('.booking-panel');
  const backdrop = document.getElementById('booking-backdrop');
  const closeBtn = document.getElementById('booking-close');

  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('booking-open');
    closeBtn.focus();
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('booking-open');
  }

  // Intercept every booking link — except the "Åpne bestillingsside" button
  // inside the drawer itself (that one should open the real page)
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href*="provet.com"], a[href*="onlinebooking"]');
    if (!link) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return; // let ctrl/cmd+click open new tab
    if (link.closest('.booking-panel')) return;        // let drawer's own CTA through
    e.preventDefault();
    openDrawer();
  });

  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });

  // Focus trap
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    const focusable = panel.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
})();

// ── Sticky header ────────────────────────────────────────────
const header = document.getElementById('site-header');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
}

// ── Mobile nav ───────────────────────────────────────────────
const hamburger  = document.getElementById('hamburger');
const mobileNav  = document.getElementById('mobile-nav');
const closeBtn   = document.getElementById('mobile-nav-close');

function openNav() {
  hamburger.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
  mobileNav.classList.add('open');
  mobileNav.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeNav() {
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  mobileNav.classList.remove('open');
  mobileNav.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

if (hamburger) hamburger.addEventListener('click', openNav);
if (closeBtn)  closeBtn.addEventListener('click', closeNav);
if (mobileNav) {
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
}

// ── Scroll-triggered fade-ups (IntersectionObserver) ─────────
const fadeEls = document.querySelectorAll('.fade-up');
if (fadeEls.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || '0', 10);
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  fadeEls.forEach(el => observer.observe(el));
}

// ── GSAP hero parallax (progressive enhancement) ─────────────
window.addEventListener('load', () => {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Hero content drifts up and fades slightly on scroll
  gsap.to('.hero-content', {
    y: -55,
    opacity: 0.25,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.8,
    }
  });

  // Illustration drifts up at a different rate (parallax depth)
  gsap.to('.hero-illustration', {
    y: -35,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.2,
    }
  });

  // Background blob moves slightly slower than content
  gsap.to('.hero::before', {
    y: -20,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 2,
    }
  });

  // Feature cards stagger in
  const cards = gsap.utils.toArray('.feature-card');
  if (cards.length) {
    gsap.from(cards, {
      y: 45,
      opacity: 0,
      duration: 0.65,
      stagger: 0.14,
      ease: 'power2.out',
      clearProps: 'all',
      scrollTrigger: {
        trigger: '.features-strip',
        start: 'top 82%',
      }
    });
  }
});
