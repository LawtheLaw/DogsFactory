/* Dog's Factory — v6 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  $('#year').textContent = new Date().getFullYear();

  /* écran d'ouverture : une seule fois par visite */
  const splash = $('#splash');
  let seen = false;
  try { seen = sessionStorage.getItem('df-splash') === '1'; sessionStorage.setItem('df-splash', '1'); } catch (e) {}
  if (seen || reduce) splash.remove();
  
  setTimeout(() => splash.remove(), 2700);   // filet de sécurité si l'animation ne se termine pas

  /* ── nav et menu ── */
  const nav = $('#nav'), menu = $('#menu'), toggle = $('.nav-menu'), hero = $('.hero');
  const onScroll = () => nav.classList.toggle('is-stuck', scrollY > hero.offsetHeight - 70);
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
  const setMenu = (open) => {
    menu.hidden = !open; toggle.setAttribute('aria-expanded', open); nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

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
      if (now - last > REST_AFTER) target = .5;
      const dt = Math.min(now - prev, 200); prev = now;
      pos = lerp(pos, target, 1 - Math.exp(-dt / SMOOTH));
      seek(timeAt(pos));
    };
    requestAnimationFrame(tick);
  })();

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
  $('#strip').innerHTML = reviews.map(r => `<figure class="say"><blockquote${r.lang ? ` lang="${r.lang}"` : ''}>${esc(r.q)}</blockquote><figcaption>${esc(r.n)}</figcaption></figure>`).join('');
})();
