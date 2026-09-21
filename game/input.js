// Input: keyboard and touch folded into one state that the game reads every frame.
// Touch: drag a finger sideways to move; the ship fires for as long as the finger is down.
// Listeners exist only while the game is open (attach/detach).
const GameInput = (() => {
  const keys = new Set();
  const USED = ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyP", "Escape", "Enter", "NumpadEnter"];
  let el = null, on = {}, pointer = null, lastX = 0, drag = 0;

  function keydown(e) {
    if (!USED.includes(e.code)) return;
    e.preventDefault(); // Space must not press whichever HUD button was tapped last
    if (e.repeat) return;
    if (e.code === "Escape") return on.exit && on.exit();
    if (e.code === "KeyP") return on.pause && on.pause();
    if (e.code.endsWith("Enter")) return on.confirm && on.confirm();
    keys.add(e.code);
  }
  function keyup(e) {
    if (USED.includes(e.code)) e.preventDefault();
    keys.delete(e.code);
  }
  const blur = () => { keys.clear(); pointer = null; };

  function down(e) {
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

  // target: the element that takes the drags (the game canvas). handlers: { pause, exit, confirm }
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
    el = null;
    on = {};
    drag = 0;
    blur();
  }

  // what the game asks for each frame. drag: how far the finger moved since the last read,
  // as a fraction of the screen width.
  function read() {
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");
    const c = { axis: (right ? 1 : 0) - (left ? 1 : 0), fire: keys.has("Space") || pointer !== null, touching: pointer !== null, drag };
    drag = 0;
    return c;
  }

  return { attach, detach, read };
})();
