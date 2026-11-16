/* ──────────────────────────────────────────────────────────
   Arco — interaction & motion
   Stack: GSAP 3 + ScrollTrigger (animation), Lenis (smooth scroll).
   Everything degrades: no JS → static page; reduced motion → no
   smooth scroll or scrubbing; libraries fail → page shown as-is.
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

  /* ───────── Data from services.js ───────── */
  const DATA = typeof SERVICES !== 'undefined' && Array.isArray(SERVICES) ? SERVICES : [];
  const CUR = typeof CURRENCY === 'string' ? CURRENCY : '';
  const CFG = typeof BOOKING === 'object' && BOOKING ? BOOKING : {};

  /* ───────── Helpers ───────── */
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const money = (n) => `${CUR}${Number(n).toLocaleString('en-IN')}`;
  const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
  const ICON_PLUS = '<svg class="i-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const ICON_CHECK = '<svg class="i-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  const plainText = (node) => {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
    return clone.textContent.replace(/\s+/g, ' ').trim();
  };

  // Split words into spans (keeping <em>, <br> and inline images), with an
  // unsplit copy for screen readers and the split copy aria-hidden.
  function splitWords(node, { mask = true } = {}) {
    if (node.dataset.splitDone) return $$(mask ? '.w__i' : '.sw', node);
    const label = plainText(node);
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    const words = [];
    const walk = (from, to) => {
      from.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (!part.trim()) { to.append(' '); return; }
            if (mask) {
              const m = el('span', 'w');
              const i = el('span', 'w__i', part);
              m.append(i);
              to.append(m);
              words.push(i);
            } else {
              const s = el('span', 'sw', part);
              to.append(s);
              words.push(s);
            }
          });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === 'BR') { to.append(document.createElement('br')); return; }
          const shell = child.cloneNode(false);
          to.append(shell);
          walk(child, shell);
        }
      });
    };
    walk(node, visual);
    node.replaceChildren(el('span', 'sr-only', label), visual);
    node.dataset.splitDone = '1';
    return words;
  }

  // Smooth-scroll to an element (or 0 for the top), honouring scroll-margin-top.
  const scrollToEl = (target, extra = 0) => {
    const margin = target === 0 ? 0 : (parseFloat(getComputedStyle(target).scrollMarginTop) || 0) + extra;
    if (lenis) {
      lenis.scrollTo(target, { offset: -margin, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    } else {
      const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - margin;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  /* ═════════ Your visit: the services someone has picked ═════════ */
  const picked = new Map(); // key → { cat, item, variant, price, mins, label }
  const subscribers = [];
  const onChange = (fn) => subscribers.push(fn);
  const emit = () => subscribers.forEach((fn) => fn());
  const baseKey = (cat, item) => `${cat.id}::${item.name}`;
  const keyOf = (cat, item, variant) => `${baseKey(cat, item)}${variant ? `::${variant}` : ''}`;
  const isPicked = (cat, item, variant) => picked.has(keyOf(cat, item, variant));
  const anyPicked = (cat, item) => [...picked.values()].some((p) => p.cat === cat && p.item === item);
  const dropItem = (cat, item) => {
    const base = baseKey(cat, item);
    [...picked.keys()].forEach((k) => { if (k === base || k.startsWith(`${base}::`)) picked.delete(k); });
  };
  const pick = (cat, item, variant) => {
    dropItem(cat, item); // one option per service
    const price = variant ? item.price[variant] : item.price;
    picked.set(keyOf(cat, item, variant), {
      cat, item, variant, price: Number(price) || 0, mins: Number(item.mins) || 0,
      label: `${item.name}${variant ? ` (${variant})` : ''}`,
    });
    emit();
  };
  const unpick = (cat, item) => { dropItem(cat, item); emit(); };
  const totals = () => [...picked.values()].reduce((t, p) => ({ mins: t.mins + p.mins, price: t.price + p.price }), { mins: 0, price: 0 });
  const countText = (n) => `${n} service${n === 1 ? '' : 's'}`;
  const optionsOf = (item) => (item.price && typeof item.price === 'object' ? Object.keys(item.price) : null);
  const priceLabel = (item) => {
    const options = optionsOf(item);
    return options ? `from ${money(Math.min(...Object.values(item.price)))}` : money(item.price);
  };

  /* every service with a `look` photo, in menu order */
  const LOOKS = [];
  DATA.forEach((cat) => cat.items.forEach((item) => {
    if (item.look && item.look.src) LOOKS.push({ cat, item, look: item.look, node: null });
  }));
  const lookThumb = (src) => String(src).replace(/(assets\/looks\/)([^/]+)$/, '$1thumbs/$2');
  const ICON_ZOOM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let lookView = { open() {}, close() {} }; // set up below

  /* ───────── Service cards ───────── */
  const cards = renderServices();

  function renderServices() {
    const stack = $('#stack');
    if (!stack) return [];
    return DATA.map((cat, ci) => {
      const card = el('article', `svc svc--${ci % 3}`);
      card.id = `svc-${cat.id}`;
      card.style.setProperty('--i', ci);
      card.setAttribute('aria-labelledby', `svc-${cat.id}-title`);

      const media = el('div', 'svc__media');
      if (cat.image) {
        const img = el('img');
        img.src = cat.image;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        if (cat.focus) img.style.objectPosition = cat.focus;
        media.append(img);
      }
      const label = el('div', 'svc__label');
      const num = el('span', 'svc__num', String(ci + 1).padStart(2, '0'));
      num.setAttribute('aria-hidden', 'true');
      const title = el('h3', 'svc__title', cat.label);
      title.id = `svc-${cat.id}-title`;
      label.append(num, title);
      if (cat.note) label.append(el('p', 'svc__note', cat.note));
      media.append(label);

      const list = el('ul', 'svc__list');
      cat.items.forEach((item) => {
        const li = el('li', 'opt');
        const name = el('h4', 'opt__name', item.name);
        if (item.tags && item.tags[0]) name.append(' ', el('span', 'opt__tag', item.tags[0]));
        li.append(name);
        if (item.desc) li.append(el('p', 'opt__desc', item.desc));

        const options = item.price && typeof item.price === 'object' ? Object.keys(item.price) : null;
        const meta = el('p', 'opt__meta');
        if (item.mins) meta.append(el('span', 'opt__time', duration(item.mins)));
        meta.append(el('span', 'opt__price', priceLabel(item)));
        // “See the look” opens the lookbook viewer on this service
        const lookIndex = LOOKS.findIndex((l) => l.item === item);
        if (lookIndex > -1) {
          const lb = el('button', 'opt__look');
          lb.type = 'button';
          lb.setAttribute('aria-label', `See the ${item.name} look`);
          const thumb = el('img');
          thumb.alt = '';
          thumb.loading = 'lazy';
          thumb.addEventListener('error', () => { thumb.src = item.look.src; }, { once: true });
          thumb.src = lookThumb(item.look.src);
          lb.append(thumb, el('span', '', 'See the look'));
          lb.addEventListener('click', () => lookView.open(lookIndex, false));
          meta.append(lb);
        }
        li.append(meta);

        const syncers = [];
        if (options) {
          // services with options (e.g. Short / Long) are added by picking one
          const group = el('div', 'opt__vars');
          group.setAttribute('role', 'group');
          group.setAttribute('aria-label', `${item.name}: add an option`);
          options.forEach((v) => {
            const b = el('button', 'opt__var', `${v} · ${money(item.price[v])}`);
            b.type = 'button';
            b.addEventListener('click', () => (isPicked(cat, item, v) ? unpick(cat, item) : pick(cat, item, v)));
            syncers.push(() => b.setAttribute('aria-pressed', String(isPicked(cat, item, v))));
            group.append(b);
          });
          li.append(group);
        } else {
          const b = el('button', 'opt__add');
          b.type = 'button';
          b.innerHTML = ICON_PLUS + ICON_CHECK;
          b.setAttribute('aria-label', `Add ${item.name} to your visit — ${money(item.price)}${item.mins ? `, ${duration(item.mins)}` : ''}`);
          b.addEventListener('click', () => (isPicked(cat, item) ? unpick(cat, item) : pick(cat, item)));
          syncers.push(() => b.setAttribute('aria-pressed', String(isPicked(cat, item))));
          li.append(b);
        }
        onChange(() => {
          syncers.forEach((fn) => fn());
          li.classList.toggle('is-picked', anyPicked(cat, item));
        });
        list.append(li);
      });

      const veil = el('span', 'svc__veil');
      veil.setAttribute('aria-hidden', 'true');
      card.append(media, list, veil);
      stack.append(card);
      return card;
    });
  }

  /* ───────── Floating “your visit” bar ───────── */
  (function initTray() {
    const tray = $('#tray');
    if (!tray) return;
    const count = $('#trayCount');
    const sum = $('#traySum');
    let bookInView = false;
    const update = () => {
      const n = picked.size;
      const t = totals();
      count.textContent = String(n);
      sum.replaceChildren(
        document.createTextNode(`${countText(n)} · `),
        el('b', '', duration(t.mins)),
        document.createTextNode(' · '),
        el('b', '', money(t.price)),
      );
      const away = n === 0 || bookInView;
      tray.classList.toggle('is-away', away);
      tray.inert = away;
    };
    onChange(update);
    $('#trayClear').addEventListener('click', () => { picked.clear(); emit(); });
    const book = $('#book');
    if (book && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { bookInView = entry.isIntersecting; update(); }, { threshold: 0.12 }).observe(book);
    }
  })();

  /* ───────── Visit summary card (booking section) ───────── */
  (function initVisitCard() {
    const list = $('#visitList');
    if (!list) return;
    const empty = $('#visitEmpty');
    const countEl = $('#visitCount');
    const nounEl = $('#visitNoun');
    const timeEl = $('#visitTime');
    const priceEl = $('#visitPrice');
    const quick = $('#quickAdd');
    const index = new Map();

    DATA.forEach((cat) => {
      const group = document.createElement('optgroup');
      group.label = cat.label;
      cat.items.forEach((item) => {
        const options = item.price && typeof item.price === 'object' ? Object.keys(item.price) : [null];
        options.forEach((v) => {
          const key = keyOf(cat, item, v);
          index.set(key, { cat, item, v });
          const o = document.createElement('option');
          o.value = key;
          o.textContent = `${item.name}${v ? ` (${v})` : ''} — ${money(v ? item.price[v] : item.price)}`;
          group.append(o);
        });
      });
      quick.append(group);
    });
    quick.addEventListener('change', () => {
      const hit = index.get(quick.value);
      if (hit) pick(hit.cat, hit.item, hit.v);
      quick.value = '';
    });

    onChange(() => {
      list.replaceChildren();
      picked.forEach((p) => {
        const li = el('li', 'vitem');
        const txt = el('div', 'vitem__txt');
        txt.append(el('span', 'vitem__name', p.label), el('span', 'vitem__meta', `${p.mins ? `${duration(p.mins)} · ` : ''}${money(p.price)}`));
        const rm = el('button', 'vitem__rm');
        rm.type = 'button';
        rm.innerHTML = ICON_X;
        rm.setAttribute('aria-label', `Remove ${p.label}`);
        rm.addEventListener('click', () => unpick(p.cat, p.item));
        li.append(txt, rm);
        list.append(li);
      });
      const n = picked.size;
      const t = totals();
      countEl.textContent = n ? String(n) : 'No';
      nounEl.textContent = n === 1 ? 'service' : 'services';
      $('#visitTitle').lastChild.textContent = n ? ' picked' : ' yet';
      empty.hidden = n > 0;
      timeEl.textContent = n ? duration(t.mins) : '—';
      priceEl.textContent = n ? money(t.price) : '—';
    });
  })();

  /* ═════════ Looks: lookbook rail ═════════ */
  (function initLooks() {
    const section = $('#looks');
    const rail = $('#lookRail');
    if (!rail) return;
    if (!LOOKS.length) { if (section) section.hidden = true; return; }
    const chipsEl = $('#lookChips');
    const prev = $('#lookPrev');
    const next = $('#lookNext');

    LOOKS.forEach((entry, i) => {
      const { cat, item, look } = entry;
      const options = optionsOf(item);
      const li = el('li', 'look');

      const frame = el('button', 'look__frame');
      frame.type = 'button';
      frame.setAttribute('aria-label', `See the ${item.name} look up close`);
      const img = el('img');
      img.src = look.src;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      const zoom = el('span', 'look__zoom');
      zoom.setAttribute('aria-hidden', 'true');
      zoom.innerHTML = ICON_ZOOM;
      frame.append(img, zoom);
      frame.addEventListener('click', () => { if (!rail.dataset.dragged) lookView.open(i, true); });

      const row = el('div', 'look__row');
      const txt = el('div', 'look__txt');
      txt.append(
        el('p', 'look__cat', cat.label),
        el('h3', 'look__name', item.name),
        el('p', 'look__meta', `${item.mins ? `${duration(item.mins)} · ` : ''}${priceLabel(item)}`),
      );
      const add = el('button', 'look__add');
      add.type = 'button';
      add.innerHTML = ICON_PLUS + ICON_CHECK;
      add.setAttribute('aria-label', `Add ${item.name}${options ? ` (${options[0]})` : ''} to your visit`);
      add.addEventListener('click', () => (anyPicked(cat, item) ? unpick(cat, item) : pick(cat, item, options ? options[0] : undefined)));
      onChange(() => add.setAttribute('aria-pressed', String(anyPicked(cat, item))));
      row.append(txt, add);
      li.append(frame, row);
      rail.append(li);
      entry.node = li;
    });

    // filter by category
    const groups = [];
    LOOKS.forEach(({ cat }) => { if (!groups.includes(cat)) groups.push(cat); });
    const chips = [['all', 'All'], ...groups.map((c) => [c.id, c.label])].map(([id, label]) => {
      const b = el('button', 'lchip', label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(id === 'all'));
      b.addEventListener('click', () => {
        chips.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        LOOKS.forEach((l) => { l.node.hidden = id !== 'all' && l.cat.id !== id; });
        rail.scrollTo({ left: 0, behavior: 'auto' });
        updateArrows();
        if (motion) {
          gsap.fromTo(LOOKS.filter((l) => !l.node.hidden).map((l) => l.node), { autoAlpha: 0, y: 24 }, {
            autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', overwrite: true,
          });
        }
      });
      chipsEl.append(b);
      return b;
    });

    // arrows
    const cardStep = () => {
      const card = LOOKS.find((l) => !l.node.hidden);
      return card ? card.node.getBoundingClientRect().width + 24 : 300;
    };
    function updateArrows() {
      const max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    }
    prev.addEventListener('click', () => rail.scrollBy({ left: -cardStep() * 2, behavior: reduceMotion ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: cardStep() * 2, behavior: reduceMotion ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', () => requestAnimationFrame(updateArrows), { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();

    // drag to scroll with a mouse (touch already swipes natively)
    let drag = null;
    rail.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: rail.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; rail.classList.add('is-dragging'); }
      if (drag.moved) rail.scrollLeft = drag.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      if (drag.moved) {
        rail.dataset.dragged = '1';
        setTimeout(() => { delete rail.dataset.dragged; }, 0);
      }
      rail.classList.remove('is-dragging');
      drag = null;
    });
  })();

  /* ═════════ Look viewer ═════════ */
  lookView = createLookView();

  function createLookView() {
    const dv = $('#lookView');
    if (!dv || typeof dv.showModal !== 'function' || !LOOKS.length) return { open() {}, close() {} };
    const panel = $('.lv__panel', dv);
    const media = $('.lv__media', dv);
    const img = $('.lv__img', dv);
    const credit = $('.lv__credit', dv);
    const body = $('.lv__body', dv);
    const catEl = $('.lv__cat', dv);
    const nameEl = $('.lv__name', dv);
    const descEl = $('.lv__desc', dv);
    const metaEl = $('.lv__meta', dv);
    const choose = $('.lv__choose', dv);
    const posEl = $('.lv__pos', dv);
    const prevB = $('.lv__prev', dv);
    const nextB = $('.lv__next', dv);
    const sheet = window.matchMedia('(max-width: 760px)');
    const content = [media, catEl, nameEl, descEl, metaEl, choose];
    let list = LOOKS;
    let idx = 0;
    let opener = null;
    let busy = false;

    const syncChoose = () => {
      if (!list[idx]) return;
      const { cat, item } = list[idx];
      $$('.lv__opt', choose).forEach((b) => {
        const on = b.dataset.v ? isPicked(cat, item, b.dataset.v) : isPicked(cat, item);
        b.setAttribute('aria-pressed', String(on));
        const label = $('.lv__label', b);
        if (label && !b.dataset.v) label.textContent = on ? 'In your visit' : 'Add to visit';
      });
    };
    onChange(syncChoose);

    const fill = () => {
      const { cat, item, look } = list[idx];
      const options = optionsOf(item);
      catEl.textContent = cat.label;
      nameEl.textContent = item.name;
      descEl.textContent = item.desc || '';
      metaEl.replaceChildren();
      if (item.mins) metaEl.append(el('span', 'lv__time', duration(item.mins)));
      metaEl.append(el('span', 'lv__price', priceLabel(item)));

      choose.replaceChildren();
      (options || [null]).forEach((v) => {
        const b = el('button', 'lv__opt');
        b.type = 'button';
        const icons = el('span', 'lv__icons');
        icons.innerHTML = ICON_PLUS + ICON_CHECK;
        b.append(icons, el('span', 'lv__label', v ? `${v} · ${money(item.price[v])}` : 'Add to visit'));
        if (v) b.dataset.v = v;
        b.addEventListener('click', () => {
          if (v) { if (isPicked(cat, item, v)) unpick(cat, item); else pick(cat, item, v); }
          else if (isPicked(cat, item)) unpick(cat, item); else pick(cat, item);
        });
        choose.append(b);
      });

      img.src = look.src;
      img.alt = `Reference look: ${item.name}`;
      credit.replaceChildren();
      if (look.link) {
        const a = el('a', '', look.credit || 'source');
        a.href = look.link;
        a.target = '_blank';
        a.rel = 'noopener';
        credit.append(document.createTextNode('Reference photo · '), a);
      } else {
        credit.append(document.createTextNode(look.credit || ''));
      }
      posEl.textContent = `${idx + 1} / ${list.length}`;
      prevB.disabled = list.length < 2;
      nextB.disabled = list.length < 2;
      syncChoose();
    };

    const open = (i, fromRail) => {
      if (busy || dv.open) return;
      const entry = LOOKS[i];
      list = fromRail ? LOOKS.filter((l) => !l.node || !l.node.hidden) : LOOKS;
      idx = Math.max(0, list.indexOf(entry));
      opener = document.activeElement;
      fill();
      dv.showModal();
      root.classList.add('lv-open');
      if (lenis) lenis.stop();
      requestAnimationFrame(() => dv.classList.add('is-in'));
      if (!motion) return;
      if (sheet.matches) gsap.fromTo(panel, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' });
      else gsap.fromTo(panel, { autoAlpha: 0, y: 30, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
      gsap.fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out', delay: 0.1 });
      gsap.fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1.4, ease: 'expo.out', delay: 0.1 });
      gsap.fromTo([...body.children], { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, delay: 0.2, ease: 'power3.out' });
    };

    const close = ({ instant = false } = {}) => {
      if (!dv.open) return;
      const finish = () => {
        if (motion) gsap.killTweensOf([panel, img, ...content, ...body.children]);
        dv.close();
        dv.classList.remove('is-in');
        root.classList.remove('lv-open');
        if (lenis) lenis.start();
        if (motion) gsap.set([panel, img, ...content, ...body.children], { clearProps: 'opacity,visibility,transform,clipPath' });
        busy = false;
        if (!instant && opener && document.contains(opener)) opener.focus({ preventScroll: true });
      };
      if (instant || !motion) { finish(); return; }
      if (busy) return;
      busy = true;
      dv.classList.remove('is-in');
      if (sheet.matches) gsap.to(panel, { yPercent: 100, duration: 0.45, ease: 'power3.in', onComplete: finish });
      else gsap.to(panel, { autoAlpha: 0, y: 20, scale: 0.98, duration: 0.35, ease: 'power2.in', onComplete: finish });
    };

    const go = (dir) => {
      if (list.length < 2 || busy) return;
      const nextIdx = (idx + dir + list.length) % list.length;
      if (!motion) { idx = nextIdx; fill(); return; }
      busy = true;
      gsap.to(content, {
        autoAlpha: 0, x: -dir * 24, duration: 0.22, ease: 'power2.in', stagger: 0.015, overwrite: true,
        onComplete: () => {
          idx = nextIdx; // switch only once the old look has faded, so “Book” always matches what's shown
          fill();
          gsap.fromTo(content, { autoAlpha: 0, x: dir * 24 }, {
            autoAlpha: 1, x: 0, duration: 0.5, ease: 'power3.out', stagger: 0.03,
            onComplete: () => { busy = false; },
          });
        },
      });
    };

    dv.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    dv.addEventListener('click', (e) => { if (e.target === dv) close(); });
    $('.lv__close', dv).addEventListener('click', () => close());
    prevB.addEventListener('click', () => go(-1));
    nextB.addEventListener('click', () => go(1));
    dv.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    // “Book this look” adds it to the visit (if it isn't already); the link then scrolls to booking
    $('.lv__book', dv).addEventListener('click', () => {
      const { cat, item } = list[idx];
      const options = optionsOf(item);
      if (!anyPicked(cat, item)) pick(cat, item, options ? options[0] : undefined);
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

  /* ───────── Booking form → a written-out WhatsApp message ───────── */
  (function initBooking() {
    const form = $('#bookForm');
    if (!form) return;
    const name = $('#bkName');
    const phone = $('#bkPhone');
    const notes = $('#bkNotes');
    const daysEl = $('#bkDays');
    const slotsEl = $('#bkSlots');
    const errorEl = $('#bkError');
    const fine = $('#bkFine');
    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
    const clock = (m) => { const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`; };

    // days: today onwards, as little arches
    const today = new Date();
    const nDays = Math.max(3, Number(CFG.days) || 14);
    for (let i = 0; i < nDays; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const lab = el('label', 'day');
      const input = el('input', 'sr-only');
      input.type = 'radio';
      input.name = 'day';
      input.value = iso(d);
      input.setAttribute('aria-label', d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }));
      const face = el('span', 'day__face');
      face.setAttribute('aria-hidden', 'true');
      face.append(
        el('span', 'day__dow', i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })),
        el('b', 'day__num', String(d.getDate())),
        el('span', 'day__mon', d.toLocaleDateString('en-IN', { month: 'short' })),
      );
      lab.append(input, face);
      daysEl.append(lab);
    }

    // time slots for the chosen day (past times hidden for today)
    const first = toMin(CFG.opens || '10:00');
    const last = toMin(CFG.closes || '20:00');
    const step = Math.max(10, Number(CFG.step) || 30);
    const renderSlots = () => {
      const day = (form.elements.day && form.elements.day.value) || '';
      const keep = (form.elements.time && form.elements.time.value) || '';
      slotsEl.replaceChildren();
      if (!day) { slotsEl.append(el('p', 'slots__hint', 'Pick a day to see times.')); return; }
      const now = new Date();
      const isToday = day === iso(now);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let count = 0;
      for (let m = first; m <= last; m += step) {
        if (isToday && m <= nowMin + 30) continue;
        const lab = el('label', 'slot');
        const input = el('input', 'sr-only');
        input.type = 'radio';
        input.name = 'time';
        input.value = clock(m);
        if (input.value === keep) input.checked = true;
        lab.append(input, el('span', 'slot__face', clock(m)));
        slotsEl.append(lab);
        count += 1;
      }
      if (!count) slotsEl.append(el('p', 'slots__hint', 'No times left today — pick another day.'));
    };
    daysEl.addEventListener('change', () => { $('#bkDayField').removeAttribute('aria-invalid'); renderSlots(); });
    slotsEl.addEventListener('change', () => $('#bkTimeField').removeAttribute('aria-invalid'));
    name.addEventListener('input', () => name.removeAttribute('aria-invalid'));
    renderSlots();

    const fail = (message, field, focusTarget) => {
      errorEl.textContent = message;
      errorEl.hidden = false;
      $$('[aria-invalid]', form).forEach((n) => n.removeAttribute('aria-invalid'));
      if (field) field.setAttribute('aria-invalid', 'true');
      (focusTarget || field).focus();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!picked.size) return fail('Add at least one service — use the cards above or “+ Add a service”.', null, $('#quickAdd'));
      if (!name.value.trim()) return fail('Please add your name.', name);
      const day = form.elements.day && form.elements.day.value;
      if (!day) return fail('Please pick a day.', $('#bkDayField'), $('input[name="day"]', form));
      const time = form.elements.time && form.elements.time.value;
      if (!time) return fail('Please pick a time.', $('#bkTimeField'), $('input[name="time"]', form) || $('input[name="day"]:checked', form));
      errorEl.hidden = true;

      const t = totals();
      const when = new Date(`${day}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const lines = [
        `Hi ${CFG.shopName || 'there'}! I'd like to book a chair.`,
        '',
        `Name: ${name.value.trim()}`,
        `When: ${when}, ${time}`,
        'Services:',
        ...[...picked.values()].map((p) => `• ${p.label} — ${money(p.price)}${p.mins ? ` (${duration(p.mins)})` : ''}`),
        `Total: about ${duration(t.mins)} · ${money(t.price)}`,
      ];
      if (phone.value.trim()) lines.push(`Phone: ${phone.value.trim()}`);
      if (notes.value.trim()) lines.push(`Notes: ${notes.value.trim()}`);

      const number = String(CFG.whatsapp || '').replace(/\D/g, '');
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      fine.textContent = 'WhatsApp opened in a new tab — press send there to confirm your booking.';
      return undefined;
    });
  })();

  /* ───────── Button rolling labels ───────── */
  $$('.btn__txt').forEach((t) => {
    const roll = el('span', 'btn__roll', t.textContent.trim());
    roll.dataset.text = t.dataset.text || t.textContent.trim();
    t.removeAttribute('data-text');
    t.replaceChildren(roll);
  });

  /* ───────── The Chair: build the arch's time markers ───────── */
  const chair = initChair();

  function initChair() {
    const svg = $('.chair__svg');
    if (!svg) return null;
    const NS = 'http://www.w3.org/2000/svg';
    const path = $('.chair__glow', svg);
    const dotsG = $('.chair__dots', svg);
    const steps = $$('.cstep');
    const len = path.getTotalLength();
    const total = Math.max(1, ...steps.map((s) => Number(s.dataset.min) || 0));
    const marks = steps.map((s) => {
      const f = 0.04 + 0.92 * ((Number(s.dataset.min) || 0) / total);
      const pt = path.getPointAtLength(len * f);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', pt.x.toFixed(1));
      dot.setAttribute('cy', pt.y.toFixed(1));
      dot.setAttribute('r', '7');
      dot.setAttribute('class', 'chair__dot');
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('class', 'chair__time');
      text.textContent = $('.cstep__time', s).textContent;
      if (pt.y > 262) { // on the straight sides
        const left = pt.x < 260;
        text.setAttribute('x', (pt.x + (left ? -18 : 18)).toFixed(1));
        text.setAttribute('y', (pt.y + 5).toFixed(1));
        text.setAttribute('text-anchor', left ? 'end' : 'start');
      } else { // on the curve: push the label outwards from the arch's centre
        const dx = pt.x - 260;
        const dy = pt.y - 260;
        const d = Math.hypot(dx, dy) || 1;
        text.setAttribute('x', (pt.x + (dx / d) * 30).toFixed(1));
        text.setAttribute('y', (pt.y + (dy / d) * 30 + 5).toFixed(1));
        text.setAttribute('text-anchor', Math.abs(dx) < 40 ? 'middle' : dx < 0 ? 'end' : 'start');
      }
      dotsG.append(dot, text);
      return { dot, text, f };
    });
    path.style.strokeDasharray = String(len);
    const set = (p) => {
      path.style.strokeDashoffset = String(len * (1 - p));
      let active = 0;
      marks.forEach((m, i) => {
        const on = p >= m.f - 0.005;
        m.dot.classList.toggle('is-lit', on);
        m.text.classList.toggle('is-lit', on);
        if (on) active = i;
      });
      steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
    };
    set(motion ? 0 : 1);
    return { set };
  }

  /* ───────── Nav: hides on scroll down, shows on scroll up ───────── */
  const nav = $('#nav');
  let lastY = window.scrollY;
  let drawerOpen = false;
  const setNavHidden = (hidden) => {
    nav.classList.toggle('is-hidden', hidden);
    root.classList.toggle('nav-up', hidden);
  };
  const updateNav = () => {
    const y = window.scrollY;
    if (!drawerOpen) {
      if (y > window.innerHeight * 0.6 && y > lastY + 4) setNavHidden(true);
      else if (y < lastY - 4 || y < window.innerHeight * 0.6) setNavHidden(false);
    }
    lastY = y;
  };
  let navTick = false;
  window.addEventListener('scroll', () => {
    if (navTick) return;
    navTick = true;
    requestAnimationFrame(() => { navTick = false; updateNav(); });
  }, { passive: true });
  nav.addEventListener('focusin', () => setNavHidden(false));

  /* ───────── Service cards: where each one sticks while the next slides over ─────────
     Prefer just under the nav; if the card is taller than the space left, stick it by its
     bottom edge instead so every option on it can be seen. */
  const stickTops = [];
  const wideStack = window.matchMedia('(min-width: 1000px)');
  const STEP = 14; // each card sits a little lower than the one before, so their edges show like a deck
  const layoutStack = () => {
    if (!wideStack.matches) {
      cards.forEach((card, i) => { card.style.removeProperty('--stick'); stickTops[i] = 0; });
      return;
    }
    // one shared starting point: just under the nav, or higher if a card needs the room to be fully seen
    let base = nav.offsetHeight + 22;
    cards.forEach((card, i) => {
      base = Math.min(base, window.innerHeight - card.offsetHeight - 24 - i * STEP);
    });
    cards.forEach((card, i) => {
      const top = Math.round(base + i * STEP);
      card.style.setProperty('--stick', `${top}px`);
      stickTops[i] = top;
    });
  };
  layoutStack();
  window.addEventListener('resize', layoutStack);
  window.addEventListener('load', layoutStack);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutStack);

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
    if (open) {
      setNavHidden(false);
      drawer.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => drawer.classList.add('is-open')));
      if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
      setTimeout(() => { const firstLink = $('a', drawer); if (firstLink && drawerOpen) firstLink.focus({ preventScroll: true }); }, 280);
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
    const focusables = [...$$('a, button', nav), ...$$('a', drawer)].filter((n) => n.offsetParent !== null);
    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => { if (e.matches) setDrawer(false); });

  /* ───────── In-page links ───────── */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    const target = hash === '#top' ? 0 : document.querySelector(hash);
    if (target === null) return;
    e.preventDefault();
    if (drawerOpen) setDrawer(false);
    if (a.closest('#lookView')) lookView.close({ instant: true });
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
        new IntersectionObserver(([entry]) => (entry.isIntersecting ? play() : video.pause()), { threshold: 0.02 }).observe($('.hero'));
      }
    }
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  emit(); // first render of the tray, the visit card and the buttons

  /* ═════════ Motion (GSAP) ═════════ */
  if (!motion) return;

  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: 0.9 });
  root.classList.add('motion-on');

  if (typeof window.Lenis === 'function') {
    lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // pinned scenes first (top to bottom), so everything after measures with their spacing
  try {
    heroScene();
  } finally {
    clearTimeout(window.__motionFallback);
    root.classList.remove('has-motion');
  }
  chairScene();

  // reading progress
  gsap.to('.progress__bar', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
  });

  // manifesto: words light up as you read, photo pills open inside the sentence
  $$('[data-manifesto]').forEach((node) => {
    const words = splitWords(node, { mask: false });
    gsap.fromTo(words, { opacity: 0.12 }, {
      opacity: 1, ease: 'none', stagger: 0.08,
      scrollTrigger: { trigger: node, start: 'top 78%', end: 'bottom 48%', scrub: 1 },
    });
    $$('.inl', node).forEach((pill) => {
      const st = { trigger: pill, start: 'top 88%', end: 'top 58%', scrub: 1 };
      gsap.fromTo(pill, { clipPath: 'inset(0% 50% 0% 50% round 999px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px)', ease: 'none', scrollTrigger: st });
      gsap.fromTo($('img', pill), { scale: 1.5 }, { scale: 1, ease: 'none', scrollTrigger: { ...st } });
    });
  });

  // headings rise word by word
  $$('[data-split]').forEach((node) => {
    const words = splitWords(node);
    gsap.fromTo(words, { yPercent: 118 }, {
      yPercent: 0, duration: 1.25, ease: 'power4.out', stagger: 0.065,
      scrollTrigger: { trigger: node, start: 'top 86%', toggleActions: 'play none none none' },
    });
  });

  // simple reveals and staggered groups
  $$('[data-reveal]').forEach((node) => {
    gsap.fromTo(node, { y: 30, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1,
      scrollTrigger: { trigger: node, start: 'top 88%', toggleActions: 'play none none none' },
    });
  });
  $$('[data-reveal-group]').forEach((group) => {
    gsap.fromTo($$('[data-reveal-item]', group), { y: 36, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1, stagger: 0.09,
      scrollTrigger: { trigger: group, start: 'top 86%', toggleActions: 'play none none none' },
    });
  });

  // photos open from the bottom like a curtain
  $$('[data-image-reveal]').forEach((frame) => {
    const img = $('img', frame);
    gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 88%', toggleActions: 'play none none none' } })
      .fromTo(frame, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out' })
      .fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.9, ease: 'expo.out' }, 0);
  });

  // service cards: options cascade in; on big screens cards stack and the one underneath sinks back
  cards.forEach((card) => {
    gsap.fromTo($('.svc__media', card), { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
    });
    gsap.fromTo($$('.opt', card), { y: 26, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.06, delay: 0.2,
      scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
    });
  });

  // lookbook cards rise in, one after another
  const lookCards = $$('.look');
  if (lookCards.length) {
    gsap.fromTo(lookCards, { y: 50, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1, stagger: 0.07,
      scrollTrigger: { trigger: '#lookRail', start: 'top 88%', toggleActions: 'play none none none' },
    });
  }

  // reveals above use toggleActions instead of `once`: a `once` trigger deletes itself, and doing that
  // while ScrollTrigger is mid-refresh can throw and leave every pinned scene stuck.

  ScrollTrigger.addEventListener('refreshInit', layoutStack); // card stick points, before the stack measures
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1000px)', () => {
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.timeline({
        scrollTrigger: {
          trigger: next,
          start: 'top bottom',
          end: () => `top ${stickTops[i + 1]}px`, // until the next card settles
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
        .to(card, { scale: 0.94, ease: 'none' }, 0)
        .to($('.svc__veil', card), { opacity: 0.45, ease: 'none' }, 0);
    });
  });

  // the space: collage columns drift at different speeds
  mm.add('(min-width: 901px)', () => {
    $$('.mosaic__col').forEach((col) => {
      const s = Number(col.dataset.speed) || 0;
      gsap.fromTo(col, { yPercent: -s }, {
        yPercent: s, ease: 'none',
        scrollTrigger: { trigger: '.mosaic', start: 'top bottom', end: 'bottom top', scrub: 1.2 },
      });
    });
  });

  // footer wordmark rises letter by letter
  gsap.fromTo('.footer__mark i', { yPercent: 105 }, {
    yPercent: 0, duration: 1.3, ease: 'power4.out', stagger: 0.07,
    scrollTrigger: { trigger: '.footer__mark', start: 'top 95%', toggleActions: 'play none none none' },
  });

  // magnetic buttons (mouse only)
  if (finePointer) {
    $$('[data-magnetic]').forEach((node) => {
      const xTo = gsap.quickTo(node, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(node, 'y', { duration: 0.5, ease: 'power3.out' });
      node.addEventListener('pointermove', (e) => {
        const r = node.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.22);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      node.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

  /* ═════════ Scenes ═════════ */

  // Hero: the arch rises on load; scrolling walks you through it until the film fills the screen.
  function heroScene() {
    const hero = $('.hero');
    const stage = $('.hero__stage');
    const portal = $('.portal');
    const win = $('.hero__window');
    const ring = $('.hero__ring');
    const halves = $$('.hero__half');
    const letters = $$('.hero__half i');
    const step = $('.hero__step');
    const ui = $('.hero__ui');
    const fades = $$('[data-hero-fade]');
    const g = { t: 0, r: 0, b: 0, l: 0, rad: 0, h: 1 };
    const state = { rise: 1, open: 0 }; // rise: 1 → arch hidden below its base; open: 1 → full screen

    const measure = () => {
      const s = stage.getBoundingClientRect();
      const w = win.getBoundingClientRect();
      Object.assign(g, { t: w.top - s.top, l: w.left - s.left, r: s.right - w.right, b: s.bottom - w.bottom, rad: w.width / 2, h: s.height });
    };
    const apply = () => {
      const k = 1 - state.open;
      const top = g.t + (g.h - g.t - g.b) * state.rise;
      const f = (n) => `${(n * k).toFixed(1)}px`;
      portal.style.clipPath = `inset(${f(top)} ${f(g.r)} ${f(g.b)} ${f(g.l)} round ${f(g.rad)} ${f(g.rad)} 0px 0px)`;
    };

    measure();
    hero.classList.add('is-live');
    apply();
    gsap.set(portal, { visibility: 'visible' });
    gsap.set(letters, { yPercent: 110, visibility: 'visible' });
    gsap.set(ring, { visibility: 'visible', clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(ui, { autoAlpha: 0 });

    gsap.timeline({ delay: 0.2 })
      .to(state, { rise: 0, duration: 1.7, ease: 'expo.inOut', onUpdate: apply })
      .to(letters, { yPercent: 0, duration: 1.3, ease: 'power4.out', stagger: 0.1 }, 0.55)
      .to(ring, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0.8)
      .to(ui, { autoAlpha: 1, duration: 1, ease: 'power2.out' }, 1.2);

    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=130%', pin: true, scrub: 1 },
    })
      .to(state, { open: 1, duration: 1, ease: 'power2.inOut', onUpdate: apply }, 0)
      .fromTo(video, { scale: 1.12 }, { scale: 1, duration: 1, ease: 'none' }, 0)
      .to(halves[0], { xPercent: -70, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0)
      .to(halves[1], { xPercent: 70, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0)
      .to(fades, { autoAlpha: 0, y: 16, duration: 0.35, ease: 'power1.in', stagger: 0.03 }, 0)
      .to(ring, { autoAlpha: 0, scale: 1.08, duration: 0.4 }, 0)
      .fromTo(step, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power3.out' }, 0.68)
      .to({}, { duration: 0.2 });

    ScrollTrigger.addEventListener('refreshInit', measure);
    ScrollTrigger.addEventListener('refresh', apply);
  }

  // The Chair: pinned while the arch of light draws itself through the appointment.
  function chairScene() {
    const section = $('.chair');
    if (!section || !chair) return;
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: 'none',
      onUpdate: () => chair.set(proxy.p),
      scrollTrigger: { trigger: section, start: 'top top', end: '+=240%', pin: true, scrub: 0.8 },
    });
  }
})();
