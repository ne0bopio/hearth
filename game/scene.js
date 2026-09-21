// Scene: everything Three.js. The game (game.js) owns the state; this file only draws it.
// World: x is sideways, y is up, the ship sits at z = 0 and the goblins come from -z toward it.
// All models are built in code from a few primitives, merged into one geometry each with
// vertex colors: the 40 saucers cost three draw calls (one InstancedMesh per kind), the shields one.
const GameScene = (() => {
  // same palette as goblins.js
  const C = {
    ink: 0x0A0A0A, hull: 0x1E1E1E, hull2: 0x3A3A3A, skin: 0x7DC243, shade: 0x4F8F24,
    green: 0x53FC18, green2: 0x2E9C0C, bone: 0xF2F2EE, gold: 0xF5C518,
    cigar: 0x6B3F1D, ember: 0xFF7A1A, glass: 0xB98A55,
  };
  const KINDS = ["cigar", "bottle", "boss"];
  const SAUCER = 1.3; // model radius 1.08 × this = the 1.4 that game.js collides against
  const MOTHER = 1.25; // model radius 4.9 × this ≈ the 6.2 half-width game.js gives the mothership
  const DEG = Math.PI / 180;

  // ---- building: primitives -> one flat-shaded geometry with vertex colors ----
  const place = (p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => new THREE.Matrix4().compose(
    new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));

  function part(geo, color, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (m) g.applyMatrix4(m);
    const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }
  function merge(parts) {
    const n = parts.reduce((a, p) => a + p.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const p of parts) {
      pos.set(p.attributes.position.array, o);
      col.set(p.attributes.color.array, o);
      o += p.attributes.position.count * 3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals(); // nothing is shared between faces, so this gives flat shading
    return g;
  }

  // a flat plate seen from above: points are [x, forward], it lies in the xz plane at height y
  function plate(points, y, thick, color) {
    const sh = new THREE.Shape(points.map(([x, f]) => new THREE.Vector2(x, f)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false });
    return part(geo, color, place([0, y, 0], [-90 * DEG, 0, 0]));
  }

  // the martian's ship: black, Kick green stripes, nose toward -z
  function shipGeometry() {
    const parts = [
      part(new THREE.ConeGeometry(0.62, 3.2, 4), C.hull, place([0, 0, -0.2], [-90 * DEG, 0, 0], [1, 1, 0.55])),
      part(new THREE.ConeGeometry(0.3, 1.1, 4), C.green, place([0, 0.24, 0.35], [-90 * DEG, 0, 0], [1, 1, 0.7])),
      part(new THREE.BoxGeometry(0.4, 0.26, 0.3), C.green, place([-0.42, 0, 1.45])),
      part(new THREE.BoxGeometry(0.4, 0.26, 0.3), C.green, place([0.42, 0, 1.45])),
    ];
    for (const s of [-1, 1]) {
      parts.push(
        plate([[0.25 * s, 0.5], [2.5 * s, -1.0], [2.5 * s, -1.45], [0.25 * s, -1.25]], -0.05, 0.1, C.hull),
        plate([[0.95 * s, 0.0], [1.3 * s, -0.24], [1.3 * s, -1.34], [0.95 * s, -1.3]], 0.05, 0.02, C.green),
        plate([[1.75 * s, -0.53], [2.0 * s, -0.7], [2.0 * s, -1.4], [1.75 * s, -1.38]], 0.05, 0.02, C.green),
        part(new THREE.BoxGeometry(0.08, 0.75, 0.85), C.hull2, place([2.5 * s, 0.2, 1.1], [0, 0, -12 * DEG * s])),
      );
    }
    return merge(parts);
  }

  // a goblin in a saucer, facing +z (toward the player). The rim color tells the kinds apart
  // from far away; the hat and what it carries do it up close.
  function saucerGeometry(kind) {
    const rim = { cigar: C.green, bottle: C.bone, boss: C.gold }[kind];
    return merge([
      part(new THREE.CylinderGeometry(1.0, 0.4, 0.3, 8), C.hull, place([0, -0.15, 0])),
      part(new THREE.CylinderGeometry(0.5, 1.0, 0.26, 8), C.hull2, place([0, 0.13, 0])),
      part(new THREE.CylinderGeometry(1.08, 1.08, 0.08, 8), rim, place([0, 0, 0])),
      ...goblin(kind),
    ]).scale(SAUCER, SAUCER, SAUCER);
  }

  // head, ears, hat and whatever it carries; sits on a saucer whose deck is at y = 0.26
  function goblin(kind) {
    const dome = (color, y) => part(new THREE.SphereGeometry(0.43, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), color, place([0, y, 0]));
    const parts = [
      part(new THREE.IcosahedronGeometry(0.4, 0), C.skin, place([0, 0.6, 0], [0, 0, 0], [1, 1.08, 1])),
      part(new THREE.ConeGeometry(0.11, 0.6, 4), C.skin, place([0.56, 0.74, 0], [0, 0, -65 * DEG])),
      part(new THREE.ConeGeometry(0.11, 0.6, 4), C.skin, place([-0.56, 0.74, 0], [0, 0, 65 * DEG])),
      part(new THREE.BoxGeometry(0.13, 0.1, 0.06), C.ink, place([-0.15, 0.64, 0.36])),
      part(new THREE.BoxGeometry(0.13, 0.1, 0.06), C.ink, place([0.15, 0.64, 0.36])),
    ];
    if (kind === "cigar") {
      parts.push(
        dome(C.ink, 0.72),
        part(new THREE.BoxGeometry(0.16, 0.1, 0.04), C.green, place([0, 0.8, 0.4])),
        part(new THREE.CylinderGeometry(0.045, 0.045, 0.4, 5), C.cigar, place([0.14, 0.47, 0.52], [80 * DEG, 0, -20 * DEG])),
        part(new THREE.BoxGeometry(0.1, 0.1, 0.08), C.ember, place([0.21, 0.5, 0.72])),
      );
    } else if (kind === "bottle") {
      parts.push(
        dome(C.green, 0.72),
        part(new THREE.BoxGeometry(0.56, 0.05, 0.34), C.green2, place([0, 0.74, 0.48])),
        part(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 6), C.glass, place([0.66, 0.42, 0.3])),
        part(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 5), C.green2, place([0.66, 0.68, 0.3])),
      );
    } else {
      parts.push(
        dome(C.ink, 0.72),
        part(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 6), C.gold, place([0, 0.76, 0])),
        part(new THREE.TorusGeometry(0.24, 0.04, 4, 8), C.gold, place([0, 0.3, 0.34], [-35 * DEG, 0, 0])),
        part(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), C.gold, place([0, 1.3, 0])),
        part(new THREE.IcosahedronGeometry(0.08, 0), C.green, place([0, 1.58, 0])),
      );
    }
    return parts;
  }

  // the mystery saucer: nobody at the wheel, bone white with a gold rim
  function ufoGeometry() {
    return merge([
      part(new THREE.CylinderGeometry(1.6, 0.6, 0.36, 8), C.bone, place([0, -0.18, 0])),
      part(new THREE.CylinderGeometry(0.75, 1.6, 0.3, 8), C.bone, place([0, 0.15, 0])),
      part(new THREE.CylinderGeometry(1.72, 1.72, 0.1, 8), C.gold, place([0, 0, 0])),
      part(new THREE.SphereGeometry(0.72, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), C.green, place([0, 0.3, 0])),
    ]).scale(SAUCER, SAUCER, SAUCER);
  }

  // the goblin mothership: one wide saucer, the squad boss on deck between his two lieutenants
  function motherGeometry() {
    const crew = (kind, x) => goblin(kind).map((g) => g.applyMatrix4(place([x, 0.55, 0.5], [0, 0, 0], [1.7, 1.7, 1.7])));
    const parts = [
      part(new THREE.CylinderGeometry(4.6, 1.6, 1.0, 12), C.hull, place([0, -0.5, 0])),
      part(new THREE.CylinderGeometry(2.9, 4.6, 0.9, 12), C.hull2, place([0, 0.45, 0])),
      part(new THREE.CylinderGeometry(4.9, 4.9, 0.24, 12), C.green, place([0, 0, 0])),
      part(new THREE.CylinderGeometry(3.0, 3.0, 0.16, 12), C.gold, place([0, 0.95, 0])),
      part(new THREE.ConeGeometry(1.3, 1.1, 8), C.green, place([0, -1.5, 0], [Math.PI, 0, 0])),
      ...crew("cigar", -1.75), ...crew("boss", 0), ...crew("bottle", 1.75),
    ];
    for (const s of [-1, 1]) {
      parts.push(
        part(new THREE.BoxGeometry(0.55, 0.55, 2.2), C.gold, place([3.1 * s, -0.55, 3.2])),
        part(new THREE.BoxGeometry(0.3, 0.3, 0.3), C.ember, place([3.1 * s, -0.55, 4.35])),
      );
    }
    return merge(parts).scale(MOTHER, MOTHER, MOTHER);
  }

  // same stars every time, so a frozen ?at= capture always matches
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function starGeometry(n) {
    const r = rng(7), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(r() - 0.5) * 260, -12 + r() * 90, -70 - r() * 60], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }

  // counts: how many saucers of each kind the game will ever show at once; bullets, bombs: pool
  // sizes; cells: how many shield blocks there can be; cell: [width, depth] of one
  function create(container, { counts, bullets, bombs, cells, cell }) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000);
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 45, 110);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 300);
    const look = new THREE.Vector3();

    scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-4, 12, 9);
    scene.add(sun);

    const toon = new THREE.MeshToonMaterial({ vertexColors: true });

    const ship = new THREE.Group();
    const shipGeo = shipGeometry();
    ship.add(new THREE.Mesh(shipGeo, toon));
    ship.add(new THREE.LineSegments(new THREE.EdgesGeometry(shipGeo, 25), new THREE.LineBasicMaterial({ color: C.green })));
    ship.scale.setScalar(0.85);
    scene.add(ship);

    const saucers = {};
    for (const k of KINDS) {
      const m = new THREE.InstancedMesh(saucerGeometry(k), toon, counts[k]);
      m.frustumCulled = false; // the instances spread far beyond the one saucer its bounds know about
      saucers[k] = m;
      scene.add(m);
    }

    const shotGeo = new THREE.BoxGeometry(0.22, 0.22, 1.9);
    const shotMat = new THREE.MeshBasicMaterial({ color: C.green, fog: false });
    const shots = Array.from({ length: bullets }, () => {
      const m = new THREE.Mesh(shotGeo, shotMat);
      m.visible = false;
      scene.add(m);
      return m;
    });

    // what the goblins drop: gold, so it never reads as one of yours
    const bombGeo = new THREE.OctahedronGeometry(0.36);
    const bombMat = new THREE.MeshBasicMaterial({ color: C.gold, fog: false });
    const drops = Array.from({ length: bombs }, () => {
      const m = new THREE.Mesh(bombGeo, bombMat);
      m.visible = false;
      scene.add(m);
      return m;
    });

    const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(cell[0] * 0.92, 0.95, cell[1] * 0.92),
      new THREE.MeshToonMaterial({ color: C.green2 }), cells);
    blocks.frustumCulled = false;
    scene.add(blocks);

    const ufo = new THREE.Mesh(ufoGeometry(), toon);
    ufo.visible = false;
    scene.add(ufo);

    // its own material, so a hit can flash it without lighting up everything else
    const motherMat = new THREE.MeshToonMaterial({ vertexColors: true });
    const mother = new THREE.Mesh(motherGeometry(), motherMat);
    mother.visible = false;
    scene.add(mother);

    const stars = new THREE.Points(starGeometry(420),
      new THREE.PointsMaterial({ color: C.bone, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75 }));
    scene.add(stars);

    // the same faint green grid as the panel, as a floor: it is what makes the depth readable
    const grid = new THREE.GridHelper(240, 60, C.green2, C.green2);
    grid.position.set(0, -1.6, -60);
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    scene.add(grid);

    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // hold the horizontal view of a 16:9 screen, so a squarer screen still sees the whole field
      const half = Math.atan(Math.tan(27.5 * DEG) * (16 / 9) / Math.max(camera.aspect, 1));
      camera.fov = Math.min(80, Math.max(55, (2 * half) / DEG));
      camera.updateProjectionMatrix();
    }
    resize();

    const dummy = new THREE.Object3D();
    let camX = null;

    // s: the game state. dt: seconds since the last draw (Infinity snaps the camera into place)
    function render(s, dt) {
      const lean = Math.max(-1.3, Math.min(1.3, s.ship.vx / s.ship.speed));
      const down = s.ship.dead > 0 ? 1 - s.ship.dead / s.ship.respawn : 0; // hit: 0 -> 1 until it comes back
      ship.position.set(s.ship.x, Math.sin(s.t * 2.2) * 0.06, 0);
      ship.rotation.set(0, -lean * 8 * DEG + down * 14, -lean * 20 * DEG);
      ship.scale.setScalar(0.85 * Math.max(0, 1 - down * 2.5));
      // spins away when hit and stays gone until it comes back; blinks while it can't be hurt
      ship.visible = s.ship.dead > 0 ? down < 0.4 : s.ship.safe <= 0 || Math.floor(s.t * 10) % 2 === 0;

      // behind and above, looking down the field at ~27°, trailing the ship a little
      const want = s.ship.x * 0.35;
      camX = camX === null ? want : camX + (want - camX) * Math.min(1, dt * 4);
      camera.position.set(camX, 13.5, 14);
      camera.lookAt(look.set(camX * 0.8, 0, -13));

      const used = { cigar: 0, bottle: 0, boss: 0 };
      for (const e of s.enemies) {
        if (!e.alive && e.dying <= 0) continue;
        const k = e.dying > 0 ? e.dying / s.dieTime : 1; // shot: spins and shrinks away
        dummy.position.set(e.x, Math.sin(s.t * 3 + e.col * 0.7 + e.row) * 0.14 + (1 - k) * 1.2, e.z);
        dummy.rotation.set(0, (1 - k) * 9, -s.form.dir * 0.1 * k);
        dummy.scale.setScalar((e.kind === "boss" ? 1.12 : 1) * k);
        dummy.updateMatrix();
        saucers[e.kind].setMatrixAt(used[e.kind]++, dummy.matrix);
      }
      for (const k of KINDS) {
        saucers[k].count = used[k];
        saucers[k].instanceMatrix.needsUpdate = true;
      }

      shots.forEach((m, i) => {
        const b = s.bullets[i];
        m.visible = !!(b && b.live);
        if (m.visible) m.position.set(b.x, 0, b.z);
      });
      drops.forEach((m, i) => {
        const b = s.bombs[i];
        m.visible = !!(b && b.live);
        if (m.visible) { m.position.set(b.x, 0, b.z); m.rotation.y = s.t * 9; }
      });

      let n = 0;
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      for (const c of s.cells) {
        if (!c.live) continue;
        dummy.position.set(c.x, -0.3, c.z);
        dummy.updateMatrix();
        blocks.setMatrixAt(n++, dummy.matrix);
      }
      blocks.count = n;
      blocks.instanceMatrix.needsUpdate = true;

      ufo.visible = !!s.ufo;
      if (s.ufo) {
        const k = s.ufo.dying > 0 ? s.ufo.dying / s.dieTime : 1;
        ufo.position.set(s.ufo.x, 1.6 + (1 - k) * 1.5, s.ufo.z);
        ufo.rotation.set(0, s.t * 2.5 + (1 - k) * 9, 0.12);
        ufo.scale.setScalar(k);
      }

      mother.visible = !!s.mother;
      if (s.mother) {
        const m = s.mother, k = m.dying > 0 ? m.dying / m.dieTime : 1;
        mother.position.set(m.x, 1.4 + Math.sin(s.t * 1.7) * 0.25 - (1 - k) * 3, m.z);
        mother.rotation.set((1 - k) * 0.6, (1 - k) * 5, Math.sin(s.t * 0.9) * 0.06 + (1 - k) * 0.8);
        mother.scale.setScalar(0.25 + 0.75 * k);
        motherMat.emissive.setScalar(m.flash > 0 ? 0.55 : 0);
      }

      renderer.render(scene, camera);
    }

    function dispose() {
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss(); // hand the GPU memory back now, not whenever the GC gets to it
      renderer.domElement.remove();
    }

    return { canvas: renderer.domElement, render, resize, dispose };
  }

  return { create };
})();
