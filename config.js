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
};
