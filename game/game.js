// Game «Invasión»: Space Invaders seen from behind the ship. This file owns the state, the rules
// and the loop; scene.js draws, input.js listens. Phase 1: one formation that comes down and dies.
// For checking: index.html?game=1 opens the game straight away, and ?game=1&at=12 plays 12 s with an
// autopilot (it sweeps and fires), draws that one frame and stops. With the browser pane hidden
// requestAnimationFrame runs in fits, so a live capture would lie.
const Game = (() => {
  const COLS = 8, ROWS = 5, DX = 3.2, DZ = 3.0, R = 1.4;   // formation grid; saucer radius (scene.js draws it this big)
  const KIND = ["cigar", "cigar", "bottle", "bottle", "boss"]; // by row, front to back
  const FIELD = 17;          // the formation turns around at ±FIELD
  const START_Z = -18;       // where the front row starts
  const STEP_Z = 1.2;        // one step toward the ship at every turn
  const LOSE_Z = -3;         // a goblin here has landed
  const SPEED = 1.8;         // formation, units/s with all 40 alive; ×4 with the last one
  const SHIP = { limit: 15.5, speed: 17 };
  const SHOT = { speed: 55, every: 0.22, max: 4, far: -50 };
  const DIE = 0.28;          // seconds a shot saucer takes to spin away
  const STEP = 1 / 60;       // the ?at= simulation step

  let layer = null, onExit = null, view = null, ui = {}, s = null;
  let raf = 0, last = 0, paused = false, frozen = false;

  function newState() {
    return {
      t: 0, wave: 0, kills: 0, dieTime: DIE,
      ship: { x: 0, vx: 0, target: 0, speed: SHIP.speed, cool: 0 },
      form: { x: 0, z: START_Z, zTarget: START_Z, dir: 1 },
      enemies: [], bullets: Array.from({ length: SHOT.max }, () => ({ x: 0, z: 0, live: false })),
      next: 0,   // when > 0: seconds until the next wave comes in
      msg: null, // { text, until }
    };
  }

  function spawnWave() {
    s.wave++;
    s.form = { x: 0, z: START_Z, zTarget: START_Z, dir: 1 };
    s.enemies = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        s.enemies.push({ row, col, kind: KIND[row], alive: true, dying: 0, x: 0, z: 0 });
      }
    }
    placeEnemies();
  }
  function placeEnemies() {
    for (const e of s.enemies) {
      e.x = s.form.x + (e.col - (COLS - 1) / 2) * DX;
      e.z = s.form.z - e.row * DZ;
    }
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const say = (text, secs = 2.2) => { s.msg = { text, until: s.t + secs }; };

  // the ?at= pilot: sweeps the field and never lets go of the trigger
  const autopilot = (t) => ({ axis: Math.cos(t * 0.8) > 0 ? 1 : -1, fire: true, touching: false, drag: 0 });

  function step(dt, c) {
    s.t += dt;

    // ship: keys push it at full speed, a finger drags a target it chases
    const sh = s.ship;
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

    // shooting
    sh.cool -= dt;
    if (c.fire && sh.cool <= 0) {
      const b = s.bullets.find((b) => !b.live);
      if (b) { b.live = true; b.x = sh.x; b.z = -1.8; sh.cool = SHOT.every; }
    }

    // formation: sideways, a step down at each edge, faster as it thins out
    const alive = s.enemies.filter((e) => e.alive);
    if (alive.length) {
      const f = s.form;
      f.x += f.dir * SPEED * (1 + 3 * (1 - alive.length / (COLS * ROWS))) * dt;
      let lo = Infinity, hi = -Infinity;
      for (const e of alive) { lo = Math.min(lo, e.col); hi = Math.max(hi, e.col); }
      const left = f.x + (lo - (COLS - 1) / 2) * DX - R, right = f.x + (hi - (COLS - 1) / 2) * DX + R;
      if ((f.dir > 0 && right >= FIELD) || (f.dir < 0 && left <= -FIELD)) {
        f.dir *= -1;
        f.zTarget += STEP_Z;
      }
      f.z += (f.zTarget - f.z) * Math.min(1, dt * 8);
      placeEnemies();
    }
    for (const e of s.enemies) if (e.dying > 0) e.dying = Math.max(0, e.dying - dt);

    // bullets, swept along z so a fast one can't skip over a saucer
    for (const b of s.bullets) {
      if (!b.live) continue;
      const z0 = b.z;
      b.z -= SHOT.speed * dt;
      let hit = null;
      for (const e of alive) {
        if (!e.alive || Math.abs(e.x - b.x) > R || e.z > z0 + R || e.z < b.z - R) continue;
        if (!hit || e.z > hit.z) hit = e; // the nearest one takes it
      }
      if (hit) {
        hit.alive = false;
        hit.dying = DIE;
        b.live = false;
        s.kills++;
      } else if (b.z < SHOT.far) b.live = false;
    }

    // wave over, one way or the other. Phase 1 has no lives yet: the next formation just comes in.
    if (s.next > 0) {
      s.next -= dt;
      if (s.next <= 0) spawnWave();
    } else if (!s.enemies.some((e) => e.alive)) {
      s.next = 1.6;
      say("Limpio, bro. Vienen más");
    } else if (alive.some((e) => e.alive && e.z >= LOSE_Z)) {
      s.enemies.forEach((e) => { if (e.alive) { e.alive = false; e.dying = DIE; } });
      s.next = 1.6;
      say("Te pasaron por encima");
    }
  }

  function draw(dt) {
    view.render(s, dt);
    const text = s.msg && s.t < s.msg.until ? s.msg.text : "";
    if (ui.msg.textContent !== text) { ui.msg.textContent = text; ui.msg.hidden = !text; }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); // a stalled tab must not teleport anything
    last = now;
    step(dt, GameInput.read());
    draw(dt);
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
    if (!s || frozen) return;
    paused = on === undefined ? !paused : !!on;
    ui.pause.hidden = !paused;
    ui.pauseBtn.setAttribute("aria-pressed", String(paused));
    paused ? halt() : run();
  }

  function buildHud() {
    const hud = document.createElement("div");
    hud.className = "g-ui";
    hud.innerHTML = `
      <div class="g-top">
        <div class="g-title">Invasión</div>
        <div class="row">
          <button class="chip" data-g="pause">Pausa</button>
          <button class="chip" data-g="exit">Salir</button>
        </div>
      </div>
      <div class="g-msg" hidden></div>
      <div class="g-help">← → mover · Espacio disparar · P pausa · Esc salir<br>Táctil: arrastra el dedo, dispara solo</div>
      <div class="g-pause" hidden><div class="big">Pausa</div><div class="hint">P o el botón para seguir</div></div>`;
    layer.appendChild(hud);
    ui = { hud, msg: hud.querySelector(".g-msg"), pause: hud.querySelector(".g-pause"), pauseBtn: hud.querySelector('[data-g="pause"]') };
    ui.pauseBtn.addEventListener("click", (e) => { e.currentTarget.blur(); pause(); });
    hud.querySelector('[data-g="exit"]').addEventListener("click", close);
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
    paused = false;
    try {
      view = GameScene.create(layer, { counts: { cigar: COLS * 2, bottle: COLS * 2, boss: COLS }, bullets: SHOT.max });
    } catch (err) {
      layer = onExit = view = null;
      throw err;
    }
    s = newState();
    spawnWave();
    buildHud();
    layer.addEventListener("pointerdown", swallow);
    addEventListener("resize", onResize);
    GameInput.attach(view.canvas, { pause: () => pause(), exit: close });

    if (frozen) {
      const n = Math.round(Math.max(0, +q.get("at") || 0) / STEP);
      for (let i = 0; i < n; i++) step(STEP, autopilot(s.t));
      draw(Infinity);
    } else {
      say("¡Vámonos, que llegaron los duendes!", 2.6);
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
    ui.hud.remove();
    const done = onExit;
    s = view = layer = onExit = null;
    ui = {};
    paused = frozen = false;
    if (done) done();
  }

  // for checking from the console
  const snapshot = () => (s ? {
    open: true, looping: !!raf, paused, frozen, t: +s.t.toFixed(2), wave: s.wave, kills: s.kills,
    alive: s.enemies.filter((e) => e.alive).length, shots: s.bullets.filter((b) => b.live).length,
    shipX: +s.ship.x.toFixed(2), formZ: +s.form.z.toFixed(2),
  } : { open: false, looping: !!raf });

  return { open, close, pause, snapshot, isOpen: () => !!s };
})();
