#!/usr/bin/env bash
# Hearth installer for Ubuntu. Run it from inside the hearth folder:  ./install.sh
# What it does:
#   1. finds Chromium (installs the snap if missing)
#   2. writes a launcher (~/.local/bin/hearth) and an autostart entry, so Hearth opens at login
#   3. stops the screen from blanking/locking (saves the old values for uninstall.sh)
#   4. starts Hearth now
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"

case "$DIR" in
  "$HOME"/*) ;;
  *) echo "Copy the hearth folder into your home first (e.g. ~/hearth), then run it from there."; exit 1 ;;
esac

browser=""
for b in chromium chromium-browser google-chrome google-chrome-stable; do
  if command -v "$b" >/dev/null 2>&1; then browser="$(command -v "$b")"; break; fi
done
if [ -z "$browser" ]; then
  echo "Chromium not found. Installing it (it will ask for the password)..."
  sudo snap install chromium
  browser="/snap/bin/chromium"
fi

# Its own browser profile, so it never mixes with his normal browsing.
# Snap Chromium can only write inside ~/snap/chromium.
if snap list chromium >/dev/null 2>&1 && [[ "$browser" == *chromium* ]]; then
  PROFILE="$HOME/snap/chromium/common/hearth-profile"
else
  PROFILE="$HOME/.config/hearth-profile"
fi
mkdir -p "$PROFILE" "$HOME/.local/bin" "$HOME/.config/autostart"

cat > "$HOME/.local/bin/hearth" <<EOF
#!/usr/bin/env bash
# Hearth launcher (written by install.sh)
PREFS="$PROFILE/Default/Preferences"
# after a power cut Chromium shows a "restore pages?" bar; mark the last exit as clean
if [ -f "\$PREFS" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]*"/"exit_type":"Normal"/' "\$PREFS"
fi
exec "$browser" \\
  --user-data-dir="$PROFILE" \\
  --kiosk "file://$DIR/index.html" \\
  --noerrdialogs --disable-infobars --disable-session-crashed-bubble \\
  --disable-features=Translate,TouchpadOverscrollHistoryNavigation \\
  --overscroll-history-navigation=0 --disable-pinch \\
  --autoplay-policy=no-user-gesture-required \\
  --password-store=basic --no-first-run \\
  --check-for-update-interval=31536000
EOF
chmod +x "$HOME/.local/bin/hearth"

cat > "$HOME/.config/autostart/hearth.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Hearth
Exec=$HOME/.local/bin/hearth
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=5
EOF

if command -v gsettings >/dev/null 2>&1; then
  if [ ! -f "$DIR/.previous-settings" ]; then
    {
      echo "idle=$(gsettings get org.gnome.desktop.session idle-delay 2>/dev/null || echo 'uint32 300')"
      echo "lock=$(gsettings get org.gnome.desktop.screensaver lock-enabled 2>/dev/null || echo true)"
      echo "sleep=$(gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 2>/dev/null || echo "'suspend'")"
    } > "$DIR/.previous-settings"
  fi
  gsettings set org.gnome.desktop.session idle-delay 0 || true
  gsettings set org.gnome.desktop.screensaver lock-enabled false || true
  gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing' || true
fi

pkill -f "hearth-profile" 2>/dev/null || true
sleep 1
nohup "$HOME/.local/bin/hearth" >/dev/null 2>&1 &

echo
echo "Hearth is running and will open by itself at every login."
echo "To get out of it: Alt+F4 on a keyboard. To remove it: ./uninstall.sh"
