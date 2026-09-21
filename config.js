// Edit this on his PC. Weather stays hidden until latitude/longitude are set.
// Find them: open maps, long-press the apartment, copy the two numbers.
window.HEARTH_CONFIG = {
  city: "",            // label shown next to the weather, e.g. "Brooklyn"
  latitude: null,      // e.g. 40.6782
  longitude: null,     // e.g. -73.9442
  units: "fahrenheit", // or "celsius"
  hour12: true,        // false = 24h clock

  // Goblins come every 3–8 minutes. Uncomment to change how often, or what they say.
  // goblins: {
  //   every: [3, 8], // minutes, random in between
  //   lines: {
  //     cigar: ["Psst… ¿un cigarro?", "¿Un puro, jefe?"],
  //     bottle: ["¿Un traguito?", "¿Un shot, bro?"],
  //     shoo: ["Ya, ya, me voy"], // when you tap one
  //   },
  // },

  // The game (panel → Juego). What the martian says; uncomment only the lists you want to change.
  // game: {
  //   lines: {
  //     start: ["¡Vámonos, que llegaron los duendes!"], // a run begins
  //     streak: ["Uno menos, bro", "¡Así, así!"],        // five kills in a row
  //     hit: ["¡Me dieron, me dieron!"],                 // he loses a life
  //     clear: ["Limpio, bro. Vienen más"],              // a wave is gone
  //     ufo: ["¡Platillo premiado!"],                    // the mystery saucer goes down
  //     boss: ["Ahí viene la nodriza…"],                 // the mothership arrives
  //     bossDown: ["¡Pa' la casa, nodriza!"],            // and goes down
  //     over: ["Me ganaron los duendes…"],               // Game Over
  //     retry: ["Otra, otra"],                           // Reintentar
  //   },
  // },
};
