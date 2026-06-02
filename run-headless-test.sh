#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BUNDLE="$SCRIPT_DIR/.build/mx3-gnome@enbonnet.github.com.shell-extension.zip"

if [[ ! -f "$BUNDLE" ]]; then
    make -C "$SCRIPT_DIR" pack
fi

exec gnome-shell-test-tool \
    --wrap "dbus-run-session --" \
    --headless \
    --extension "$BUNDLE" \
    "$SCRIPT_DIR/test-shell.js"
