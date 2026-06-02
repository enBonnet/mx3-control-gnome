#!/bin/bash
# Quick reload for mx3-control-gnome extension
EXT=mx3-control-gnome@enbonnet.github.com
DIR=~/.local/share/gnome-shell/extensions/$EXT

make install -C ~/Projects/personal/mx3-control-gnome
gnome-extensions disable $EXT 2>/dev/null
gnome-extensions enable $EXT

# Check for errors
sleep 1
journalctl -b -n 5 /usr/bin/gnome-shell | grep -i "mx3\|error" | grep -v "firefox\|geolocation\|Malcontent"