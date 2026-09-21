// Game «Invasión»: Space Invaders seen from behind the ship. This file owns the state, the rules
// and the loop; scene.js draws the 3D, hud.js the DOM on top, input.js listens.
// Everything random comes from a seeded generator kept in the state, so a run is a pure function
// of its seed and its inputs. For checking:
//   index.html?game=1            opens the game straight away
//   index.html?game=1&at=12      plays 12 s with an autopilot (it sweeps and fires), draws that one
//                                frame and stops. With the browser pane hidden requestAnimationFrame
//                                runs in fits, so a live capture would lie.
//   &wave=5 starts at wave 5, &boss=1 starts at the first mothership. Both work with or without at=.
const Game = (() => {
  const COLS = 8, ROWS = 5, DX = 3.2, DZ = 3.0, R = 1.4;   // formation grid; saucer radius (scene.js draws it this big)
  const KIND = ["cigar", "cigar", "bottle", "bottle", "boss"]; // by row, front to back
  const POINTS = { cigar: 10, bottle: 20, boss: 40 };
  const FIELD = 17;          // the formation turns around at ±FIELD
  const START_Z = -18;       // where the front row starts on wave 1; later waves start closer
  const STEP_Z = 1.2;        // one step toward the ship at every turn
  const LOSE_Z = -3;         // a goblin here has landed: game over
  const SPEED = 1.8;         // formation, units/s with all 40 alive; ×4 with the last one
  const SHIP = { limit: 15.5, speed: 17, half: 1.4, lives: 3, respawn: 1.2, safe: 2.2, start: -4.75 };
  const SHOT = { speed: 55, every: 0.22, max: 4, far: -50 };
  const BOMB = { max: 16, speed: 13, half: 0.3 };            // what the goblins drop
  const SHIELD = { xs: [-9.5, 0, 9.5], z: -7, cols: 6, rows: 3, w: 0.75, d: 0.7 };
  const UFO = { z: -38, speed: 8, edge: 27, half: 2.2, points: [50, 100, 150, 300] };
  const MOTHER = { every: 3, z: -22, halfX: 6.2, halfZ: 3.4, die: 1.4 };
  const DIE = 0.28;          // seconds a shot saucer takes to spin away
  const STEP = 1 / 60;       // the ?at= simulation step
  const STORE = "hearth-invasion";

  let layer = null, onExit = null, view = null, hud = null, s = null;
  let raf = 0, last = 0, paused = false, frozen = false, firstWave = 1;

  // the record survives reboots; if storage fails the game just plays without one
  function loadBest() {
    try { return +JSON.parse(localStorage.getItem(STORE) || "{}").best || 0; } catch { return 0; }
  }
  function saveBest(best) {
    if (frozen) return; // the autopilot doesn't get to set records
    try { localStorage.setItem(STORE, JSON.stringify({ best })); } catch {}
  }

  function newState() {
    return {
      t: 0, seed: frozen ? 1 : (Date.now() & 0x7fffffff) || 1,
      wave: firstWave - 1, score: 0, best: loadBest(), newBest: false, kills: 0,
      lives: SHIP.lives, maxLives: SHIP.lives, dieTime: DIE,
      // it starts in the gap between two shields, so the first shots don't go into your own cover
      ship: { x: SHIP.start, vx: 0, target: SHIP.start, speed: SHIP.speed, cool: 0, dead: 0, safe: 0, respawn: SHIP.respawn },
      form: { x: 0, z: START_Z, zTarget: START_Z, dir: 1, fast: 1 },
      enemies: [], cells: [], ufo: null, mother: null,
      bullets: Array.from({ length: SHOT.max }, () => ({ x: 0, z: 0, live: false })),
      bombs: Array.from({ length: BOMB.max }, () => ({ x: 0, z: 0, vx: 0, vz: 0, live: false })),
      bombIn: 2, ufoIn: 14,
      next: 0,     // when > 0: seconds until the next wave comes in
      over: "",    // "" while playing, then why it ended: "landed" | "shot"
      overT: 0,    // seconds the world keeps moving after that, before the loop stops
      msg: null,   // { text, until }
    };
  }

  // mulberry32, with its state in s.seed
  function rnd() {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const say = (text, secs = 2.2) => { s.msg = { text, until: s.t + secs }; };

  // ---- waves ----
  const isMotherWave = (n) => n % MOTHER.every === 0;
  const level = () => s.wave - 1 - Math.floor(s.wave / MOTHER.every); // formations already beaten

  function spawnWave() {
    const first = s.wave < firstWave;
    s.wave++;
    s.enemies = [];
    s.bombIn = 1.6;
    // fresh shields at the start and after every mothership
    if (first || s.wave % MOTHER.every === 1) buildShields();
    if (isMotherWave(s.wave)) {
      const n = s.wave / MOTHER.every, hp = 16 + 8 * n;
      s.mother = { n, x: 0, z: -70, t: 0, hp, max: hp, flash: 0, dying: 0, dieTime: MOTHER.die, volley: 0, fireIn: 3 };
      say("Ahí viene la nodriza…", 2.8);
      return;
    }
    const lv = level(), z = START_Z + Math.min(lv, 6);
    s.form = { x: 0, z, zTarget: z, dir: 1, fast: 1 + 0.12 * lv };
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        s.enemies.push({ row, col, kind: KIND[row], alive: true, dying: 0, x: 0, z: 0 });
      }
    }
    placeEnemies();
    if (!first) say(`Oleada ${s.wave}`, 1.8);
  }
  function placeEnemies() {
    for (const e of s.enemies) {
      e.x = s.form.x + (e.col - (COLS - 1) / 2) * DX;
      e.z = s.form.z - e.row * DZ;
    }
  }
  function buildShields() {
    s.cells = [];
    for (const cx of SHIELD.xs) {
      for (let r = 0; r < SHIELD.rows; r++) {
        for (let c = 0; c < SHIELD.cols; c++) {
          s.cells.push({ x: cx + (c - (SHIELD.cols - 1) / 2) * SHIELD.w, z: SHIELD.z + (r - (SHIELD.rows - 1) / 2) * SHIELD.d, live: true });
        }
      }
    }
  }

  function bomb(x, z, vx, vz) {
    const b = s.bombs.find((b) => !b.live);
    if (b) Object.assign(b, { x, z, vx, vz, live: true });
  }

  function score(n) {
    s.score += n;
    if (s.score > s.best) { s.best = s.score; s.newBest = true; }
  }
  function gameOver(why) {
    s.over = why;
    s.overT = 1.3;
    s.ship.vx = 0;
    if (s.newBest) saveBest(s.best);
  }
  function shipHit() {
    s.lives--;
    s.ship.dead = SHIP.respawn;
    s.ship.vx = 0;
    s.bombs.forEach((b) => { b.live = false; });
    if (s.lives <= 0) return gameOver("shot");
    say("¡Me dieron, me dieron!", 1.6);
  }

  // the ?at= pilot: sweeps the field and never lets go of the trigger
  const autopilot = (t) => ({ axis: Math.cos(t * 0.8) > 0 ? 1 : -1, fire: true, touching: false, drag: 0 });

  // does a shot that went from z0 to z1 this step (either direction) cross something at z, ±half?
  const crossed = (z0, z1, z, half) => z <= Math.max(z0, z1) + half && z >= Math.min(z0, z1) - half;

  function step(dt, c) {
    s.t += dt;
    for (const e of s.enemies) if (e.dying > 0) e.dying = Math.max(0, e.dying - dt);
    if (s.ufo && s.ufo.dying > 0 && (s.ufo.dying -= dt) <= 0) s.ufo = null;
    if (s.over) { // the world winds down for a moment, then the loop stops
      s.overT -= dt;
      if (s.ship.dead > 0) s.ship.dead = Math.max(0.001, s.ship.dead - dt); // shot down: it stays down
      return;
    }

    // ---- ship: keys push it at full speed, a finger drags a target it chases ----
    const sh = s.ship;
    if (sh.dead > 0) {
      sh.dead -= dt;
      if (sh.dead <= 0) { sh.dead = 0; sh.safe = SHIP.safe; }
    } else {
      let want;
      if (c.touching) {
        sh.target = clamp(sh.target + c.drag * SHIP.limit * 2.6, -SHIP.limit, SHIP.limit);
        want = clamp((sh.target - sh.x) * 10, -SHIP.speed * 1.5, SHIP.speed * 1.5);
      } else {
        want = c.axis * SHIP.speed;
        sh.target = sh.x;
      }
      sh.vx += (want - sh.vx) * Math.min(1, dt * 9);
      sh.x += sh.vx * dt;
      if (Math.abs(sh.x) > SHIP.limit) { sh.x = clamp(sh.x, -SHIP.limit, SHIP.limit); sh.vx = 0; }
      sh.safe = Math.max(0, sh.safe - dt);
      sh.cool -= dt;
      if (c.fire && sh.cool <= 0) {
        const b = s.bullets.find((b) => !b.live);
        if (b) { b.live = true; b.x = sh.x; b.z = -1.8; sh.cool = SHOT.every; }
      }
    }

    // ---- formation: sideways, a step down at each edge, faster as it thins out ----
    const alive = s.enemies.filter((e) => e.alive);
    if (alive.length) {
      const f = s.form;
      f.x += f.dir * SPEED * f.fast * (1 + 3 * (1 - alive.length / (COLS * ROWS))) * dt;
      let lo = Infinity, hi = -Infinity;
      for (const e of alive) { lo = Math.min(lo, e.col); hi = Math.max(hi, e.col); }
      const left = f.x + (lo - (COLS - 1) / 2) * DX - R, right = f.x + (hi - (COLS - 1) / 2) * DX + R;
      if ((f.dir > 0 && right >= FIELD) || (f.dir < 0 && left <= -FIELD)) {
        f.dir *= -1;
        f.zTarget += STEP_Z;
      }
      f.z += (f.zTarget - f.z) * Math.min(1, dt * 8);
      placeEnemies();

      // now and then the front goblin of some column drops one; more often on later waves
      s.bombIn -= dt;
      if (s.bombIn <= 0) {
        const lv = level();
        s.bombIn = Math.max(0.32, 1.5 - 0.11 * lv) * (0.55 + rnd() * 0.9);
        const cols = [...new Set(alive.map((e) => e.col))];
        const col = cols[(rnd() * cols.length) | 0];
        const e = alive.filter((e) => e.col === col).reduce((a, b) => (b.row < a.row ? b : a));
        if (e.z < SHIELD.z - 2) bomb(e.x, e.z + R, 0, Math.min(22, BOMB.speed + lv));
      }

      // the mystery saucer crosses far behind them
      if (!s.ufo && (s.ufoIn -= dt) <= 0 && alive.length > 6) {
        const dir = rnd() < 0.5 ? 1 : -1;
        s.ufo = { x: -dir * UFO.edge, z: UFO.z, dir, dying: 0, points: UFO.points[(rnd() * UFO.points.length) | 0] };
        s.ufoIn = 16 + rnd() * 12;
      }
    }
    if (s.ufo && !s.ufo.dying) {
      s.ufo.x += s.ufo.dir * UFO.speed * dt;
      if (Math.abs(s.ufo.x) > UFO.edge) s.ufo = null;
    }

    // ---- mothership: glides in, then weaves and fires fans at the ship ----
    const m = s.mother;
    if (m) {
      m.flash = Math.max(0, m.flash - dt);
      if (m.dying > 0) {
        if ((m.dying -= dt) <= 0) { s.mother = null; s.next = 1.2; }
      } else {
        m.t += dt;
        const arrive = Math.min(1, m.t / 2.5), ease = 1 - (1 - arrive) * (1 - arrive);
        m.x = Math.sin(m.t * (0.55 + 0.05 * m.n)) * 11 * ease;
        m.z = -70 + (MOTHER.z + 70) * ease + Math.sin(m.t * 0.4) * 3 * ease;
        if ((m.fireIn -= dt) <= 0) {
          m.fireIn = Math.max(0.8, 1.5 - 0.12 * m.n);
          const wide = ++m.volley % 3 === 0, n = wide ? 5 : 3, spread = wide ? 5 : 2.6, vz = 15 + m.n;
          const aim = clamp(((s.ship.x - m.x) * vz) / -m.z, -9, 9); // sideways speed that lands on the ship
          for (let i = 0; i < n; i++) bomb(m.x + (i - (n - 1) / 2) * 1.2, m.z + 4, aim + (i - (n - 1) / 2) * spread, vz);
        }
      }
    }

    // ---- your shots: the nearest thing in the way takes it ----
    for (const b of s.bullets) {
      if (!b.live) continue;
      const z0 = b.z;
      b.z -= SHOT.speed * dt;
      let hit = null, at = -Infinity;
      const near = (z, thing) => { if (z > at) { at = z; hit = thing; } };
      for (const c of s.cells) if (c.live && Math.abs(c.x - b.x) < SHIELD.w / 2 + 0.1 && crossed(z0, b.z, c.z, SHIELD.d / 2)) near(c.z, c);
      for (const e of alive) if (e.alive && Math.abs(e.x - b.x) <= R && crossed(z0, b.z, e.z, R)) near(e.z, e);
      if (m && !m.dying && Math.abs(m.x - b.x) <= MOTHER.halfX && crossed(z0, b.z, m.z, MOTHER.halfZ)) near(m.z, m);
      if (s.ufo && !s.ufo.dying && Math.abs(s.ufo.x - b.x) <= UFO.half && crossed(z0, b.z, s.ufo.z, UFO.half)) near(s.ufo.z, s.ufo);

      if (!hit) { if (b.z < SHOT.far) b.live = false; continue; }
      b.live = false;
      if (hit === m) {
        m.hp--;
        m.flash = 0.07;
        if (m.hp <= 0) {
          m.dying = MOTHER.die;
          s.bombs.forEach((b) => { b.live = false; });
          score(500 * m.n);
          say(`Nodriza abajo · +${500 * m.n}`, 2.4);
        }
      } else if (hit === s.ufo) {
        hit.dying = DIE;
        score(hit.points);
        say(`Platillo · +${hit.points}`, 1.6);
      } else if ("row" in hit) {
        hit.alive = false;
        hit.dying = DIE;
        s.kills++;
        score(POINTS[hit.kind]);
      } else hit.live = false; // a shield block: yes, your own shots chew it too
    }

    // ---- their shots: shields first, then you ----
    for (const b of s.bombs) {
      if (!b.live) continue;
      const z0 = b.z;
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      let cell = null;
      for (const c of s.cells) {
        if (c.live && Math.abs(c.x - b.x) < SHIELD.w / 2 + BOMB.half && crossed(z0, b.z, c.z, SHIELD.d / 2) && (!cell || c.z < cell.z)) cell = c;
      }
      if (cell) { cell.live = false; b.live = false; continue; }
      if (sh.dead <= 0 && sh.safe <= 0 && Math.abs(b.x - sh.x) < SHIP.half + BOMB.half && crossed(z0, b.z, 0, 1)) {
        b.live = false;
        shipHit();
        if (s.over) return;
        break; // shipHit cleared the rest
      }
      if (b.z > 6 || Math.abs(b.x) > 30) b.live = false;
    }

    // saucers flatten whatever shield they reach
    for (const e of alive) {
      if (!e.alive || e.z + R < SHIELD.z - SHIELD.d * 1.5) continue;
      for (const c of s.cells) if (c.live && Math.abs(c.x - e.x) < R && Math.abs(c.z - e.z) < R) c.live = false;
    }

    // ---- wave over, or game over ----
    if (s.next > 0) {
      if ((s.next -= dt) <= 0) spawnWave();
    } else if (alive.some((e) => e.alive && e.z >= LOSE_Z)) {
      gameOver("landed");
    } else if (!m && !s.enemies.some((e) => e.alive)) {
      s.next = 1.6;
      say("Limpio, bro. Vienen más");
    }
  }

  function draw(dt) {
    view.render(s, dt);
    hud.update(s);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); // a stalled tab must not teleport anything
    last = now;
    step(dt, GameInput.read());
    draw(dt);
    if (s.over && s.overT <= 0) halt(); // Game Over is a still picture: nothing left to animate
  }
  function run() {
    if (raf || paused || frozen) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function halt() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  // on = true/false, or nothing to toggle. While paused nothing is drawn at all.
  function pause(on) {
    if (!s || frozen || s.over) return;
    paused = on === undefined ? !paused : !!on;
    hud.paused(paused);
    paused ? halt() : run();
  }

  function retry() {
    if (!s || !s.over || frozen) return;
    s = newState();
    spawnWave();
    say("Otra, otra", 1.8);
    run();
  }

  // taps inside the game must never reach Hearth's own handler, which opens the panel
  const swallow = (e) => e.stopPropagation();
  const onResize = () => { if (view) { view.resize(); if (!raf) draw(Infinity); } };

  // o: { layer, onExit }. Throws if WebGL is not there; nothing is left behind in that case.
  function open(o) {
    if (s) return;
    layer = o.layer;
    onExit = o.onExit;
    const q = new URLSearchParams(location.search);
    frozen = q.has("at");
    firstWave = q.has("boss") ? MOTHER.every : Math.max(1, Math.floor(+q.get("wave")) || 1);
    paused = false;
    try {
      view = GameScene.create(layer, {
        counts: { cigar: COLS * 2, bottle: COLS * 2, boss: COLS }, bullets: SHOT.max, bombs: BOMB.max,
        cells: SHIELD.xs.length * SHIELD.cols * SHIELD.rows, cell: [SHIELD.w, SHIELD.d],
      });
    } catch (err) {
      layer = onExit = view = null;
      throw err;
    }
    s = newState();
    spawnWave();
    hud = GameHud.create(layer, { pause: () => pause(), exit: close, retry });
    layer.addEventListener("pointerdown", swallow);
    addEventListener("resize", onResize);
    GameInput.attach(view.canvas, { pause: () => pause(), exit: close, confirm: retry });

    if (frozen) {
      const n = Math.round(Math.max(0, +q.get("at") || 0) / STEP);
      for (let i = 0; i < n; i++) step(STEP, autopilot(s.t));
      draw(Infinity);
    } else {
      if (!s.mother) say("¡Vámonos, que llegaron los duendes!", 2.6);
      run();
    }
  }

  // back to the fire: the loop stops, the WebGL context goes, the layer is left empty
  function close() {
    if (!s) return;
    halt();
    GameInput.detach();
    layer.removeEventListener("pointerdown", swallow);
    removeEventListener("resize", onResize);
    view.dispose();
    hud.remove();
    const done = onExit;
    s = view = hud = layer = onExit = null;
    paused = frozen = false;
    if (done) done();
  }

  // for checking from the console
  const snapshot = () => (s ? {
    open: true, looping: !!raf, paused, frozen, t: +s.t.toFixed(2), wave: s.wave, kills: s.kills,
    score: s.score, best: s.best, lives: s.lives, over: s.over,
    alive: s.enemies.filter((e) => e.alive).length, shots: s.bullets.filter((b) => b.live).length,
    bombs: s.bombs.filter((b) => b.live).length, cells: s.cells.filter((c) => c.live).length,
    ufo: s.ufo ? +s.ufo.x.toFixed(1) : null, mother: s.mother ? { hp: s.mother.hp, z: +s.mother.z.toFixed(1) } : null,
    shipX: +s.ship.x.toFixed(2), formZ: +s.form.z.toFixed(2),
  } : { open: false, looping: !!raf });

  return { open, close, pause, snapshot, isOpen: () => !!s };
})();
