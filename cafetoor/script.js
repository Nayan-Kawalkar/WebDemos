/* ──────────────────────────────────────────────────────────
   Cafetoor — interaction & motion
   Stack: GSAP 3 + ScrollTrigger (animation), Lenis (smooth scroll).
   Everything degrades: no JS → static page; reduced motion → no
   smooth scroll, no scrubbing; libraries fail → page shown as-is.
   ────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motion = hasGSAP && !reduceMotion;
  let lenis = null;

  if (!motion) {
    clearTimeout(window.__motionFallback);
    root.classList.remove('has-motion');
  }

  /* ───────── Small helpers ───────── */
  const plainText = (el) => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    return clone.textContent.replace(/\s+/g, ' ').trim();
  };

  // Smooth-scroll to an element (or 0 for the top), honouring its CSS scroll-margin-top.
  const scrollToEl = (target, extra = 0) => {
    const margin = target === 0 ? 0 : (parseFloat(getComputedStyle(target).scrollMarginTop) || 0) + extra;
    if (lenis) {
      lenis.scrollTo(target, { offset: -margin, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - margin;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  // Split an element's words into spans, keeping <em>/<br>, with an
  // unsplit copy for screen readers and the split copy aria-hidden.
  function splitWords(el, { mask = true } = {}) {
    if (el.dataset.splitDone) return $$(mask ? '.w__i' : '.sw', el);
    const label = plainText(el);
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    const words = [];

    const walk = (from, to) => {
      from.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (!part.trim()) { to.append(' '); return; }
            if (mask) {
              const m = document.createElement('span');
              const i = document.createElement('span');
              m.className = 'w';
              i.className = 'w__i';
              i.textContent = part;
              m.append(i);
              to.append(m);
              words.push(i);
            } else {
              const s = document.createElement('span');
              s.className = 'sw';
              s.textContent = part;
              to.append(s);
              words.push(s);
            }
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'BR') { to.append(document.createElement('br')); return; }
          const shell = node.cloneNode(false);
          to.append(shell);
          walk(node, shell);
        }
      });
    };

    walk(el, visual);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = label;
    el.replaceChildren(sr, visual);
    el.dataset.splitDone = '1';
    return words;
  }

  /* ───────── Button rolling labels ───────── */
  $$('.btn__txt').forEach((t) => {
    const roll = document.createElement('span');
    roll.className = 'btn__roll';
    roll.dataset.text = t.dataset.text || t.textContent.trim();
    roll.textContent = t.textContent.trim();
    t.removeAttribute('data-text');
    t.replaceChildren(roll);
  });

  /* ───────── Menu board (from menu.js) — before any scroll measuring ───────── */
  const menu = initMenu();

  /* ───────── Smooth scroll ───────── */
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out', duration: 0.9 });
    root.classList.add('motion-on');

    if (typeof window.Lenis === 'function') {
      lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ───────── Nav: transparent on hero → solid; hides on scroll down ───────── */
  const nav = $('#nav');
  const hero = $('#top');
  let lastY = window.scrollY;
  let drawerOpen = false;

  const setNavHidden = (hidden) => {
    nav.classList.toggle('is-hidden', hidden);
    root.classList.toggle('nav-up', hidden); // sticky bars move up into the free space
  };
  const updateNav = () => {
    const y = window.scrollY;
    const heroH = hero.offsetHeight;
    nav.classList.toggle('is-solid', y > heroH - nav.offsetHeight);
    if (!drawerOpen) {
      if (y > heroH * 0.9 && y > lastY + 4) setNavHidden(true);
      else if (y < lastY - 4 || y < heroH * 0.9) setNavHidden(false);
    }
    lastY = y;
  };
  let navTick = false;
  window.addEventListener('scroll', () => {
    if (navTick) return;
    navTick = true;
    requestAnimationFrame(() => { navTick = false; updateNav(); });
  }, { passive: true });
  window.addEventListener('resize', updateNav);
  nav.addEventListener('focusin', () => setNavHidden(false));
  updateNav();

  /* Current section in the nav */
  const navLinks = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${entry.target.id}`)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean).forEach((s) => spy.observe(s));
  }

  /* ───────── Mobile drawer ───────── */
  const burger = $('.burger');
  const drawer = $('#drawer');

  const setDrawer = (open) => {
    if (open === drawerOpen) return;
    drawerOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('is-open', open);
    if (open) {
      setNavHidden(false);
      drawer.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
      if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
      setTimeout(() => { const first = $('a', drawer); if (first && drawerOpen) first.focus({ preventScroll: true }); }, 280);
    } else {
      drawer.classList.remove('is-open');
      if (lenis) lenis.start(); else document.body.style.overflow = '';
      setTimeout(() => { if (!drawerOpen) drawer.hidden = true; }, reduceMotion ? 0 : 700);
    }
  };

  burger.addEventListener('click', () => setDrawer(!drawerOpen));
  document.addEventListener('keydown', (e) => {
    if (!drawerOpen) return;
    if (e.key === 'Escape') { setDrawer(false); burger.focus(); return; }
    if (e.key !== 'Tab') return;
    // keep focus inside the open menu
    const focusables = [...$$('a, button', nav), ...$$('a', drawer)].filter((el) => el.offsetParent !== null);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', (e) => { if (e.matches) setDrawer(false); });

  /* ───────── In-page links (smooth with Lenis) ───────── */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    const target = hash === '#top' ? 0 : document.querySelector(hash);
    if (target === null) return;
    e.preventDefault();
    if (drawerOpen) setDrawer(false);
    if (menu && a.closest('.dv')) menu.closeView({ instant: true });
    scrollToEl(target);
    if (target !== 0) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });

  /* ───────── Hero film ───────── */
  const video = $('#heroVideo');
  if (video) {
    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
    } else {
      const play = () => video.play().catch(() => { /* autoplay blocked: poster stays */ });
      play();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : video.pause()), { threshold: 0.02 }).observe(video);
      }
    }
  }

  /* ───────── Room gallery progress (works for pinned and native swipe) ───────── */
  const room = $('#room');
  const track = $('.room__track');
  const viewport = $('.room__viewport');
  const slides = $$('.slide', track);
  const roomBar = $('.room__bar i');
  const roomIndex = $('.room__index');
  const setRoomProgress = (p) => {
    roomBar.style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`;
    const i = Math.min(slides.length - 1, Math.round(p * (slides.length - 1)));
    roomIndex.textContent = String(i + 1).padStart(2, '0');
  };
  viewport.addEventListener('scroll', () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    if (max > 0) setRoomProgress(viewport.scrollLeft / max);
  }, { passive: true });

  /* ───────── Ritual steps: active step swaps the sticky image ───────── */
  const steps = $$('.step');
  const frames = $$('.ritual__frames img');
  const setStep = (i) => {
    if (i < 0) return;
    steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
    frames.forEach((f, n) => f.classList.toggle('is-active', n === i));
  };
  if ('IntersectionObserver' in window) {
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setStep(steps.indexOf(entry.target)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => stepIO.observe(s));
  }

  /* ───────── Footer year ───────── */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ═════════ Motion (GSAP) ═════════ */
  if (!motion) return;

  try {
    heroIntro();
  } finally {
    clearTimeout(window.__motionFallback);
    root.classList.remove('has-motion');
  }

  // 1 — pinned gallery first, so everything below measures with its spacing.
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    room.classList.add('is-pinned');
    const dist = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

    const travel = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: room,
        start: 'top top',
        end: () => `+=${dist()}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => setRoomProgress(self.progress),
      },
    });

    // each photo drifts inside its frame as it crosses the screen
    slides.forEach((slide) => {
      gsap.fromTo($('img', slide), { xPercent: -6 }, {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: slide, containerAnimation: travel, start: 'left right', end: 'right left', scrub: true },
      });
    });

    return () => room.classList.remove('is-pinned');
  });

  // 2 — hero leaves with depth
  gsap.to('.hero__media', {
    yPercent: 14,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__inner', {
    yPercent: -12,
    opacity: 0.1,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });

  // 3 — reading progress
  gsap.to('.progress__bar', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });

  // 4 — marquee that speeds up and reverses with the scroll
  initMarquee();

  // 5 — headings rise word by word
  $$('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { yPercent: 118 }, {
      yPercent: 0,
      duration: 1.25,
      ease: 'power4.out',
      stagger: 0.065,
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
    });
  });

  // 6 — the House statement lights up word by word as you read
  $$('[data-scrub-words]').forEach((el) => {
    const words = splitWords(el, { mask: false });
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1,
      ease: 'none',
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 1 },
    });
  });

  // 7 — simple reveals and staggered groups
  $$('[data-reveal]').forEach((el) => {
    gsap.fromTo(el, { y: 30, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  $$('[data-reveal-group]').forEach((group) => {
    gsap.fromTo($$('[data-reveal-item]', group), { y: 36, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: group, start: 'top 86%', once: true },
    });
  });

  // 8 — photos open like a curtain, then drift with parallax
  $$('[data-image-reveal]').forEach((fig) => {
    const img = $('img', fig);
    gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 86%', once: true } })
      .fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out' })
      .fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.9, ease: 'expo.out' }, 0);
  });
  $$('[data-parallax]').forEach((img) => {
    const amount = parseFloat(img.dataset.parallax) || 7;
    gsap.fromTo(img, { yPercent: -amount }, {
      yPercent: amount,
      ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
    });
  });

  // 9 — full-bleed band: framed card opens to the edges as it arrives
  gsap.timeline({ scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'top top', scrub: 1 } })
    .fromTo('.band__frame', { clipPath: 'inset(12% 9% 12% 9% round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
    .fromTo('.band__img', { scale: 1.32 }, { scale: 1.02, ease: 'none' }, 0);

  // 10 — menu board: banners wipe open, dotted leaders run out to each price
  if (menu) menu.setupMotion();

  // 11 — “Squeeze the day.” fills in, line by line, as it crosses the screen
  $$('.fill-line').forEach((line, i) => {
    gsap.fromTo(line, { backgroundPosition: '100% 0%' }, {
      backgroundPosition: '0% 0%',
      ease: 'none',
      scrollTrigger: { trigger: '.statement', start: `top ${78 - i * 8}%`, end: `center ${52 - i * 8}%`, scrub: 1 },
    });
  });
  gsap.fromTo('.statement__bg', { yPercent: -7 }, {
    yPercent: 7,
    ease: 'none',
    scrollTrigger: { trigger: '.statement', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // 12 — ritual progress line
  gsap.fromTo('.ritual__line i', { scaleY: 0 }, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.ritual__steps', start: 'top 55%', end: 'bottom 55%', scrub: 0.6 },
  });

  // 13 — the footer wordmark rises letter by letter
  gsap.fromTo('.footer__mark i', { yPercent: 105 }, {
    yPercent: 0,
    duration: 1.3,
    ease: 'power4.out',
    stagger: 0.06,
    scrollTrigger: { trigger: '.footer__mark', start: 'top 95%', once: true },
  });

  // 14 — magnetic buttons and a little depth on the hero film (mouse only)
  if (finePointer) {
    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.22);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    const media = $('.hero__media');
    const mx = gsap.quickTo(media, 'x', { duration: 1.2, ease: 'power3.out' });
    const my = gsap.quickTo(media, 'y', { duration: 1.2, ease: 'power3.out' });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      mx(((e.clientX - r.left) / r.width - 0.5) * -28);
      my(((e.clientY - r.top) / r.height - 0.5) * -20);
    });
    const settle = () => { mx(0); my(0); };
    hero.addEventListener('pointerleave', settle);
    window.addEventListener('blur', settle);
  }

  // Re-measure once fonts and images have settled.
  const refresh = () => { ScrollTrigger.refresh(); if (menu) menu.relayout(); };
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  /* ═════════ Pieces ═════════ */

  function heroIntro() {
    const frame = $('.hero__frame');
    const title = $('[data-hero-title]');
    const items = $$('[data-hero-item]');
    const rule = $('.hero__rule');
    const words = splitWords(title);

    gsap.set(words, { yPercent: 118 });
    gsap.set(items, { autoAlpha: 0, y: 26 });
    gsap.set(rule, { scaleX: 0 });
    gsap.set(title, { visibility: 'visible' });

    gsap.timeline({ delay: 0.15 })
      .fromTo(frame, { clipPath: 'inset(16% 22% 16% 22% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.9, ease: 'expo.inOut' }, 0)
      .fromTo(video, { scale: 1.32 }, { scale: 1, duration: 2.4, ease: 'expo.inOut' }, 0)
      .to(words, { yPercent: 0, duration: 1.3, stagger: 0.07, ease: 'power4.out' }, 0.95)
      .to(rule, { scaleX: 1, duration: 1.5, ease: 'expo.inOut' }, 1.1)
      .to(items, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out' }, 1.3);
  }

  function initMarquee() {
    const strip = $('.marquee__track');
    if (!strip) return;
    strip.classList.add('is-js');
    const loop = gsap.to(strip, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    loop.totalTime(loop.duration() * 100); // room to run backwards
    let dir = 1;
    let boost = 0;
    let visible = true;

    ScrollTrigger.create({
      trigger: '.marquee',
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => { visible = self.isActive; if (visible) loop.resume(); else loop.pause(); },
    });
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        dir = self.direction || dir;
        boost = Math.min(Math.abs(self.getVelocity()) / 220, 7);
      },
    });
    gsap.ticker.add(() => {
      if (!visible) return;
      boost *= 0.93;
      loop.reversed(dir < 0);
      loop.timeScale(1 + boost);
    });
  }

  /* ───────── The menu board ───────── */
  function initMenu() {
    const board = $('#menuBoard');
    if (!board || typeof MENU === 'undefined' || !Array.isArray(MENU)) return null;

    const list = $('#menuList');
    const catsNav = $('#menuCats');
    const chipsEl = $('#menuChips');
    const search = $('#menuSearch');
    const clearBtn = $('.search__clear', board);
    const countEl = $('#menuCount');
    const emptyEl = $('#menuEmpty');
    const legendEl = $('#menuLegend');
    const ink = $('.cats__ink', catsNav);

    const DIET = { veg: ['Vegetarian', 'Veg'], egg: ['Contains egg', 'Egg'], nonveg: ['Non-vegetarian', 'Non-veg'] };
    const TAG_ORDER = ['signature', 'guest favorite', 'new', 'classic'];
    const currency = typeof CURRENCY === 'string' ? CURRENCY : '';
    const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const fmt = (p) => (p == null || p === '' || Number.isNaN(Number(p)) ? null
      : `${currency}${Number.isInteger(Number(p)) ? Number(p) : Number(p).toFixed(2)}`);
    const el = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    };
    const srText = (text) => el('span', 'sr-only', text);
    const mark = (diet) => {
      const m = el('span', `mark mark--${diet}`);
      m.setAttribute('role', 'img');
      m.setAttribute('aria-label', DIET[diet][0]);
      m.title = DIET[diet][0];
      return m;
    };

    const state = { q: '', tag: 'all', veg: false };
    const cats = [];
    let activeIndex = 0;

    // dish photos: thumbnails live in assets/menu/thumbs/ (falls back to the big photo)
    const hasThumbs = MENU.some((c) => c.items.some((i) => i.image));
    if (!hasThumbs) board.classList.add('no-thumbs');
    const thumbFor = (src) => String(src).replace(/(assets\/menu\/)([^/]+)$/, '$1thumbs/$2');
    const priceOf = (item, columns, col) => {
      const p = item.price;
      if (p && typeof p === 'object') return columns ? p[col] : Object.values(p)[0];
      return !columns || col === columns[0] ? p : null;
    };

    /* build every category */
    MENU.forEach((cat, ci) => {
      const columns = Array.isArray(cat.columns) && cat.columns.length ? cat.columns : null;
      const num = String(ci + 1).padStart(2, '0');

      const section = el('section', 'cat');
      section.id = `menu-${cat.id}`;
      section.setAttribute('aria-labelledby', `menu-${cat.id}-title`);

      const banner = el('div', cat.image ? 'cat__banner' : 'cat__banner cat__banner--plain');
      let bannerImg = null;
      if (cat.image) {
        bannerImg = el('img');
        bannerImg.src = cat.image;
        bannerImg.alt = '';
        bannerImg.loading = 'lazy';
        bannerImg.decoding = 'async';
        if (cat.focus) bannerImg.style.objectPosition = cat.focus;
        banner.append(bannerImg);
      }
      const head = el('div', 'cat__head');
      const numEl = el('span', 'cat__num', num);
      numEl.setAttribute('aria-hidden', 'true');
      const titles = el('div', 'cat__titles');
      const h = el('h3', 'cat__title', cat.label);
      h.id = `menu-${cat.id}-title`;
      titles.append(h);
      if (cat.note) titles.append(el('p', 'cat__note', cat.note));
      head.append(numEl, titles);
      banner.append(head);
      section.append(banner);

      let colsRow = null;
      if (columns) {
        colsRow = el('div', 'cat__cols');
        colsRow.setAttribute('aria-hidden', 'true');
        colsRow.style.setProperty('--cols', columns.length);
        colsRow.append(el('span'), el('span')); // photo + name columns
        columns.forEach((c) => colsRow.append(el('span', '', c)));
        section.append(colsRow);
      }

      const ul = el('ul', 'items');
      const items = cat.items.map((item) => {
        const li = el('li', 'item');
        li.style.setProperty('--cols', columns ? columns.length : 1);
        const entry = { data: item, node: li, cat, catNum: num, columns, thumbImg: null, hay: '' };

        if (hasThumbs) {
          const th = el('div', item.image ? 'item__thumb' : 'item__thumb item__thumb--empty');
          th.setAttribute('aria-hidden', 'true');
          if (item.image) {
            const img = el('img');
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.addEventListener('error', () => { img.src = item.image; }, { once: true });
            img.src = item.thumb || thumbFor(item.image);
            th.append(img);
            entry.thumbImg = img;
          }
          li.append(th);
        }

        const main = el('div', 'item__main');
        const line = el('div', 'item__line');
        if (item.diet && DIET[item.diet]) line.append(mark(item.diet));
        line.append(el('h4', 'item__name', item.name));
        const leader = el('span', 'item__leader');
        leader.setAttribute('aria-hidden', 'true');
        line.append(leader);
        main.append(line);
        if (item.desc) main.append(el('p', 'item__desc', item.desc));
        li.append(main);

        const prices = el('div', 'item__prices');
        if (columns) {
          columns.forEach((c) => {
            const value = fmt(priceOf(item, columns, c));
            const p = el('span', value ? 'item__price' : 'item__price item__price--na');
            p.dataset.col = c; // shown beside the price on phones
            p.append(srText(`${c}: `));
            if (value) {
              p.append(document.createTextNode(value));
            } else {
              const dash = el('span', '', '—');
              dash.setAttribute('aria-hidden', 'true');
              p.append(dash, srText('not available'));
            }
            prices.append(p);
          });
        } else {
          prices.append(el('span', 'item__price', fmt(priceOf(item, null)) || ''));
        }
        li.append(prices);

        if (item.tags && item.tags.length) {
          const tags = el('div', 'item__tags');
          item.tags.forEach((t) => tags.append(el('span', `item__tag${norm(t) === 'signature' ? ' item__tag--solid' : ''}`, t)));
          li.append(tags);
        }

        // the whole row opens the dish view
        const opener = el('button', 'item__open');
        opener.type = 'button';
        opener.setAttribute('aria-label', `${item.name}: see photo and details`);
        opener.addEventListener('click', () => view.open(entry, opener));
        li.append(opener);

        ul.append(li);
        entry.hay = norm([item.name, item.desc, (item.tags || []).join(' '), cat.label, cat.note].join(' '));
        return entry;
      });
      section.append(ul);
      list.append(section);

      const link = el('a');
      link.href = `#menu-${cat.id}`;
      const n = el('span', 'n', num);
      n.setAttribute('aria-hidden', 'true');
      const count = el('span', 'c', String(items.length));
      count.setAttribute('aria-hidden', 'true');
      link.append(n, el('span', 't', cat.label), count);
      link.setAttribute('aria-label', `${cat.label}, ${items.length} items`);
      catsNav.append(link);

      cats.push({ cat, section, banner, bannerImg, head, colsRow, link, count, items });
    });

    /* filter chips: “All”, every tag in use, and Veg only (if the menu has mixed marks) */
    const tagSet = new Map();
    MENU.forEach((c) => c.items.forEach((i) => (i.tags || []).forEach((t) => tagSet.set(norm(t), t))));
    const rank = (k) => { const i = TAG_ORDER.indexOf(k); return i === -1 ? 99 : i; };
    const tagKeys = [...tagSet.keys()].sort((a, b) => rank(a) - rank(b));
    const diets = new Set();
    MENU.forEach((c) => c.items.forEach((i) => { if (i.diet && DIET[i.diet]) diets.add(i.diet); }));
    const chipButtons = [];

    const makeChip = (label, pressed, onClick, withMark) => {
      const b = el('button', 'chip');
      b.type = 'button';
      if (withMark) b.append(mark('veg'));
      b.append(document.createTextNode(label));
      b.setAttribute('aria-pressed', String(pressed));
      b.addEventListener('click', onClick);
      chipsEl.append(b);
      return b;
    };
    if (tagKeys.length) {
      [['all', 'All'], ...tagKeys.map((k) => [k, tagSet.get(k)])].forEach(([key, label]) => {
        const b = makeChip(label, key === state.tag, () => {
          state.tag = key;
          chipButtons.forEach((x) => x.btn.setAttribute('aria-pressed', String(x.key === key)));
          apply();
        });
        chipButtons.push({ key, btn: b });
      });
    }
    let vegChip = null;
    if (diets.has('veg') && diets.size > 1) {
      vegChip = makeChip('Veg only', false, () => {
        state.veg = !state.veg;
        vegChip.setAttribute('aria-pressed', String(state.veg));
        apply();
      }, true);
    }

    /* legend + note */
    ['veg', 'egg', 'nonveg'].filter((d) => diets.has(d)).forEach((d) => {
      const li = el('li');
      li.append(mark(d), document.createTextNode(DIET[d][1]));
      legendEl.append(li);
    });
    const noteEl = $('#menuNote');
    if (noteEl) {
      if (typeof MENU_NOTE === 'string' && MENU_NOTE) noteEl.textContent = MENU_NOTE;
      else noteEl.remove();
    }

    /* active category: ink on desktop, scrolling chip bar on mobile */
    const placeInk = () => {
      const link = cats[activeIndex] && cats[activeIndex].link;
      if (!link || !ink) return;
      ink.style.height = `${link.offsetHeight}px`;
      ink.style.transform = `translateY(${link.offsetTop}px)`;
    };
    const setActive = (i) => {
      if (i < 0 || !cats[i]) return;
      activeIndex = i;
      cats.forEach((c, n) => c.link.setAttribute('aria-current', String(n === i)));
      placeInk();
      if (catsNav.scrollWidth > catsNav.clientWidth + 2) {
        const pad = parseFloat(getComputedStyle(catsNav).paddingLeft) || 0;
        catsNav.scrollTo({ left: cats[i].link.offsetLeft - pad, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    };
    if ('IntersectionObserver' in window) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(cats.findIndex((c) => c.section === entry.target));
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      cats.forEach((c) => spy.observe(c.section));
    }

    /* filtering */
    let motionReady = false;
    let refreshTimer = 0;
    const reveals = [];
    const total = cats.reduce((n, c) => n + c.items.length, 0);

    const revealAll = () => {
      reveals.splice(0).forEach((tl) => { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.progress(1); });
    };

    const bringIntoView = () => {
      if (board.getBoundingClientRect().top < 0) scrollToEl(board, 16 + nav.offsetHeight);
    };

    function apply() {
      const terms = norm(state.q.trim()).split(/\s+/).filter(Boolean);
      let shown = 0;
      cats.forEach((c) => {
        let n = 0;
        c.items.forEach((it) => {
          const ok = terms.every((t) => it.hay.includes(t))
            && (state.tag === 'all' || (it.data.tags || []).some((t) => norm(t) === state.tag))
            && (!state.veg || it.data.diet === 'veg');
          it.node.hidden = !ok;
          if (ok) n += 1;
        });
        c.section.hidden = n === 0;
        c.count.textContent = String(n);
        c.link.classList.toggle('is-empty', n === 0);
        c.link.tabIndex = n === 0 ? -1 : 0;
        c.link.setAttribute('aria-label', `${c.cat.label}, ${n} item${n === 1 ? '' : 's'}`);
        shown += n;
      });

      countEl.textContent = shown === total
        ? `${total} dishes & drinks`
        : `${shown} of ${total} dishes & drinks`;
      emptyEl.hidden = shown !== 0;
      list.hidden = shown === 0;
      clearBtn.hidden = !state.q;

      if (cats[activeIndex] && cats[activeIndex].section.hidden) {
        setActive(cats.findIndex((c) => !c.section.hidden));
      }
      requestAnimationFrame(placeInk);

      if (motionReady) {
        revealAll();
        const vh = window.innerHeight;
        const rows = cats.flatMap((c) => c.items).map((it) => it.node)
          .filter((node) => !node.hidden)
          .filter((node) => { const r = node.getBoundingClientRect(); return r.bottom > 0 && r.top < vh * 1.2; });
        gsap.fromTo(rows, { autoAlpha: 0, y: 12 }, {
          autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.03, ease: 'power2.out', overwrite: true,
          clearProps: 'transform,opacity,visibility',
        });
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
      }
    }

    search.addEventListener('input', () => { state.q = search.value; apply(); bringIntoView(); });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && search.value) { e.preventDefault(); search.value = ''; state.q = ''; apply(); }
      if (e.key === 'Enter') search.blur();
    });
    clearBtn.addEventListener('click', () => { search.value = ''; state.q = ''; apply(); search.focus(); });
    chipsEl.addEventListener('click', (e) => { if (e.target.closest('.chip')) bringIntoView(); });
    $('#menuReset').addEventListener('click', () => {
      search.value = '';
      Object.assign(state, { q: '', tag: 'all', veg: false });
      chipButtons.forEach((x) => x.btn.setAttribute('aria-pressed', String(x.key === 'all')));
      if (vegChip) vegChip.setAttribute('aria-pressed', 'false');
      apply();
      search.focus();
    });
    $('#menuPrint').addEventListener('click', () => window.print());
    window.addEventListener('resize', placeInk);

    apply();
    setActive(0);
    const view = createDishView();

    /* motion: banners wipe open; each dotted leader runs out to its price */
    const setupMotion = () => {
      gsap.fromTo(board, { y: 70, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 1.3, ease: 'expo.out', clearProps: 'transform',
        scrollTrigger: { trigger: board, start: 'top 90%', once: true },
      });

      cats.forEach((c) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: c.section, start: 'top 82%', once: true } });
        let at = 0;
        if (c.bannerImg) {
          tl.fromTo(c.banner, { clipPath: 'inset(0% 100% 0% 0% round 16px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', duration: 1.4, ease: 'expo.inOut' }, 0)
            .fromTo(c.bannerImg, { scale: 1.25 }, { scale: 1, duration: 1.9, ease: 'expo.out' }, 0.15);
          at = 0.5;
        }
        tl.fromTo(c.head, { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out' }, at);
        if (c.colsRow) tl.fromTo(c.colsRow, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, at + 0.2);

        c.items.forEach((it, i) => {
          const t = at + 0.15 + i * 0.07;
          const th = $('.item__thumb', it.node);
          const tags = $('.item__tags', it.node);
          if (th) tl.fromTo(th, { clipPath: 'inset(100% 0% 0% 0% round 12px)' }, { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 1, ease: 'expo.out' }, t);
          if (tags) tl.fromTo(tags, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, t + 0.3);
          tl.fromTo($('.item__main', it.node), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out' }, t)
            .fromTo($('.item__leader', it.node), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out' }, t + 0.12)
            .fromTo($$('.item__price', it.node), { x: -12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', stagger: 0.07 }, t + 0.4);
        });
        reveals.push(tl);

        if (c.bannerImg) {
          gsap.fromTo(c.bannerImg, { yPercent: -7 }, {
            yPercent: 7,
            ease: 'none',
            scrollTrigger: { trigger: c.banner, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
          });
        }
      });
      motionReady = true;
    };

    /* dish view: the tapped photo flies up into a large card; ← → browse */
    function createDishView() {
      const dv = $('#dishView');
      if (!dv || typeof dv.showModal !== 'function') return { open() {}, close() {} };

      const panel = $('.dv__panel', dv);
      const media = $('.dv__media', dv);
      const ph = $('.dv__ph', dv);
      const img = $('.dv__img', dv);
      const body = $('.dv__body', dv);
      const catEl = $('.dv__cat', dv);
      const nameEl = $('.dv__name', dv);
      const dietEl = $('.dv__diet', dv);
      const descEl = $('.dv__desc', dv);
      const pricesEl = $('.dv__prices', dv);
      const tagsEl = $('.dv__tags', dv);
      const posEl = $('.dv__pos', dv);
      const prevBtn = $('.dv__prev', dv);
      const nextBtn = $('.dv__next', dv);
      const sheet = window.matchMedia('(max-width: 760px)');
      const content = [media, catEl, nameEl, dietEl, descEl, pricesEl, tagsEl];
      let list = [];
      let idx = 0;
      let opener = null;
      let busy = false;

      const srcOf = (node) => node.currentSrc || node.src;
      const onScreen = (node) => {
        if (!node || node.offsetParent === null) return null;
        const r = node.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight ? r : null;
      };
      const flyClone = (src, from, to, radiusFrom, radiusTo, duration, done) => {
        const clone = el('img', 'dv__clone');
        clone.alt = '';
        clone.src = src;
        Object.assign(clone.style, {
          left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: radiusFrom,
        });
        dv.append(clone);
        gsap.to(clone, {
          left: to.left, top: to.top, width: to.width, height: to.height, borderRadius: radiusTo,
          duration, ease: 'expo.inOut',
          onComplete: () => { clone.remove(); if (done) done(); },
        });
      };

      const fill = () => {
        const it = list[idx];
        const d = it.data;
        catEl.textContent = `${it.catNum} · ${it.cat.label}`;
        nameEl.textContent = d.name;
        dietEl.replaceChildren();
        dietEl.hidden = !(d.diet && DIET[d.diet]);
        if (!dietEl.hidden) dietEl.append(mark(d.diet), document.createTextNode(DIET[d.diet][0]));
        descEl.textContent = d.desc || '';
        descEl.hidden = !d.desc;

        pricesEl.replaceChildren();
        (it.columns || [null]).forEach((c) => {
          const value = fmt(priceOf(d, it.columns, c));
          const box = el('div', value ? 'dv__price' : 'dv__price dv__price--na');
          box.append(el('span', '', c || 'Price'), el('b', '', value || 'Not served'));
          pricesEl.append(box);
        });

        tagsEl.replaceChildren();
        (d.tags || []).forEach((t) => tagsEl.append(el('span', `item__tag${norm(t) === 'signature' ? ' item__tag--solid' : ''}`, t)));
        tagsEl.hidden = !(d.tags && d.tags.length);

        media.classList.toggle('is-empty', !d.image);
        ph.style.backgroundImage = it.thumbImg ? `url("${srcOf(it.thumbImg)}")` : 'none';
        img.classList.remove('is-loaded');
        if (d.image) {
          img.alt = d.alt || d.name;
          img.onload = () => img.classList.add('is-loaded');
          img.src = d.image;
          if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
        } else {
          img.removeAttribute('src');
          img.alt = '';
        }
        posEl.textContent = `${idx + 1} / ${list.length}`;
        prevBtn.disabled = list.length < 2;
        nextBtn.disabled = list.length < 2;
      };

      const open = (entry, trigger) => {
        if (busy || dv.open) return;
        list = cats.flatMap((c) => c.items).filter((it) => !it.node.hidden);
        idx = Math.max(0, list.indexOf(entry));
        opener = trigger;
        const from = motion && !sheet.matches ? onScreen(entry.thumbImg) : null;

        fill();
        dv.showModal();
        root.classList.add('dv-open');
        if (lenis) lenis.stop();
        requestAnimationFrame(() => dv.classList.add('is-in'));
        if (!motion) return;

        const kids = [...body.children];
        if (sheet.matches) {
          gsap.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.75, ease: 'expo.out' });
          gsap.fromTo(kids, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, delay: 0.25, ease: 'power3.out' });
          return;
        }
        gsap.fromTo(panel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45, ease: 'power2.out' });
        if (from) {
          const to = media.getBoundingClientRect();
          gsap.set(media, { autoAlpha: 0 });
          flyClone(srcOf(entry.thumbImg), from, to, '12px', '24px 0px 0px 24px', 0.85, () => gsap.set(media, { autoAlpha: 1 }));
        } else {
          gsap.fromTo(media, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'expo.out' });
        }
        gsap.fromTo(kids, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05, delay: 0.3, ease: 'power3.out' });
      };

      const close = ({ instant = false } = {}) => {
        if (!dv.open) return;
        const finish = () => {
          if (motion) gsap.killTweensOf([panel, ...content, ...body.children]);
          $$('.dv__clone', dv).forEach((n) => n.remove());
          dv.close();
          dv.classList.remove('is-in');
          root.classList.remove('dv-open');
          if (lenis) lenis.start();
          if (motion) gsap.set([panel, ...content, ...body.children], { clearProps: 'opacity,visibility,transform' });
          busy = false;
          if (!instant && opener && document.contains(opener)) opener.focus({ preventScroll: true });
        };
        if (instant || !motion) { finish(); return; }
        if (busy) return;
        busy = true;
        dv.classList.remove('is-in');

        if (sheet.matches) {
          gsap.to(panel, { yPercent: 100, duration: 0.45, ease: 'power3.in', onComplete: finish });
          return;
        }
        const it = list[idx];
        const to = it && it.data.image ? onScreen(it.thumbImg) : null;
        if (to) {
          // the photo flies back into its row
          const from = media.getBoundingClientRect();
          const src = img.classList.contains('is-loaded') ? srcOf(img) : srcOf(it.thumbImg);
          gsap.set(media, { autoAlpha: 0 });
          gsap.to(panel, { autoAlpha: 0, duration: 0.35, ease: 'power2.out' });
          flyClone(src, from, to, '24px 0px 0px 24px', '12px', 0.7, finish);
        } else {
          gsap.to(panel, { autoAlpha: 0, scale: 0.98, duration: 0.35, ease: 'power2.in', onComplete: finish });
        }
      };

      const go = (dir) => {
        if (list.length < 2 || busy) return;
        idx = (idx + dir + list.length) % list.length;
        if (!motion) { fill(); return; }
        busy = true;
        gsap.to(content, {
          autoAlpha: 0, x: -dir * 26, duration: 0.22, ease: 'power2.in', stagger: 0.015, overwrite: true,
          onComplete: () => {
            fill();
            gsap.fromTo(content, { autoAlpha: 0, x: dir * 26 }, {
              autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.03,
              onComplete: () => { busy = false; },
            });
          },
        });
      };

      dv.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
      dv.addEventListener('click', (e) => { if (e.target === dv) close(); });
      $('.dv__close', dv).addEventListener('click', () => close());
      prevBtn.addEventListener('click', () => go(-1));
      nextBtn.addEventListener('click', () => go(1));
      dv.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      });
      // swipe the photo to browse on touch screens
      let startX = null;
      media.addEventListener('pointerdown', (e) => { startX = e.clientX; });
      media.addEventListener('pointerup', (e) => {
        if (startX == null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
      });
      media.addEventListener('pointercancel', () => { startX = null; });

      return { open, close };
    }

    return { setupMotion, relayout: placeInk, closeView: (opts) => view.close(opts) };
  }
})();
