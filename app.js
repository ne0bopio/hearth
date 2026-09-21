// App: wires the panel, clock, weather, timer and sleep to Fire and Sound.
(() => {
  const cfg = window.HEARTH_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // settings survive reboots (Chromium keeps localStorage for file:// pages)
  const state = { sound: true, volume: 0.5, height: 0.6, warmth: 0.5, brightness: 1, ambientClock: true, goblins: true };
  try { Object.assign(state, JSON.parse(localStorage.getItem("hearth") || "{}")); } catch {}
  const save = () => { try { localStorage.setItem("hearth", JSON.stringify(state)); } catch {} };

  Fire.init($("#fire"), $("#embers"));
  Fire.set({ height: state.height, warmth: state.warmth });
  Sound.set({ on: state.sound, volume: state.volume });

  // ---- video fire: if fire.mp4 is in the folder, it replaces the drawn fire ----
  const video = $("#fire-video");
  let videoMode = false;
  let gameOpen = false; // the game has the screen: fire, crackle and goblins wait behind it
  const tintVideo = () => {
    video.style.filter = `hue-rotate(${(0.5 - state.warmth) * 16}deg) saturate(${0.85 + state.warmth * 0.4})`;
  };
  function enableVideo() {
    videoMode = true;
    Fire.pause();
    $("#fire").hidden = true;
    $("#embers").hidden = true;
    $("#flame-label").hidden = true; // flame height can't change a video
    video.hidden = false;
    tintVideo();
    if (gameOpen) video.pause(); // `autoplay` would start it behind the game
    else video.play().catch(() => {});
  }
  if (video.readyState >= 2) enableVideo();
  else video.addEventListener("loadeddata", enableVideo, { once: true });

  // ---- clock ----
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: cfg.hour12 !== false });

  function tick() {
    const d = new Date();
    $("#time").textContent = fmtTime(d);
    $("#a-time").textContent = fmtTime(d);
    $("#date").textContent = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    updateTimer();
    updateSleep();
    // a fresh page once a day keeps a browser that never closes healthy
    if (d.getHours() === 4 && d.getMinutes() === 0 && performance.now() > 120000 && !sleep && timerEnd === null && !gameOpen) {
      location.reload();
    }
  }

  // ---- panel ----
  let idle, openedAt = 0;
  const panelOpen = () => !$("#panel").hidden;

  function showPanel() {
    $("#panel").hidden = false;
    $("#ambient").classList.add("away");
    openedAt = performance.now();
    bump();
  }
  function hidePanel() {
    $("#panel").hidden = true;
    $("#ambient").classList.remove("away");
    clearTimeout(idle);
  }
  function bump() {
    clearTimeout(idle);
    idle = setTimeout(hidePanel, 20000);
  }

  document.addEventListener("pointerdown", (e) => {
    Sound.resume();
    if (!$("#alarm").hidden) return stopAlarm();
    if (Goblins.hit(e.target)) return; // tapping a goblin shoos it, it doesn't open the panel
    if (!panelOpen()) {
      if (sleep && sleepLevel === 0) return wake(); // fire is out: a tap relights it
      return showPanel();
    }
    bump();
    if (e.target === $("#panel") || e.target.classList.contains("spacer")) hidePanel();
  });

  // the tap that opened the panel must not also press the button that appears under the finger
  document.addEventListener("click", (e) => {
    if (performance.now() - openedAt < 450) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  document.addEventListener("contextmenu", (e) => e.preventDefault());
  $("#close").addEventListener("click", hidePanel);

  function mark(key, val) {
    $$(`[data-${key}]`).forEach((b) => b.setAttribute("aria-pressed", String(val !== null && +b.dataset[key] === val)));
  }

  // ---- timer ----
  let timerEnd = null, alarmLoop = null, alarmStop = null;

  function startTimer(min) {
    timerEnd = Date.now() + min * 60000;
    mark("timer", min);
    updateTimer();
  }
  function cancelTimer() {
    timerEnd = null;
    mark("timer", null);
    updateTimer();
  }
  function updateTimer() {
    if (timerEnd === null) {
      $("#a-timer").hidden = true;
      $("#timer-cancel").hidden = true;
      $("#timer-readout").textContent = "Pick a time";
      return;
    }
    const left = Math.max(0, timerEnd - Date.now());
    const s = Math.ceil(left / 1000);
    const txt = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    $("#a-timer").textContent = txt;
    $("#a-timer").hidden = false;
    $("#timer-cancel").hidden = false;
    $("#timer-readout").textContent = `${txt} left`;
    if (left <= 0) {
      cancelTimer();
      ringAlarm();
    }
  }
  function ringAlarm() {
    if (gameOpen && typeof Game !== "undefined") Game.pause(true); // the timer wins: the alarm shows over a paused game
    $("#alarm").hidden = false;
    Sound.chime();
    alarmLoop = setInterval(Sound.chime, 2500);
    alarmStop = setTimeout(stopAlarm, 60000);
  }
  function stopAlarm() {
    clearInterval(alarmLoop);
    clearTimeout(alarmStop);
    $("#alarm").hidden = true;
  }

  $$("[data-timer]").forEach((b) => b.addEventListener("click", () => startTimer(+b.dataset.timer)));
  $("#timer-cancel").addEventListener("click", cancelTimer);

  // ---- sleep: the fire dies down, the room goes dark and quiet ----
  let sleep = null, sleepLevel = 1;

  function startSleep(min) {
    const now = Date.now();
    sleep = { start: now, end: now + min * 60000 };
    mark("sleep", min);
    hidePanel();
  }
  function wake() {
    sleep = null;
    mark("sleep", 0);
    setLevel(1);
  }
  function updateSleep() {
    if (!sleep) return;
    const f = 1 - (Date.now() - sleep.start) / (sleep.end - sleep.start);
    setLevel(Math.max(0, f));
  }
  function setLevel(l) {
    sleepLevel = l;
    Fire.set({ fade: Math.min(1, l * 1.3) }); // flames hold a while, then sink
    Sound.set({ level: l });
    $("#ambient").style.opacity = l === 0 ? "0" : "";
    if (videoMode && !gameOpen) {
      if (l === 0) video.pause();
      else if (video.paused) video.play().catch(() => {});
    }
    applyDim();
  }
  function applyDim() {
    // a video can't burn down, so in video mode the dimming goes all the way to black
    $("#dim").style.opacity = Math.max(1 - state.brightness, (1 - sleepLevel) * (videoMode ? 1 : 0.8));
  }

  $$("[data-sleep]").forEach((b) => b.addEventListener("click", () => {
    const m = +b.dataset.sleep;
    m ? startSleep(m) : wake();
  }));

  // ---- fire + sound controls ----
  function bindRange(sel, key, apply) {
    const el = $(sel);
    el.value = state[key];
    el.addEventListener("input", () => {
      state[key] = +el.value;
      apply();
      save();
      bump();
    });
  }
  bindRange("#flame", "height", () => Fire.set({ height: state.height }));
  bindRange("#warmth", "warmth", () => { Fire.set({ warmth: state.warmth }); tintVideo(); });
  bindRange("#brightness", "brightness", applyDim);
  bindRange("#volume", "volume", () => Sound.set({ volume: state.volume }));

  function bindToggle(sel, key, apply) {
    const el = $(sel);
    const reflect = () => el.setAttribute("aria-pressed", String(state[key]));
    el.addEventListener("click", () => {
      state[key] = !state[key];
      reflect();
      apply();
      save();
    });
    reflect();
    apply();
  }
  bindToggle("#sound-toggle", "sound", () => Sound.set({ on: state.sound }));
  bindToggle("#clock-toggle", "ambientClock", () => { $("#ambient .t").hidden = !state.ambientClock; });

  // ---- goblins: now and then one walks by and offers something ----
  const gcfg = cfg.goblins || {};
  Goblins.init({
    layer: $("#goblins"),
    on: state.goblins,
    every: gcfg.every,
    lines: gcfg.lines,
    canVisit: () => !panelOpen() && !sleep && !gameOpen && $("#alarm").hidden,
    onCue: (kind) => (kind === "cigar" ? Sound.psst() : Sound.clink()),
  });
  bindToggle("#goblin-toggle", "goblins", () => Goblins.set({ on: state.goblins }));
  $("#goblin-call").addEventListener("click", () => {
    hidePanel();
    setTimeout(Goblins.call, 400);
  });

  // ---- game: «Invasión» takes the whole screen; the fire waits behind it, switched off ----
  // Three.js and the game are ~750 KB that most days nobody needs, so their <script> tags are
  // added the first time someone plays. Classic scripts only: modules don't load from file://.
  const GAME_SCRIPTS = ["vendor/three.min.js", "game/input.js", "game/scene.js", "game/game.js"];
  const loaded = new Set();
  const loadScript = (src) => loaded.has(src) ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { loaded.add(src); ok(); };
    s.onerror = () => { s.remove(); fail(new Error(`could not load ${src}`)); };
    document.head.appendChild(s);
  });

  function openGame() {
    if (gameOpen) return;
    gameOpen = true;
    hidePanel();
    videoMode ? video.pause() : Fire.pause();
    Sound.set({ on: false });
    $("#game").hidden = false;
    GAME_SCRIPTS.reduce((p, src) => p.then(() => loadScript(src)), Promise.resolve())
      .then(() => { if (gameOpen) Game.open({ layer: $("#game"), onExit: closeGame }); })
      .catch((err) => { console.error(err); closeGame(); }); // no WebGL, a missing file: back to the fire
  }
  // Puts back only what openGame took. Sleep and the timer kept running and are left alone.
  function closeGame() {
    if (!gameOpen) return;
    gameOpen = false;
    $("#game").hidden = true;
    if (!videoMode) Fire.resume();
    else if (sleepLevel > 0) video.play().catch(() => {});
    Sound.set({ on: state.sound });
  }
  $("#game-play").addEventListener("click", openGame);
  if (new URLSearchParams(location.search).has("game")) openGame();

  // ---- weather (Open-Meteo: free, no key) ----
  const WMO = [[0, "Clear"], [1, "Mostly clear"], [2, "Partly cloudy"], [3, "Overcast"], [48, "Fog"],
    [57, "Drizzle"], [67, "Rain"], [77, "Snow"], [82, "Showers"], [86, "Snow showers"], [99, "Thunderstorm"]];
  const describe = (c) => (WMO.find(([max]) => c <= max) || [0, ""])[1];

  async function weather() {
    if (cfg.latitude == null || cfg.longitude == null) return;
    const unit = cfg.units === "celsius" ? "celsius" : "fahrenheit";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cfg.latitude}&longitude=${cfg.longitude}` +
      `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=${unit}&timezone=auto&forecast_days=1`;
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const j = await r.json();
      const temp = `${Math.round(j.current.temperature_2m)}°`;
      $("#w-temp").textContent = temp;
      $("#w-desc").textContent = describe(j.current.weather_code) + (cfg.city ? ` · ${cfg.city}` : "");
      $("#w-range").textContent = `H ${Math.round(j.daily.temperature_2m_max[0])}° · L ${Math.round(j.daily.temperature_2m_min[0])}°`;
      $("#a-temp").textContent = temp;
      $("#weather").hidden = false;
    } catch {
      // offline: keep showing the last reading
    }
  }

  tick();
  setInterval(tick, 1000);
  weather();
  setInterval(weather, 15 * 60000);
})();
