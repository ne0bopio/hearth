# Hearth

A fireplace for the touchscreen PC in the room. It replaces the YouTube flames video with a fire
that runs locally: no ads, no buffering, and no autoplay jumping to another video.
Tap the screen to open the panel: clock, weather, timer, sleep, fire/sound settings, and goblins.
Styled in Kick green on black.

## How it works
- `fire.mp4` is the fire: a 7 s generated fireplace clip. Its last second is blended into
  its first, so the loop has no visible seam. If the file is missing, `fire.js` takes over:
  it draws a fire from a small heat grid, which is uglier but always works.
- `sound.js` generates the crackle in code (Web Audio). There are no audio files.
- `goblins.js` draws the goblins in code (SVG, no images). Every 3–8 minutes one walks along the
  hearth, stops, looks at you, offers a cigar or a drink, and walks on. Tap it and it scurries off.
  They skip their turn while the panel is open, during sleep, or while the alarm rings.
- `app.js` runs the panel, clock, timer, sleep and weather (Open-Meteo, no API key).
- `game/` is «Invasión», a Space Invaders seen from behind the ship, drawn with three.js
  (`vendor/three.min.js`, a classic-script build: see `vendor/README.md`). Nothing of it loads until
  someone presses Jugar, and when the game closes its render loop and its WebGL context are gone.
- `fonts/` holds Anton and Rajdhani (SIL Open Font License), so the type looks right offline.
- It's a plain HTML page. Chromium opens it full screen (`--kiosk`) when he logs in.

## Install or update on his PC
First time:
```bash
git clone https://github.com/ne0bopio/hearth ~/hearth && cd ~/hearth && ./install.sh
```
To update, from `~/hearth` (his `config.js` edits are kept):
```bash
git pull --autostash && ./install.sh
```

For the weather, edit `~/hearth/config.js` (city, latitude and longitude, °F or °C), then run
`cd ~/hearth && ./install.sh` again to restart it.

The installer turns off screen blanking and the lock screen. Otherwise the fire would go dark.
`uninstall.sh` restores both.

## Everyday use
- Tap: open or close the panel. It also closes by itself after 20 s.
- Sleep 15m/30m/1h: the fire burns down and the sound fades out. Tap the black screen to relight it.
- Goblins: Visits turns them on or off. Call one sends one right now. How often they come and
  what they say can be changed at the bottom of `config.js`.
- Juego → Jugar: the game takes the whole screen; fire, crackle and goblins wait behind it.
- Leave kiosk mode: Alt+F4 (needs a keyboard).
- Update: `git pull --autostash && ./install.sh` from `~/hearth`.

## The game: «Invasión»
Goblins in saucers come down in formation; the martian's ship shoots them from below. Three lives.
It ends when the third one is gone, or the moment a saucer lands.

| | Keyboard | Touch | USB gamepad |
|---|---|---|---|
| Move | ← → or A / D | drag a finger sideways | stick or d-pad |
| Shoot | Space | fires by itself while the finger is down | A |
| Pause | P | Pausa button | Start |
| Back to the fire | Esc | Salir button (top right, and on Game Over) | Select |
| Play again | Enter on Game Over | Reintentar button | A on Game Over |

- Points: 10 / 20 / 40 by row (cigar, bottle, squad boss: green, white and gold rim). The mystery
  saucer that crosses at the back gives 50–300. The record is kept in the browser's localStorage.
- The goblins shoot back. Three shields take hits from both sides, your own shots included, and
  saucers flatten them when they get that far. Each wave starts closer, moves faster and shoots more.
- Every third wave is the goblin mothership: a health bar, fans of shots aimed at you, 500 points
  times its number. Beating it brings fresh shields.
- The pilot is cent_one's martian, in the bottom-left corner like a Star Fox wingman
  (`game/assets/marciano.webp`). He talks when a run starts, on a streak of five kills, when he
  is hit, when the mothership shows up or goes down, and on Game Over. His lines can be changed at
  the bottom of `config.js` (`game.lines`), one list at a time.
- Sound is made in code (`game/sfx.js`), like the crackle: shots, explosions, the hit, the
  mothership's arrival, and the four-note march that speeds up as the formation thins out. It follows
  the panel's Volume slider; the crackle itself is silent while you play.
- Explosions are one pool of particles. If the PC can't hold 45 fps for two seconds, every burst
  after that is half the size.
- If the Hearth timer goes off mid-game, the game pauses and the alarm shows on top. Sleep keeps
  counting while you play; leaving the game doesn't restart it.
- For checking: `index.html?game=1` opens the game directly. `index.html?game=1&at=12` plays 12 s
  with an autopilot and a fixed random seed, draws that single frame and stops, so a screenshot
  always shows the same thing (it never writes a record). `&wave=5` starts at wave 5, `&boss=1` at
  the first mothership; both work with or without `at`.
- All three planned phases are built. The gamepad was only tested with an
  emulated one, never with a real controller.
