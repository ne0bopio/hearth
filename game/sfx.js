// Sfx: the game's sounds, synthesized with Web Audio like the crackle in sound.js. No audio files.
// It borrows Hearth's AudioContext but not its master gain (that one is the crackle, and it is
// held at zero while the game is open): the game has its own gain, set from the panel's Volume.
// The game doesn't call sounds by name; it emits events ({ k: "boom", ... }) and play() voices them.
const GameSfx = (() => {
  // o: { context: () => AudioContext, volume: () => 0..1 }
  function create(o) {
    let ac, out, white;
    try {
      ac = o.context();
      out = ac.createGain();
      out.connect(ac.destination);
      white = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const w = white.getChannelData(0);
      for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
    } catch {
      return { play() {}, resume() {}, close() {} }; // no audio: the game plays in silence
    }

    // one oscillator: from f0 to f1 over `dur`, with a fast attack and an exponential tail
    function tone(type, f0, f1, dur, peak, at = 0) {
      const t = ac.currentTime + 0.01 + at;
      const osc = ac.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    }
    // filtered noise: the filter sweeps from f0 to f1
    function noise(kind, f0, f1, dur, peak, at = 0) {
      const t = ac.currentTime + 0.01 + at;
      const src = ac.createBufferSource();
      src.buffer = white;
      const f = ac.createBiquadFilter();
      f.type = kind;
      f.frequency.setValueAtTime(f0, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(out);
      src.start(t, Math.random() * 0.5, dur + 0.03);
    }

    const STEP = [98, 87.3, 82.4, 73.4]; // the four falling notes of the march
    const voice = {
      shot: () => tone("square", 1100, 240, 0.09, 0.1),
      boom: () => { noise("lowpass", 2400, 180, 0.24, 0.42); tone("triangle", 220, 60, 0.18, 0.2); },
      chip: () => noise("highpass", 3000, 1500, 0.04, 0.12),
      step: (e) => tone("square", STEP[e.n % 4], STEP[e.n % 4] * 0.97, 0.085, 0.22),
      hit: () => { noise("lowpass", 1400, 60, 0.7, 0.7); tone("sawtooth", 180, 35, 0.6, 0.4); },
      ufo: () => { tone("sine", 740, 990, 0.12, 0.12); tone("sine", 990, 740, 0.12, 0.12, 0.13); },
      ufoBoom: () => [523, 659, 784, 1047].forEach((f, i) => tone("square", f, f, 0.09, 0.13, i * 0.07)),
      mother: () => {
        [0, 0.42, 0.84].forEach((at) => { tone("sawtooth", 70, 140, 0.4, 0.3, at); tone("sawtooth", 72, 146, 0.4, 0.2, at); });
        noise("lowpass", 120, 500, 1.3, 0.25);
      },
      volley: () => tone("sawtooth", 320, 120, 0.16, 0.12),
      clang: () => tone("triangle", 1400, 620, 0.06, 0.16),
      motherBoom: () => {
        noise("lowpass", 2600, 50, 1.5, 0.9);
        tone("sine", 160, 28, 1.3, 0.55);
        [0.15, 0.4, 0.7].forEach((at) => noise("bandpass", 900, 200, 0.3, 0.4, at));
      },
      clear: () => [392, 523, 659].forEach((f, i) => tone("square", f, f, 0.1, 0.12, i * 0.09)),
      over: () => [330, 262, 196, 131].forEach((f, i) => tone("triangle", f, f * 0.94, 0.34, 0.26, i * 0.27)),
    };
    const GAP = { boom: 0.04, chip: 0.05, clang: 0.04 }; // a row of these in one frame is one sound, not ten
    const lastAt = {};

    function play(events) {
      if (!events.length || ac.state !== "running") return;
      out.gain.value = Math.max(0, Math.min(1, o.volume())) * 0.9;
      for (const e of events) {
        if (!voice[e.k]) continue;
        if (GAP[e.k] && ac.currentTime - (lastAt[e.k] || -1) < GAP[e.k]) continue;
        lastAt[e.k] = ac.currentTime;
        voice[e.k](e);
      }
    }

    // browsers keep audio asleep until a key or a tap, unless the kiosk flag allows autoplay
    const resume = () => { if (ac.state !== "running") ac.resume().catch(() => {}); };
    const close = () => out.disconnect();

    return { play, resume, close };
  }

  return { create };
})();
