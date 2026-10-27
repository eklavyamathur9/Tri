#!/bin/bash
echo "=== Tri Linux Dependencies Check ==="
echo ""
echo "Required:"
for cmd in node npm cloudflared xdg-open curl; do
    if command -v $cmd &> /dev/null; then echo "  [OK] $cmd"; else echo "  [MISSING] $cmd"; fi
done
echo ""
echo "Recommended (for full functionality):"
for cmd in xclip wl-copy xdotool ydotool playerctl grim slurp scrot maim gnome-screenshot \
           spd-say espeak-ng festival notify-send upower wpctl pactl amixer \
           loginctl xdg-screensaver wmctrl; do
    if command -v $cmd &> /dev/null; then echo "  [OK] $cmd"; else echo "  [--] $cmd (optional)"; fi
done
echo ""
echo "Display server:"
if [ -n "$WAYLAND_DISPLAY" ]; then echo "  Wayland ($WAYLAND_DISPLAY)"; fi
if [ -n "$DISPLAY" ]; then echo "  X11 ($DISPLAY)"; fi
echo ""
echo "Battery:"
upower -i /org/freedesktop/UPower/devices/battery_BAT0 2>/dev/null | grep -E "percentage|state" || echo "  No battery detected (or upower not available)"
