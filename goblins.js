// Goblins: now and then a duende walks along the hearth, stops, looks at you, holds out a cigar
// box or a bottle, and walks on. Tap one and it scurries off.
// A visit is a handful of keyframed channels (x, stride, look, offer, bubble), so every pose is a
// pure function of time. For checking: index.html?goblin=cigar&at=5 freezes a visit at 5 s.
const Goblins = (() => {
  const LINES = {
    cigar: ["Psst… ¿un cigarro?", "¿Un puro, jefe?", "Tengo de los buenos", "Uno nomás, pa' la noche"],
    bottle: ["¿Un traguito?", "¿Un shot, bro?", "Está fría, está fría", "Pa' calentar el alma"],
    shoo: ["Ya, ya, me voy", "Tú te lo pierdes", "Qué aburrido, bro"],
  };
  const C = {
    skin: "#7DC243", shade: "#4F8F24", ink: "#0A0A0A", jacket: "#161616", seam: "#353535",
    green: "#53FC18", green2: "#2E9C0C", bone: "#F2F2EE", gold: "#F5C518",
  };
  const KINDS = ["cigar", "bottle"];

  // ---- drawing: viewBox units, feet at y=0, facing right ----
  const leg = (pants) => `
    <path d="M-15 0 L15 0 L14 58 L-14 58 Z" fill="${pants}"/>
    <path d="M-16 55 L12 55 C26 57 32 64 31 74 L-16 74 Z" fill="${C.bone}"/>
    <path d="M-6 65 L20 65" stroke="${C.green}" stroke-width="5"/>`;

  const arm = (sleeve) => `
    <path d="M-13 -8 C-19 16 -17 42 -12 54 L12 54 C17 42 19 16 13 -8 Z" fill="${sleeve}"/>
    <path d="M-12 50 L12 50 L11 60 L-11 60 Z" fill="${C.green}"/>`;

  const torso = (chest) => `
    <path d="M-40 -174 C-60 -160 -63 -110 -55 -68 L55 -68 C63 -110 60 -160 40 -174 Z" fill="${C.jacket}"/>
    <path d="M-58 -136 Q0 -126 58 -136 M-60 -102 Q0 -92 60 -102 M0 -168 L0 -70" fill="none" stroke="${C.seam}" stroke-width="3"/>
    <path d="M-36 -184 Q0 -170 36 -184 L32 -158 Q0 -148 -32 -158 Z" fill="#222"/>
    <rect x="16" y="-144" width="18" height="15" fill="${C.green}"/>
    ${chest}`;

  const head = (hat, mouth) => `
    <path d="M-46 -236 C-72 -238 -94 -262 -108 -278 C-94 -236 -74 -212 -44 -204 Z" fill="${C.skin}"/>
    <path d="M46 -236 C72 -238 94 -262 108 -278 C94 -236 74 -212 44 -204 Z" fill="${C.skin}"/>
    <circle cx="-52" cy="-198" r="6" fill="none" stroke="${C.gold}" stroke-width="3.5"/>
    <path d="M-50 -250 C-52 -292 52 -292 50 -250 C50 -206 26 -172 0 -168 C-26 -172 -50 -206 -50 -250 Z" fill="${C.skin}"/>
    <path d="M-47 -244 C-47 -206 -28 -178 -2 -171 C-30 -188 -39 -214 -37 -246 Z" fill="${C.shade}" stroke="none"/>
    <g class="face">
      <g class="brows"><path d="M-40 -255 Q-25 -265 -10 -254 M40 -255 Q25 -265 10 -254" fill="none" stroke-width="7"/></g>
      <path d="M-38 -240 C-26 -254 -4 -238 -8 -222 C-18 -213 -38 -222 -38 -240 Z M38 -240 C26 -254 4 -238 8 -222 C18 -213 38 -222 38 -240 Z" fill="${C.ink}"/>
      <g class="glints" fill="#fff" stroke="none"><circle cx="-26" cy="-238" r="4"/><circle cx="18" cy="-238" r="4"/></g>
      <path d="M-3 -212 Q1 -204 6 -210" fill="none" stroke-width="3"/>
      <path d="M-22 -196 Q0 -176 24 -198 Q0 -189 -22 -196 Z" fill="${C.ink}"/>
      <path d="M-13 -193 L14 -195 L12 -189 L-11 -188 Z" fill="${C.bone}" stroke="none"/>
      <rect x="3" y="-194.5" width="6" height="6" fill="${C.gold}" stroke="none"/>
      ${mouth}
    </g>
    ${hat}`;

  const BEANIE = `
    <path d="M-55 -268 C-60 -324 60 -324 55 -268 Z" fill="${C.ink}"/>
    <path d="M-58 -282 L58 -282 L57 -262 L-57 -262 Z" fill="#1E1E1E"/>
    <rect x="-10" y="-278" width="20" height="12" fill="${C.green}" stroke="none"/>`;

  const CAP = `
    <path d="M-52 -266 C-58 -274 -82 -276 -104 -266 C-88 -258 -66 -258 -50 -260 Z" fill="${C.green2}"/>
    <path d="M-53 -266 C-58 -322 58 -322 53 -266 Z" fill="${C.green}"/>
    <path d="M-55 -274 L55 -274 L54 -262 L-54 -262 Z" fill="${C.green2}"/>
    <circle cx="0" cy="-309" r="4" fill="${C.ink}"/>`;

  const CIGAR = `
    <path d="M18 -193 L50 -201 L52 -193 L20 -186 Z" fill="#6B3F1D"/>
    <rect x="24" y="-195" width="6" height="8" fill="${C.gold}" stroke="none" transform="rotate(-14 27 -191)"/>
    <circle class="ember" cx="52" cy="-197" r="4.5" fill="#FF7A1A" stroke="none"/>
    <g class="smoke" fill="#D8D8CF" stroke="none"><circle r="0"/><circle r="0"/><circle r="0"/></g>`;

  const CHAIN = `
    <path d="M-26 -172 Q0 -132 26 -172" fill="none" stroke="${C.gold}" stroke-width="5"/>
    <circle cx="0" cy="-152" r="7" fill="${C.gold}" stroke-width="3"/>`;

  // props: origin is the hand
  const BOX = `
    <circle cx="0" cy="0" r="11" fill="${C.skin}"/>
    <path d="M-30 -36 L30 -36 L25 -64 L-25 -64 Z" fill="#9A6433"/>
    <g stroke-width="3" fill="#5A3515">
      <rect x="-26" y="-48" width="11" height="18" rx="5"/><rect x="-12" y="-50" width="11" height="18" rx="5"/>
      <rect x="2" y="-48" width="11" height="18" rx="5"/><rect x="16" y="-50" width="11" height="18" rx="5"/>
    </g>
    <path d="M-33 -38 L33 -38 L33 -9 L-33 -9 Z" fill="#7A4A22"/>
    <rect x="-13" y="-31" width="26" height="14" fill="${C.gold}" stroke-width="3"/>`;

  const BOTTLE = `
    <path d="M-5 -38 L5 -38 L4 -64 L-4 -64 Z" fill="${C.green2}"/>
    <rect x="-6" y="-73" width="12" height="10" fill="${C.gold}"/>
    <path d="M-17 18 L17 18 L20 -26 L11 -38 L-11 -38 L-20 -26 Z" fill="#B98A55"/>
    <path d="M-9 -24 L-3 -12 M6 2 L12 12" fill="none" stroke="#7E5A31" stroke-width="3"/>
    <circle cx="0" cy="0" r="11" fill="${C.skin}"/>
    <path d="M-7 -4 L7 -4" fill="none" stroke-width="2.5"/>`;

  function figure(kind) {
    const k = kind === "cigar"
      ? { hat: BEANIE, mouth: CIGAR, chest: "", prop: BOX }
      : { hat: CAP, mouth: "", chest: CHAIN, prop: BOTTLE };
    return `
      <ellipse cx="0" cy="2" rx="70" ry="9" fill="#000" opacity="0.55"/>
      <g class="bob" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
        <g class="legB">${leg("#1C1C1C")}</g>
        <g class="legF">${leg("#2A2A2A")}</g>
        <g class="armB">${arm("#0E0E0E")}<circle cx="0" cy="66" r="11" fill="${C.shade}"/></g>
        ${torso(k.chest)}
        <g class="head">${head(k.hat, k.mouth)}</g>
        <g class="armF">${arm(C.jacket)}<g class="prop">${k.prop}</g></g>
      </g>`;
  }

  // ---- channels: keys are [time, value, ease into this key] ----
  const EASE = {
    lin: (u) => u,
    in: (u) => u * u,
    out: (u) => 1 - (1 - u) * (1 - u),
    inout: (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)),
    back: (u) => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2,
  };
  function value(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e = "lin"] = keys[i];
      if (t < t1) {
        const [t0, v0] = keys[i - 1];
        return v0 + (v1 - v0) * EASE[e]((t - t0) / (t1 - t0));
      }
    }
    return keys[keys.length - 1][1];
  }

  let opt = {}, on = true, timer = null, g = null, lastKind = null;
  const lastLine = {};

  function pick(set) {
    const lines = (opt.lines && opt.lines[set]) || LINES[set];
    let line;
    do line = lines[(Math.random() * lines.length) | 0];
    while (lines.length > 1 && line === lastLine[set]);
    return (lastLine[set] = line);
  }

  function visit(kind, test) {
    if (!KINDS.includes(kind)) {
      // usually the other one than last time
      kind = lastKind && Math.random() < 0.7 ? KINDS[1 - KINDS.indexOf(lastKind)] : KINDS[(Math.random() * 2) | 0];
    }
    lastKind = kind;
    const W = innerWidth;
    const h = Math.round(Math.min(480, Math.max(200, innerHeight * 0.34)));
    const w = (h * 300) / 320;
    const dir = test || Math.random() < 0.5 ? 1 : -1;
    const stop = test ? 0.42 : 0.3 + Math.random() * 0.3;
    const x0 = dir > 0 ? -w / 2 : W + w / 2;
    const x1 = dir > 0 ? W * stop : W * (1 - stop);
    const x2 = dir > 0 ? W + w / 2 : -w / 2;
    const speed = h * 0.85; // px per second
    const brake = dir * speed * 0.18;
    const a = Math.abs(x1 - x0) / speed + 0.15; // arrives
    const b = a + 1 + 3.6;                      // puts it away
    const leave = b + 0.75;
    const out = leave + 0.35 + Math.abs(x2 - x1 - brake) / speed;

    const el = document.createElement("div");
    el.className = "goblin";
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.innerHTML = `<svg viewBox="-150 -310 300 320" style="transform:scaleX(${dir})">${figure(kind)}</svg>` +
      `<div class="bubble ${x1 < W / 2 ? "right" : "left"}"></div>`;
    const q = (s) => el.querySelector(s);
    const parts = {};
    ["bob", "legF", "legB", "armF", "armB", "prop", "head", "face", "brows", "glints", "smoke", "ember", "bubble"]
      .forEach((n) => { parts[n] = q(`.${n}`); });
    parts.bubble.textContent = pick(kind);
    opt.layer.appendChild(el);

    g = {
      kind, el, parts, dir, w, s: h / 320, speed, x0, x2, leave,
      frozen: false, shooed: false, cued: false, cueAt: a + 0.85, end: out + 0.1, t0: performance.now(),
      ch: {
        x: [[0, x0], [a - 0.35, x1 - brake], [a, x1, "out"], [leave, x1], [leave + 0.35, x1 + brake, "in"], [out, x2]],
        amp: [[0, 1], [a - 0.25, 1], [a + 0.05, 0, "inout"], [leave - 0.1, 0], [leave + 0.25, 1, "inout"]],
        look: [[0, 0], [a - 0.05, 0], [a + 0.45, 1, "out"], [b + 0.15, 1], [b + 0.6, 0, "inout"]],
        offer: [[0, 0], [a + 0.45, 0], [a + 1, 1, "back"], [b, 1], [b + 0.4, 0, "inout"]],
        bubble: [[0, 0], [a + 0.8, 0], [a + 1, 1, "out"], [b - 0.1, 1], [b + 0.1, 0, "in"]],
      },
    };
    requestAnimationFrame(frame);
  }

  const f = (n) => n.toFixed(2);

  function apply(t) {
    const v = {};
    for (const k in g.ch) v[k] = value(g.ch[k], t);
    const p = g.parts;
    const stride = Math.abs(v.x - g.x0) / g.s / 19; // legs follow the ground covered: no sliding
    const sw = Math.sin(stride) * v.amp;
    const legA = 24 * sw;
    const bob = 74 * (1 - Math.cos((legA * Math.PI) / 180)); // keeps both feet on the floor
    const offer = Math.min(1, Math.max(0, v.offer));
    const hold = offer ** 6;
    const arm = -14 * sw * (1 - offer) - 75 * v.offer;

    g.el.style.transform = `translate3d(${f(v.x - g.w / 2)}px,0,0)`;
    p.bob.setAttribute("transform", `translate(0 ${f(bob)})`);
    p.legF.setAttribute("transform", `translate(12 -74) rotate(${f(legA)})`);
    p.legB.setAttribute("transform", `translate(-12 -74) rotate(${f(-legA)})`);
    p.armB.setAttribute("transform", `translate(-44 -156) rotate(${f(18 * sw)})`);
    p.armF.setAttribute("transform", `translate(44 -156) rotate(${f(arm)})`);
    p.prop.setAttribute("transform",
      `translate(0 66) rotate(${f(-arm + Math.sin(t * 10) * 7 * hold)}) scale(${f(1 + 0.3 * v.offer)})`);
    p.head.setAttribute("transform", `rotate(${f(Math.sin(stride * 2) * 1.5 * v.amp + 5 * v.look)} 0 -172)`);
    p.face.setAttribute("transform", `translate(${f(6 * (1 - v.look))} 0)`);
    p.glints.setAttribute("transform", `translate(${f(4 * (1 - v.look))} ${f(1.5 * v.look)})`);
    p.brows.setAttribute("transform", `translate(0 ${f(-6 * v.look - 4 * Math.max(0, Math.sin(t * 7)) * hold)})`);

    if (p.smoke) {
      [...p.smoke.children].forEach((c, i) => {
        const ph = (t * 0.55 + i / 3) % 1;
        c.setAttribute("cx", f(54 + ph * 12 + Math.sin(ph * 6 + i) * 4));
        c.setAttribute("cy", f(-200 - ph * 56));
        c.setAttribute("r", f(3 + ph * 8));
        c.setAttribute("opacity", f(0.5 * (1 - ph) * Math.min(1, ph * 6)));
      });
      p.ember.setAttribute("opacity", f(0.75 + 0.25 * Math.sin(t * 13)));
    }

    const bub = Math.max(0, v.bubble);
    p.bubble.style.opacity = f(bub);
    p.bubble.style.transform = `scale(${f(0.7 + 0.3 * bub)}) rotate(${f((1 - bub) * -6)}deg)`;
  }

  function frame(now) {
    if (!g || g.frozen) return;
    const t = (now - g.t0) / 1000;
    if (t >= g.end) {
      g.el.remove();
      g = null;
      schedule();
      return;
    }
    apply(t);
    if (!g.cued && t >= g.cueAt) {
      g.cued = true;
      if (opt.onCue) opt.onCue(g.kind);
    }
    requestAnimationFrame(frame);
  }

  // a tap on the goblin: it drops the offer and runs off the way it was going
  function hit(target) {
    if (!g || !target.closest || !target.closest(".goblin")) return false;
    if (g.frozen) return true;
    const t = (performance.now() - g.t0) / 1000;
    if (g.shooed || t >= g.leave) return true; // already on its way out
    g.shooed = g.cued = true;
    const x = value(g.ch.x, t);
    for (const k in g.ch) {
      const v = value(g.ch[k], t);
      g.ch[k] = g.ch[k].filter((key) => key[0] < t).concat([[t, v]]);
    }
    const run = g.speed * 2.4, brake = g.dir * run * 0.15, go = t + 0.35;
    const out = go + 0.3 + Math.abs(g.x2 - x - brake) / run;
    g.ch.x.push([go, x], [go + 0.3, x + brake, "in"], [out, g.x2]);
    g.ch.amp.push([t + 0.15, 0, "out"], [go, 0], [go + 0.15, 1, "out"]);
    g.ch.look.push([t + 0.15, 1, "out"], [go, 1], [go + 0.2, 0, "inout"]);
    g.ch.offer.push([t + 0.25, 0, "in"]);
    g.ch.bubble.push([t + 0.12, 1, "out"], [go + 1.1, 1], [go + 1.3, 0, "in"]);
    g.parts.bubble.textContent = pick("shoo");
    g.parts.bubble.className = `bubble ${x < innerWidth / 2 ? "right" : "left"}`;
    g.end = Math.max(out, go + 1.3) + 0.1;
    return true;
  }

  // ---- when they come ----
  const delay = () => {
    const [lo, hi] = opt.every || [3, 8];
    return (lo + Math.random() * (hi - lo)) * 60000;
  };
  function schedule(ms = delay()) {
    clearTimeout(timer);
    if (!on) return;
    // busy (panel open, sleeping, alarm): try again in half a minute
    timer = setTimeout(() => (g || !opt.canVisit() ? schedule(30000) : visit()), ms);
  }

  function init(o) {
    opt = o;
    on = o.on !== false;
    const q = new URLSearchParams(location.search);
    if (KINDS.includes(q.get("goblin"))) {
      visit(q.get("goblin"), true);
      if (q.has("at")) { g.frozen = true; apply(+q.get("at")); }
      return;
    }
    schedule(delay() / 2); // the first one comes a little sooner
  }
  function set(o) {
    if (!!o.on === on) return;
    on = !!o.on;
    on ? schedule() : clearTimeout(timer);
  }
  function call() {
    if (g) return;
    clearTimeout(timer);
    visit();
  }

  return { init, set, call, hit };
})();
