#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BUNDLE="$SCRIPT_DIR/.build/mx3-gnome@enbonnet.github.com.shell-extension.zip"
DEVKIT_BIN="/usr/lib/mutter-devkit"

if [[ ! -x "$DEVKIT_BIN" ]]; then
    printf '%s\n' "mutter-devkit is not installed at $DEVKIT_BIN" >&2
    printf '%s\n' "Visual nested testing is unavailable on this system." >&2
    printf '%s\n' "Use ./run-headless-test.sh for the working automated test." >&2
    exit 1
fi

if [[ ! -f "$BUNDLE" ]]; then
    make -C "$SCRIPT_DIR" pack
fi

exec gnome-shell-test-tool \
    --wrap "dbus-run-session --" \
    --devkit \
    --extension "$BUNDLE" \
    "$SCRIPT_DIR/test-shell.js"
