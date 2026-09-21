// Input: keyboard, touch and a USB gamepad folded into one state that the game reads every frame.
// Touch: drag a finger sideways to move; the ship fires for as long as the finger is down.
// Gamepad (standard mapping): stick or d-pad moves, A fires, Start pauses, Select leaves.
// Listeners exist only while the game is open (attach/detach).
const GameInput = (() => {
  const keys = new Set();
  const USED = ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyP", "Escape", "Enter", "NumpadEnter"];
  const PAD = { a: 0, select: 8, start: 9, left: 14, right: 15, dead: 0.25 };
  let el = null, on = {}, pointer = null, lastX = 0, drag = 0;
  let padTimer = 0, padWas = {}, padAxis = 0, padFire = false;

  const call = (name) => on[name] && on[name]();

  function keydown(e) {
    if (!USED.includes(e.code)) return;
    e.preventDefault(); // Space must not press whichever HUD button was tapped last
    if (e.repeat) return;
    call("wake");
    if (e.code === "Escape") return call("exit");
    if (e.code === "KeyP") return call("pause");
    if (e.code.endsWith("Enter")) return call("confirm");
    keys.add(e.code);
  }
  function keyup(e) {
    if (USED.includes(e.code)) e.preventDefault();
    keys.delete(e.code);
  }
  const blur = () => { keys.clear(); pointer = null; };

  function down(e) {
    call("wake");
    if (pointer !== null) return;
    pointer = e.pointerId;
    lastX = e.clientX;
    try { el.setPointerCapture(pointer); } catch {}
  }
  function move(e) {
    if (e.pointerId !== pointer) return;
    drag += (e.clientX - lastX) / innerWidth;
    lastX = e.clientX;
  }
  function up(e) {
    if (e.pointerId === pointer) pointer = null;
  }

  // Gamepads have no events for buttons: they are polled. read() does it every frame, and a slow
  // timer does it too, because Start and A must still work while the loop is stopped (pause, Game Over).
  function pollPad() {
    let pad = null;
    try { pad = [...navigator.getGamepads()].find((p) => p && p.connected); } catch {}
    if (!pad) { padAxis = 0; padFire = false; padWas = {}; return; }
    const held = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const edge = (i) => { const now = held(i), hit = now && !padWas[i]; padWas[i] = now; return hit; };
    const x = pad.axes[0] || 0;
    padAxis = held(PAD.left) ? -1 : held(PAD.right) ? 1 : Math.abs(x) > PAD.dead ? x : 0;
    padFire = held(PAD.a);
    const a = edge(PAD.a);
    if (a || padAxis) call("wake");
    if (edge(PAD.select)) return call("exit");
    if (edge(PAD.start)) call("pause");
    if (a) call("confirm"); // only means something on Game Over
  }

  // target: the element that takes the drags (the game canvas).
  // handlers: { pause, exit, confirm, wake }; wake = the player did something (audio may start now)
  function attach(target, handlers) {
    el = target;
    on = handlers || {};
    addEventListener("keydown", keydown);
    addEventListener("keyup", keyup);
    addEventListener("blur", blur);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    padTimer = setInterval(pollPad, 120);
  }
  function detach() {
    removeEventListener("keydown", keydown);
    removeEventListener("keyup", keyup);
    removeEventListener("blur", blur);
    if (el) {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    }
    clearInterval(padTimer);
    el = null;
    on = {};
    drag = padAxis = 0;
    padFire = false;
    padWas = {};
    blur();
  }

  // what the game asks for each frame. axis: -1..1 (a stick gives the values in between).
  // drag: how far the finger moved since the last read, as a fraction of the screen width.
  function read() {
    pollPad();
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");
    const c = {
      axis: (right ? 1 : 0) - (left ? 1 : 0) || padAxis,
      fire: keys.has("Space") || pointer !== null || padFire,
      touching: pointer !== null, drag,
    };
    drag = 0;
    return c;
  }

  return { attach, detach, read };
})();
