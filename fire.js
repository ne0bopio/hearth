// Fire: the classic demo-scene fire. A small grid of heat values: the bottom rows are
// the "logs", and every cell above takes the average of the cells beneath it minus a
// little cooling. A noise map makes the cooling uneven, which splits the glow into
// flame tongues. The grid is tiny (~200x120), drawn smoothed onto a half-resolution
// canvas, and CSS stretches that to the screen: cheap enough for an old PC at 30 fps.
const Fire = (() => {
  const H = 120;
  const opt = { height: 0.6, warmth: 0.5, fade: 1 }; // fade: 1 = full fire, 0 = out (sleep)
  const palette = new Uint32Array(256);
  let W, heat, cool, coolOff = 0, ticks = 0;
  let canvas, ctx, sim, sctx, img, pix;
  let ecv, ectx, embers = [];
  let wind = 0, windTarget = 0, last = 0, paused = false;

  function init(fireCanvas, emberCanvas) {
    canvas = fireCanvas;
    ctx = canvas.getContext("2d", { alpha: false });
    sim = document.createElement("canvas");
    sctx = sim.getContext("2d");
    ecv = emberCanvas;
    ectx = ecv.getContext("2d");
    resize();
    addEventListener("resize", resize);
    buildPalette();
    requestAnimationFrame(frame);
  }

  function resize() {
    W = Math.max(100, Math.round((H * innerWidth) / innerHeight));
    sim.width = W;
    sim.height = H;
    img = sctx.createImageData(W, H);
    pix = new Uint32Array(img.data.buffer);
    heat = new Float32Array(W * H);
    cool = coolingMap(W, H);

    canvas.width = Math.ceil(innerWidth / 2);
    canvas.height = Math.ceil(innerHeight / 2);
    ctx.imageSmoothingEnabled = true; // resizing resets context state, so set it after
    ctx.imageSmoothingQuality = "high";

    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    ecv.width = innerWidth * dpr;
    ecv.height = innerHeight * dpr;
    ectx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Blurred random noise, normalized to 0..1, wrapping at the edges so it can scroll forever.
  function coolingMap(w, h) {
    let a = new Float32Array(w * h).map(Math.random);
    for (let pass = 0; pass < 4; pass++) {
      const b = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        const up = ((y + h - 1) % h) * w, mid = y * w, dn = ((y + 1) % h) * w;
        for (let x = 0; x < w; x++) {
          const l = (x + w - 1) % w, r = (x + 1) % w;
          b[mid + x] = (a[mid + x] + a[mid + l] + a[mid + r] + a[up + x] + a[dn + x]) / 5;
        }
      }
      a = b;
    }
    let mn = Infinity, mx = -Infinity;
    for (const v of a) { if (v < mn) mn = v; if (v > mx) mx = v; }
    return a.map((v) => (v - mn) / (mx - mn || 1));
  }

  // heat 0..255 -> color. Warmth pushes toward deep red (1) or gold (0).
  function buildPalette() {
    const w = opt.warmth;
    const stops = [
      [0.0, [0, 0, 0]],
      [0.08, [10, 2, 0]],
      [0.22, [110 + 40 * w, 14, 2]],
      [0.42, [225 + 30 * w, 60 - 25 * w, 4]],
      [0.65, [255, 140 - 45 * w, 20]],
      [0.87, [255, 200 - 50 * w, 70 - 30 * w]],
      [1.0, [255, 245 - 35 * w, 190 - 90 * w]],
    ];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
      const [t0, c0] = stops[k];
      const [t1, c1] = stops[k + 1];
      const f = (t - t0) / (t1 - t0);
      const r = c0[0] + (c1[0] - c0[0]) * f;
      const g = c0[1] + (c1[1] - c0[1]) * f;
      const b = c0[2] + (c1[2] - c0[2]) * f;
      palette[i] = (255 << 24) | (b << 16) | (g << 8) | r; // ABGR: little-endian pixel order
    }
  }

  function step() {
    if (Math.random() < 0.004) windTarget = (Math.random() - 0.5) * 0.6;
    wind += (windTarget - wind) * 0.01;
    // Heat rises one row per step. The noise drifts at half that speed, so rising heat
    // keeps meeting new cool pockets. At the same speed it would cut horizontal streaks.
    if (++ticks % 2 === 0) coolOff = (coolOff + 1) % H;

    // cooling per row, sized so the flames reach about `height` of the screen
    const k = (3 * 255) / (H * (0.2 + 0.8 * opt.height));

    // the logs: bottom two rows, hottest in the middle, flickering
    for (let y = H - 2; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const e = Math.sin((Math.PI * (x + 0.5)) / W);
        const hot = Math.random() < 0.8 ? 200 + Math.random() * 55 : 90;
        heat[row + x] = hot * (0.35 + 0.65 * e) * opt.fade;
      }
    }

    // top-down, so every row reads rows below that haven't moved yet this step
    const wl = 1 + wind, wr = 1 - wind; // wind leans the average left or right
    for (let y = 0; y < H - 2; y++) {
      const row = y * W, b1 = row + W, b2 = b1 + W, crow = ((y + coolOff) % H) * W;
      for (let x = 0; x < W; x++) {
        const l = x > 0 ? x - 1 : 0, r = x < W - 1 ? x + 1 : W - 1;
        const c = cool[crow + x];
        const v = (heat[b1 + l] * wl + 2 * heat[b1 + x] + heat[b1 + r] * wr + heat[b2 + x]) / 5
          - c * c * k * (0.5 + Math.random());
        heat[row + x] = v > 0 ? v : 0;
      }
    }
  }

  function drawEmbers(dt) {
    const w = innerWidth, h = innerHeight;
    if (embers.length < 36 && Math.random() < 0.22 * opt.fade) {
      embers.push({
        x: w * (0.25 + Math.random() * 0.5), y: h + 8,
        vx: (Math.random() - 0.5) * 20, vy: -(40 + Math.random() * 90),
        life: 0, max: 2 + Math.random() * 4, r: 0.8 + Math.random() * 1.8, ph: Math.random() * 6,
      });
    }
    ectx.clearRect(0, 0, w, h);
    ectx.globalCompositeOperation = "lighter";
    embers = embers.filter((p) => {
      p.life += dt;
      p.ph += dt * 2;
      p.x += (p.vx + Math.sin(p.ph) * 18 + wind * 60) * dt;
      p.y += p.vy * dt;
      const a = 1 - p.life / p.max;
      if (a <= 0) return false;
      ectx.fillStyle = `rgba(255,${(150 + a * 80) | 0},60,${a * 0.9})`;
      ectx.beginPath();
      ectx.arc(p.x, p.y, p.r, 0, 6.283);
      ectx.fill();
      return true;
    });
  }

  function frame(now) {
    if (paused) return;
    requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < 33) return; // cap at ~30 fps
    last = now;
    step();
    step();
    for (let i = 0; i < pix.length; i++) {
      const h = heat[i];
      pix[i] = palette[h > 255 ? 255 : h | 0];
    }
    sctx.putImageData(img, 0, 0);
    ctx.drawImage(sim, 0, 0, canvas.width, canvas.height);
    drawEmbers(Math.min(dt, 100) / 1000);
  }

  function set(o) {
    Object.assign(opt, o);
    if ("warmth" in o) buildPalette();
  }

  // stop drawing: for good when the video fire takes over, for a while when the game opens
  const pause = () => { paused = true; };
  const resume = () => {
    if (!paused) return;
    paused = false;
    requestAnimationFrame(frame);
  };

  return { init, set, pause, resume };
})();
