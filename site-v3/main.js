/* Dog's Factory — nouvelle proposition */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  $('#year').textContent = new Date().getFullYear();

  /* entrée du hero : le contenu reste visible si l'animation ne démarre pas */
  if (!reduce) {
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-in')));
    setTimeout(() => root.classList.add('is-in'), 400);
  }

  /* ── menu ── */
  const menu = $('#menu'), toggle = $('.nav-toggle');
  const setMenu = (open) => {
    menu.hidden = !open; toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

  /* ── la balle et les chiens qui la suivent ── */
  const hero = $('.hero'), ball = $('#ball'), bark = $('#bark'), title = $('.hero-title');
  $$('.visit-ball').forEach(b => { b.innerHTML = '<span class="tb"></span>'; });
  const pups = $$('.pup').map(el => ({ el, body: $('.pup-body', el), irises: $$('.eye i', el), rot: 0, sx: 0, sy: 0 }));
  const m = { x: innerWidth * .68, y: innerHeight * .3, tx: innerWidth * .68, ty: innerHeight * .3, auto: !fine, spin: 0, seen: false };

  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    m.tx = e.clientX; m.ty = e.clientY; m.auto = false;
    if (!m.seen) { m.seen = true; m.x = m.tx; m.y = m.ty; }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { m.auto = true; });

  let barkTimer;
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button')) return;
    if (!bark) return;
    bark.classList.add('is-on');
    clearTimeout(barkTimer); barkTimer = setTimeout(() => bark.classList.remove('is-on'), 900);
  });

  const frame = (now) => {
    requestAnimationFrame(frame);
    const t = now / 1000, vw = innerWidth, vh = innerHeight;
    if (m.auto) {                       // sans souris, la balle se promène toute seule
      m.tx = vw * (.5 + Math.sin(t * .6) * .34);
      m.ty = vh * (.34 + Math.sin(t * 1.3 + 1) * .16);
    }
    const ox = m.x;
    m.x = lerp(m.x, m.tx, .13); m.y = lerp(m.y, m.ty, .13);
    m.spin += (m.x - ox) * 1.3;

    const hr = hero.getBoundingClientRect();
    const inHero = hr.bottom > 0;
    if (inHero) {
      const px = (m.x / vw - .5), py = (m.y / vh - .5);
      if (vw > 760) title.style.transform = `translate(${(-px * 26).toFixed(1)}px, ${(-py * 14).toFixed(1)}px)`;
    }

    pups.forEach(p => {
      const r = p.el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      const w = r.width, cx = r.left + w / 2, cy = r.top + w * .45;
      const dx = (m.x - cx) / w, dy = (m.y - cy) / w;
      p.kick = (p.kick || 0) * .9;
      p.rot = lerp(p.rot, clamp(dx * 9, -6, 6), .08);
      p.sx = lerp(p.sx, clamp(dx * 22, -14, 14), .08);
      p.sy = lerp(p.sy, clamp(dy * 10, -6, 8) - p.kick * 18, .12);
      p.body.style.transform = `translate(${p.sx.toFixed(2)}px, ${p.sy.toFixed(2)}px) rotate(${p.rot.toFixed(2)}deg)`;
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d * 2.4);
      const ix = dx / d * k * 24, iy = dy / d * k * 22;          // en % du diamètre de l'iris
      p.irises.forEach(i => { i.style.transform = `translate(${ix.toFixed(1)}%, ${iy.toFixed(1)}%)`; });
    });
  };
  if (!reduce) requestAnimationFrame(frame);

  /* ── les chiens suivent le curseur : la position horizontale choisit l'image de la vidéo ── */
  (() => {
    const video = $('#dogs-video'), cv = $('#dogs-canvas');
    if (!video || !cv) return;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const T0 = +video.dataset.start, TF = +video.dataset.front, T1 = +video.dataset.end;
    const REST_AFTER = 3000;                 // ms sans mouvement avant de revenir de face
    const SMOOTH = 140;                      // ms : plus grand = mouvement plus doux
    const timeAt = p => p < .5 ? lerp(T0, TF, p * 2) : lerp(TF, T1, (p - .5) * 2);
    let target = .5, pos = .5, last = 0, prev = 0, ready = false;

    // le bleu du fond devient transparent, pour que le titre passe derrière les chiens
    const draw = () => {
      const w = cv.width, h = cv.height;
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h), d = img.data;
      const br = d[40 * 4 + 0 + w * 40 * 4], bg = d[40 * 4 + 1 + w * 40 * 4], bb = d[40 * 4 + 2 + w * 40 * 4];
      const lo = 26, hi = 64;
      for (let i = 0; i < d.length; i += 4) {
        const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist <= lo) { d[i + 3] = 0; continue; }
        if (dist >= hi) continue;
        const a = (dist - lo) / (hi - lo);   // bord : on retire la part de bleu
        d[i] = clamp(br + dr / a, 0, 255); d[i + 1] = clamp(bg + dg / a, 0, 255); d[i + 2] = clamp(bb + db / a, 0, 255);
        d[i + 3] = a * 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    const seek = t => { if (ready && !video.seeking && Math.abs(video.currentTime - t) > 1 / 48) video.currentTime = t; };
    video.addEventListener('seeked', draw);
    video.addEventListener('loadeddata', () => { ready = true; video.currentTime = TF; });
    // iOS ne décode une image qu'après un premier play()
    const unlock = () => { const p = video.play(); if (p) p.then(() => video.pause()).catch(() => {}); };
    addEventListener('touchstart', unlock, { once: true, passive: true });
    video.load();
    if (reduce) return;                      // image de face fixe

    const point = x => { target = clamp(x / innerWidth, 0, 1); last = performance.now(); };
    addEventListener('pointermove', e => { if (e.pointerType !== 'touch') point(e.clientX); }, { passive: true });
    addEventListener('touchstart', e => point(e.touches[0].clientX), { passive: true });
    addEventListener('touchmove', e => point(e.touches[0].clientX), { passive: true });
    const rest = () => { target = .5; };
    addEventListener('touchend', rest, { passive: true });
    document.documentElement.addEventListener('pointerleave', rest);
    addEventListener('blur', rest);

    const tick = now => {
      requestAnimationFrame(tick);
      if (hero.getBoundingClientRect().bottom <= 0) return;
      if (now - last > REST_AFTER) target = .5;
      const dt = Math.min(now - prev, 200); prev = now;
      pos = lerp(pos, target, 1 - Math.exp(-dt / SMOOTH));
      seek(timeAt(pos));
    };
    requestAnimationFrame(tick);
  })();

  /* ── le texte qui s'allume au défilement ── */
  const st = $('#statement');
  const hl = new Set(['courir,', 'jouer', 'apprendre,']);
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="wd${hl.has(w) ? ' hl' : ''}">${w}</span>`).join(' ');
  const wds = $$('.wd', st);
  const litWords = () => {
    const r = st.getBoundingClientRect(), vh = innerHeight;
    const p = clamp((vh * .88 - r.top) / (r.height + vh * .34), 0, 1);
    const n = Math.round(p * wds.length);
    wds.forEach((w, i) => w.classList.toggle('on', reduce || i < n));
  };

  /* ── services : les panneaux reculent quand le suivant arrive ── */
  const panels = $$('.panel');
  const stackFx = () => {
    if (reduce) return;
    panels.forEach((p, i) => {
      const next = panels[i + 1];
      if (!next) return;
      const a = p.getBoundingClientRect(), b = next.getBoundingClientRect();
      const cover = clamp(1 - (b.top - a.top) / a.height, 0, 1);
      p.style.transform = `scale(${(1 - cover * .06).toFixed(4)})`;
      p.style.filter = cover > .02 ? `brightness(${(1 - cover * .22).toFixed(3)})` : '';
    });
  };

  /* ── première visite : défilement horizontal ── */
  const visit = $('.visit'), track = $('#track'), fill = $('#fill'), vball = $('#vball'), rail = $('.visit-rail');
  const visitFx = () => {
    if (reduce) return;
    const r = visit.getBoundingClientRect(), vh = innerHeight;
    const p = clamp(-r.top / (r.height - vh), 0, 1);
    const max = Math.max(0, track.scrollWidth - innerWidth);
    track.style.transform = `translateX(${(-p * max).toFixed(1)}px)`;
    fill.style.transform = `scaleX(${p.toFixed(4)})`;
    const w = rail.clientWidth;
    vball.style.transform = `translateX(${(p * w).toFixed(1)}px) rotate(${(p * w * 1.4).toFixed(1)}deg)`;
  };

  /* ── avis (textes tels que publiés sur Google) ── */
  const reviews = [
    { n: 'Cathy Loucha', q: 'Dog\'S Factory, c est "la boum des chiens"! A la crèche comme en pension ils jouent toute la journée comme des petits fous encadrés par des professionnels passionnés et très sympas. Notre chienne Tembo adore y aller!' },
    { n: 'Jean Luc Delhaye', q: 'Endroit parfait pour les chiens . J’étais inquiet la première fois mais maintenant j y vais sans souci . On sent bien que Enrique et son équipe adorent les chiens .' },
    { n: 'Zoé Bertaux', q: 'Depuis que j’ai fait appel à Enrique, le comportement de mon chien a radicalement changé ! Voilà presque un an que nous travaillons ensemble et ses conseils se sont toujours révélés judicieux, applicables et surtout bienveillants.' },
    { n: 'Catherine Coremans', q: 'La crèche de mes chiens, je recommande vivement! Un de mes chiens a pu travailler son agressivité avant d\'y être admis, il est plus serein à présent.' },
    { n: 'Pierre Duvivier', q: 'Cela fait 1 mois que notre petit Snoopy de 5 mois suit les cours d’éducation chez Dog’s factory et il a déjà fait de beaux progrès. Il est suivit par une super coach, professionnelle, gentille, patiente et qui donne d’excellents conseils.' },
    { n: 'Isabel Fuentes', q: 'Our dog can literally tell when we are on our way there and she is always soooo happy!', lang: 'en' },
    { n: 'antoine gailly', q: 'Ma chienne y va depuis toute petite et je recommande chaudement, car l\'équipe est super et l\'environnement parfait pour que les chiens s\'éclatent la journée.' },
    { n: 'Pascale Lefevre', q: 'Très contente de cet endroit,Shania y retourne avec plaisir !' }
  ];
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bubble = (r, hidden) => `<figure class="bubble"${hidden ? ' aria-hidden="true"' : ''}><blockquote${r.lang ? ` lang="${r.lang}"` : ''}>${esc(r.q)}</blockquote><p>${esc(r.n)}<span>Avis Google</span></p></figure>`;
  const fillRow = (el, list) => { el.innerHTML = list.map(r => bubble(r)).join('') + list.map(r => bubble(r, true)).join(''); };
  fillRow($('#row-a'), reviews.slice(0, 4));
  fillRow($('#row-b'), reviews.slice(4).concat(reviews.slice(0, 1)));
  const rows = $('#rows'), pause = $('#pause');
  pause.addEventListener('click', () => {
    const on = rows.classList.toggle('is-paused');
    pause.setAttribute('aria-pressed', on); pause.textContent = on ? 'Relancer' : 'Mettre en pause';
  });

  /* ── onglets des tarifs ── */
  const tabs = $$('.pr-tabs [role=tab]'), led = $$('.pr-panels .ledger');
  const select = (i, focus) => {
    tabs.forEach((b, j) => { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
    led.forEach((p, j) => { p.hidden = j !== i; });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => select(i));
    b.addEventListener('keydown', e => {
      const n = tabs.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % n, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + n) % n, true); }
    });
  });

  /* ── boucle de défilement ── */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { litWords(); stackFx(); visitFx(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  litWords(); stackFx(); visitFx();
})();
