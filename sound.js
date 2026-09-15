// Sound: a low brown-noise rumble plus random crackles and pops, all synthesized
// with Web Audio. No audio files, nothing that loops audibly.
const Sound = (() => {
  const opt = { on: true, volume: 0.5, level: 1 }; // level: sleep fade, 1 -> 0
  let ac, master, white, loopTimer = null;

  function ensure() {
    if (ac) return;
    ac = new AudioContext();
    master = ac.createGain();
    master.gain.value = 0;
    master.connect(ac.destination);

    white = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const w = white.getChannelData(0);
    for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;

    const brown = ac.createBuffer(1, ac.sampleRate * 8, ac.sampleRate);
    const b = brown.getChannelData(0);
    let l = 0;
    for (let i = 0; i < b.length; i++) {
      l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      b[i] = l * 3.5;
    }
    const bed = ac.createBufferSource();
    bed.buffer = brown;
    bed.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const g = ac.createGain();
    g.gain.value = 0.6;
    bed.connect(lp).connect(g).connect(master);
    bed.start();
  }

  function crackle(t) {
    const big = Math.random() < 0.07;
    const dur = big ? 0.06 + Math.random() * 0.05 : 0.008 + Math.random() * 0.03;
    const s = ac.createBufferSource();
    s.buffer = white;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = big ? 700 + Math.random() * 900 : 1800 + Math.random() * 4500;
    bp.Q.value = 0.6 + Math.random() * 2;
    const g = ac.createGain();
    g.gain.setValueAtTime(big ? 0.9 : 0.12 + Math.random() * 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(bp).connect(g).connect(master);
    s.start(t, Math.random() * 0.8, dur + 0.02);
  }

  function loop() {
    if (!opt.on || opt.level <= 0) { loopTimer = null; return; }
    if (ac.state === "running") {
      const t = ac.currentTime + 0.01;
      const n = Math.random() < 0.12 ? 3 + ((Math.random() * 5) | 0) : 1; // sometimes a burst
      let dt = 0;
      for (let i = 0; i < n; i++) { crackle(t + dt); dt += 0.01 + Math.random() * 0.05; }
    }
    loopTimer = setTimeout(loop, 40 - Math.log(1 - Math.random()) * 220);
  }

  function set(o) {
    Object.assign(opt, o);
    ensure();
    const target = opt.on ? opt.volume * opt.level : 0;
    master.gain.setTargetAtTime(target, ac.currentTime, 0.4);
    if (!loopTimer && opt.on && opt.level > 0) loop();
  }

  // Browsers keep audio suspended until a tap, unless the kiosk flag allows autoplay.
  function resume() {
    if (ac && ac.state !== "running") ac.resume();
  }

  // Timer bell: plays even when the crackle is muted.
  function chime() {
    ensure();
    resume();
    const t = ac.currentTime + 0.02;
    [[880, 0], [1318.5, 0.2]].forEach(([f, d]) => {
      const o = ac.createOscillator();
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.4);
      o.connect(g).connect(ac.destination);
      o.start(t + d);
      o.stop(t + d + 1.5);
    });
  }

  // Goblin cues: a "psst" and the clink of a bottle. Quiet, and only with the crackle on.
  function psst() {
    if (!opt.on || opt.level <= 0) return;
    ensure();
    const t = ac.currentTime + 0.02;
    [[0, 0.05, 0.3], [0.1, 0.34, 0.2]].forEach(([d, dur, peak]) => {
      const s = ac.createBufferSource();
      s.buffer = white;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 5500;
      bp.Q.value = 0.8;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(peak, t + d + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + dur);
      s.connect(bp).connect(g).connect(master);
      s.start(t + d, Math.random() * 0.5, dur + 0.05);
    });
  }

  function clink() {
    if (!opt.on || opt.level <= 0) return;
    ensure();
    const t = ac.currentTime + 0.02;
    [[0, 2637], [0.16, 3136]].forEach(([d, f]) => {
      [[1, 0.14], [2.76, 0.05]].forEach(([m, peak]) => { // the upper partial makes it glass, not a bell
        const o = ac.createOscillator();
        o.frequency.value = f * m;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(peak, t + d + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.4);
        o.connect(g).connect(master);
        o.start(t + d);
        o.stop(t + d + 0.45);
      });
    });
  }

  return { set, resume, chime, psst, clink };
})();
