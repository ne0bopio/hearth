// HUD: everything that is DOM on top of the 3D canvas. Score, record, lives, wave, the mothership's
// health bar, the message banner, the pause and Game Over screens. It only reads the game state.
const GameHud = (() => {
  const WHY = {
    landed: "Los duendes se quedaron con la chimenea",
    shot: "Te bajaron la nave, bro",
  };
  const pad = (n) => String(n).padStart(5, "0");

  // on: { pause, exit, retry }
  function create(layer, on) {
    const el = document.createElement("div");
    el.className = "g-ui";
    el.innerHTML = `
      <div class="g-top">
        <div><div class="g-title">Invasión</div><div class="g-wave"></div></div>
        <div class="g-score"><div class="g-points"></div><div class="g-best"></div></div>
        <div class="g-right">
          <div class="g-lives"></div>
          <div class="row">
            <button class="chip" data-g="pause">Pausa</button>
            <button class="chip" data-g="exit">Salir</button>
          </div>
        </div>
      </div>
      <div class="g-mother" hidden><span>Nodriza</span><div class="g-bar"><b></b></div></div>
      <div class="g-msg" hidden></div>
      <div class="g-help">← → mover · Espacio disparar · P pausa · Esc salir<br>Táctil: arrastra el dedo, dispara solo</div>
      <div class="g-pause" hidden><div class="big">Pausa</div><div class="hint">P o el botón para seguir</div></div>
      <div class="g-over" hidden>
        <div class="big">Game Over</div>
        <div class="g-why"></div>
        <div class="g-final"></div>
        <div class="row">
          <button class="chip go" data-g="retry">Reintentar</button>
          <button class="chip" data-g="exit">Salir</button>
        </div>
        <div class="hint">Enter: otra · Esc: a la chimenea</div>
      </div>`;
    layer.appendChild(el);

    const $ = (sel) => el.querySelector(sel);
    const node = {
      wave: $(".g-wave"), points: $(".g-points"), best: $(".g-best"), lives: $(".g-lives"), msg: $(".g-msg"),
      mother: $(".g-mother"), bar: $(".g-bar b"), pause: $(".g-pause"), pauseBtn: $('[data-g="pause"]'),
      over: $(".g-over"), why: $(".g-why"), final: $(".g-final"),
    };
    el.querySelectorAll("[data-g]").forEach((b) => b.addEventListener("click", (e) => {
      e.currentTarget.blur(); // or Space would press it again
      on[b.dataset.g]();
    }));

    // the DOM is only touched when a value changes: this runs 60 times a second
    const shown = {};
    const changed = (key, val) => (shown[key] === val ? false : ((shown[key] = val), true));

    function update(s) {
      if (changed("points", s.score)) node.points.textContent = pad(s.score);
      if (changed("best", s.best)) node.best.textContent = `Récord ${pad(s.best)}`;
      if (changed("wave", s.wave)) node.wave.textContent = `Oleada ${s.wave}`;
      if (changed("lives", `${s.lives}/${s.maxLives}`)) {
        node.lives.innerHTML = Array.from({ length: s.maxLives }, (_, i) => `<i${i < s.lives ? "" : ' class="lost"'}></i>`).join("");
      }
      const text = s.msg && s.t < s.msg.until ? s.msg.text : "";
      if (changed("msg", text)) { node.msg.textContent = text; node.msg.hidden = !text; }

      const m = s.mother && !s.mother.dying && !s.over ? s.mother : null;
      if (changed("mother", !!m)) node.mother.hidden = !m;
      if (m && changed("hp", m.hp)) node.bar.style.width = `${(100 * m.hp) / m.max}%`;

      const over = s.over && s.overT <= 0.5 ? s.over : ""; // a beat after the hit, so you see what killed you
      if (changed("over", over)) {
        node.over.hidden = !over;
        node.why.textContent = WHY[over] || "";
        node.final.innerHTML = `<b>${pad(s.score)}</b> puntos · ` + (s.newBest ? "<em>¡Nuevo récord!</em>" : `Récord ${pad(s.best)}`);
      }
    }

    function paused(is) {
      node.pause.hidden = !is;
      node.pauseBtn.setAttribute("aria-pressed", String(is));
    }

    return { update, paused, remove: () => el.remove() };
  }

  return { create };
})();
