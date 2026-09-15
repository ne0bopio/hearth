#!/usr/bin/env bash
# Removes Hearth's launcher and autostart, and puts the screen settings back.
# Leaves this folder alone; delete it yourself if you want.
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

pkill -f "hearth-profile" 2>/dev/null
rm -f "$HOME/.local/bin/hearth" "$HOME/.config/autostart/hearth.desktop"

if [ -f "$DIR/.previous-settings" ] && command -v gsettings >/dev/null 2>&1; then
  idle="$(grep '^idle=' "$DIR/.previous-settings" | cut -d= -f2- | awk '{print $NF}')"
  lock="$(grep '^lock=' "$DIR/.previous-settings" | cut -d= -f2-)"
  sleep_type="$(grep '^sleep=' "$DIR/.previous-settings" | cut -d= -f2- | tr -d "'")"
  gsettings set org.gnome.desktop.session idle-delay "$idle"
  gsettings set org.gnome.desktop.screensaver lock-enabled "$lock"
  gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type "$sleep_type"
  rm -f "$DIR/.previous-settings"
fi

echo "Hearth removed. Screen settings restored."
