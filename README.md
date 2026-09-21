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
Goblins in saucers come down in formation; the martian's ship shoots them from below.

| | Keyboard | Touch |
|---|---|---|
| Move | ← → or A / D | drag a finger sideways |
| Shoot | Space | fires by itself while the finger is down |
| Pause | P | Pausa button |
| Back to the fire | Esc | Salir button |

- If the Hearth timer goes off mid-game, the game pauses and the alarm shows on top. Sleep keeps
  counting while you play; leaving the game doesn't restart it.
- For checking: `index.html?game=1` opens the game directly. `index.html?game=1&at=12` plays 12 s
  with an autopilot, draws that single frame and stops, so a screenshot always shows the same thing.
- Built so far: phase 1 (it plays). Lives, score, enemy fire, shields and the mothership come next.
