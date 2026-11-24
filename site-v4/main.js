/* Dog's Factory — v4 */
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
  const menu = $('#menu'), toggles = $$('.nav-toggle');
  const setMenu = (open) => {
    menu.hidden = !open; toggles.forEach(t => t.setAttribute('aria-expanded', open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggles.forEach(t => t.addEventListener('click', () => setMenu(menu.hidden)));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  /* ── le titre du hero bouge légèrement avec le curseur ── */
  const hero = $('.hero'), title = $('.hero-title');
  if (!reduce && fine) {
    const m = { x: .5, y: .5, tx: .5, ty: .5 };
    addEventListener('pointermove', e => { m.tx = e.clientX / innerWidth; m.ty = e.clientY / innerHeight; }, { passive: true });
    const frame = () => {
      requestAnimationFrame(frame);
      if (hero.getBoundingClientRect().bottom <= 0 || innerWidth <= 760) return;
      m.x = lerp(m.x, m.tx, .13); m.y = lerp(m.y, m.ty, .13);
      title.style.transform = `translate(${((.5 - m.x) * 26).toFixed(1)}px, ${((.5 - m.y) * 14).toFixed(1)}px)`;
    };
    requestAnimationFrame(frame);
  }

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
      const lo = 26, hi = 64, shadowFrom = Math.round(h * .74) * w * 4;
      for (let i = 0; i < d.length; i += 4) {
        const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist <= lo) { d[i + 3] = 0; continue; }
        // l'ombre bleue au sol devient une ombre neutre, pour tenir sur le disque jaune
        if (i >= shadowFrom && d[i + 2] > d[i] * 1.3 && d[i + 2] > d[i + 1] * 1.12) {
          d[i] = 14; d[i + 1] = 22; d[i + 2] = 32; d[i + 3] = Math.min(1, dist / 110) * 72;
          continue;
        }
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

  /* ── apparition au défilement ── */
  const rs = $$('[data-r]');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rs.forEach(el => io.observe(el));
  } else rs.forEach(el => el.classList.add('in'));

  /* ── services : une ligne ouverte à la fois ── */
  const svcs = $$('.svc');
  svcs.forEach(s => $('.svc-head', s).addEventListener('click', () => {
    const open = !s.classList.contains('is-open');
    svcs.forEach(o => { const on = o === s && open; o.classList.toggle('is-open', on); $('.svc-head', o).setAttribute('aria-expanded', on); });
  }));

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
  const rv = $('#rv'), names = $('#rv-names'), count = $('#rv-count');
  const quote = $('blockquote', rv), cap = $('figcaption', rv);
  names.innerHTML = reviews.map((r, i) => `<li><button type="button" data-i="${i}"></button></li>`).join('');
  const nameBtns = $$('button', names);
  nameBtns.forEach((b, i) => { b.textContent = reviews[i].n; b.addEventListener('click', () => show(i)); });
  let cur = -1, swapTimer;
  const paint = i => {
    const r = reviews[i];
    quote.textContent = r.q; r.lang ? quote.setAttribute('lang', r.lang) : quote.removeAttribute('lang');
    cap.textContent = r.n;
    count.textContent = `${i + 1} / ${reviews.length}`;
  };
  function show(i) {
    i = (i + reviews.length) % reviews.length;
    if (i === cur) return;
    const first = cur < 0; cur = i;
    nameBtns.forEach((b, j) => b.setAttribute('aria-current', j === i));
    if (first || reduce) return paint(i);
    rv.classList.add('is-out');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => { paint(cur); rv.classList.remove('is-out'); }, 220);
  }
  $('#rv-prev').addEventListener('click', () => show(cur - 1));
  $('#rv-next').addEventListener('click', () => show(cur + 1));
  show(0);

  /* ── défilement : barre fixe et bande de mots ── */
  const bar = $('#bar'), run = $('#run');
  const update = () => {
    const on = scrollY > hero.offsetHeight - 90;
    if (bar.classList.contains('is-on') !== on) { bar.classList.toggle('is-on', on); bar.inert = !on; }
    if (!reduce) {
      const r = run.parentElement.getBoundingClientRect(), vh = innerHeight;
      if (r.bottom > 0 && r.top < vh) {
        const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
        run.style.transform = `translateX(${(-p * (run.scrollWidth - innerWidth)).toFixed(1)}px)`;
      }
    }
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();
