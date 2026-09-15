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
- `fonts/` holds Anton and Rajdhani (SIL Open Font License), so the type looks right offline.
- It's a plain HTML page. Chromium opens it full screen (`--kiosk`) when he logs in.

## Install or update on his PC
In a terminal, with internet (git isn't needed):
```bash
cd ~ && wget -qO- https://github.com/ne0bopio/hearth/archive/refs/heads/main.tar.gz | tar xz && { [ -f hearth/config.js ] && cp hearth/config.js hearth-main/; mkdir -p hearth && cp -r hearth-main/. hearth/ && rm -rf hearth-main; } && cd hearth && chmod +x install.sh uninstall.sh && ./install.sh
```
It downloads into `~/hearth`, keeps his `config.js` if one is already there, and starts Hearth.
The same command updates it later.

For the weather, edit `~/hearth/config.js` (city, latitude and longitude, °F or °C), then run
`cd ~/hearth && ./install.sh` again to restart it.

The installer turns off screen blanking and the lock screen. Otherwise the fire would go dark.
`uninstall.sh` restores both.

## Everyday use
- Tap: open or close the panel. It also closes by itself after 20 s.
- Sleep 15m/30m/1h: the fire burns down and the sound fades out. Tap the black screen to relight it.
- Goblins: Visits turns them on or off. Call one sends one right now. How often they come and
  what they say can be changed at the bottom of `config.js`.
- Leave kiosk mode: Alt+F4 (needs a keyboard).
- Update: run the install command above again. His `config.js` stays as it is.
