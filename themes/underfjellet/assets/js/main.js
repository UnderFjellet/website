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
      scrollTrigger: {
        trigger: '.features-strip',
        start: 'top 82%',
      }
    });
  }
});
