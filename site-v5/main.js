/* Dog's Factory — v5 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  $('#year').textContent = new Date().getFullYear();
  if (!reduce) {
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-in')));
    setTimeout(() => root.classList.add('is-in'), 400);
  }

  /* ── navigation et menu ── */
  const nav = $('#nav'), menu = $('#menu'), toggle = $('.nav-toggle'), heroEl = $('.hero');
  const stick = () => nav.classList.toggle('is-stuck', scrollY > heroEl.offsetHeight - 90);
  addEventListener('scroll', stick, { passive: true }); addEventListener('resize', stick); stick();
  const setMenu = (open) => {
    menu.hidden = !open; toggle.setAttribute('aria-expanded', open); nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

  /* ── le mur de typo : chaque ligne est étirée pour remplir toute la largeur et sa part de hauteur ── */
  const wall = $('#wall');
  const FONT = "800 200px 'Bricolage Grotesque'";
  let wallMode = '';
  const buildWall = () => {
    const mode = innerWidth / innerHeight < .85 ? 'tall' : 'wide';
    if (mode === wallMode) return; wallMode = mode;
    const rows = mode === 'tall' ? ["DOG'S", 'FAC', 'TORY'] : ["DOG'S", 'FACTORY'];
    const c = document.createElement('canvas').getContext('2d'); c.font = FONT;
    wall.innerHTML = rows.map(t => {
      const m = c.measureText(t), l = m.actualBoundingBoxLeft, r = m.actualBoundingBoxRight, a = m.actualBoundingBoxAscent, d = m.actualBoundingBoxDescent;
      return `<svg viewBox="${(-l).toFixed(1)} ${(-a).toFixed(1)} ${(l + r).toFixed(1)} ${(a + d).toFixed(1)}" preserveAspectRatio="none"><text x="0" y="0">${t}</text></svg>`;
    }).join('');
  };
  const fontReady = document.fonts && document.fonts.load ? document.fonts.load(FONT) : Promise.resolve();
  fontReady.then(() => { wallMode = ''; buildWall(); }, buildWall);
  setTimeout(buildWall, 1500);
  addEventListener('resize', buildWall);

  /* ── les chiens suivent le curseur : la position horizontale choisit l'image de la vidéo ── */
  (() => {
    const video = $('#dogs-video'), cv = $('#dogs-canvas');
    if (!video || !cv) return;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const cv2 = $('#dogs-canvas-2'), ctx2 = cv2 && cv2.getContext('2d');   // les mêmes chiens, en bas de page
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
      if (ctx2) { ctx2.clearRect(0, 0, w, h); ctx2.drawImage(cv, 0, 0); }
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
      if (now - last > REST_AFTER) target = .5;
      const dt = Math.min(now - prev, 200); prev = now;
      pos = lerp(pos, target, 1 - Math.exp(-dt / SMOOTH));
      seek(timeAt(pos));
    };
    requestAnimationFrame(tick);
  })();

  /* ── le mot qui change : courir, jouer, apprendre ── */
  const words = $$('#roll span');
  if (!reduce && words.length) {
    let wi = 0;
    setInterval(() => {
      const out = words[wi]; wi = (wi + 1) % words.length; const inn = words[wi];
      out.classList.remove('on'); out.classList.add('out');
      inn.classList.remove('out'); inn.classList.add('on');
      setTimeout(() => out.classList.remove('out'), 600);
    }, 2200);
  }

  /* ── les chiffres comptent quand ils arrivent à l'écran ── */
  const nums = $$('[data-n]');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, to = +el.dataset.n, t0 = performance.now();
      if (!to) return;
      const step = () => { const k = clamp((performance.now() - t0) / 900, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) setTimeout(step, 16); };
      step();
    }), { threshold: .6 });
    nums.forEach(n => io.observe(n));
  }

  /* ── services : le nom du service à l'écran s'allume à gauche ── */
  const spy = $$('#spy a'), svcs = $$('.svc');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) spy.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -45% 0px' });
    svcs.forEach(s => io.observe(s));
  }

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
  $('#quotes').innerHTML = reviews.map(r => `<figure class="quote"><blockquote${r.lang ? ` lang="${r.lang}"` : ''}>${esc(r.q)}</blockquote><figcaption>${esc(r.n)}</figcaption></figure>`).join('');

  /* ── la calculette ── */
  const F = {
    jour:    { unit: 29, pack: 261, one: 'journée', many: 'journées' },
    demi:    { unit: 19, pack: 171, one: 'demi-journée', many: 'demi-journées' },
    pension: { unit: 32, pack: 0,   one: 'jour de pension', many: 'jours de pension' },
    cours:   { unit: 17, pack: 153, one: 'cours', many: 'cours' }
  };
  const opts = $$('.calc-opts button'), qty = $('#qty'), total = $('#total'), note = $('#note');
  let key = 'jour', n = 3, shown = 0, raf;
  const calc = () => {
    const f = F[key], packs = f.pack ? Math.floor(n / 10) : 0;
    const sum = packs * f.pack + (n - packs * 10) * f.unit;
    qty.textContent = `${n} ${n > 1 ? f.many : f.one}`;
    note.textContent = key === 'pension' ? 'Chauffage du 1er novembre au 31 mars : +3 € par jour.'
      : packs ? `Avec ${packs > 1 ? packs + ' abonnements' : 'l’abonnement'} de 10 ${f.many} à ${f.pack} €, valable un an.`
      : `L’abonnement de 10 ${f.many} coûte ${f.pack} € au lieu de ${f.unit * 10} €.`;
    cancelAnimationFrame(raf);
    if (reduce) { shown = sum; total.textContent = sum; return; }
    const from = shown, t0 = performance.now();
    const run = t => { const k = clamp((t - t0) / 350, 0, 1); shown = Math.round(lerp(from, sum, 1 - Math.pow(1 - k, 3))); total.textContent = shown; if (k < 1) raf = requestAnimationFrame(run); };
    raf = requestAnimationFrame(run);
    setTimeout(() => { shown = sum; total.textContent = sum; }, 500);
  };
  opts.forEach(b => b.addEventListener('click', () => { key = b.dataset.k; opts.forEach(o => o.setAttribute('aria-pressed', o === b)); calc(); }));
  $('#less').addEventListener('click', () => { n = clamp(n - 1, 1, 60); calc(); });
  $('#more').addEventListener('click', () => { n = clamp(n + 1, 1, 60); calc(); });
  shown = 87; calc();
})();
