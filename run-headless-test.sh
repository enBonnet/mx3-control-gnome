#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
BUNDLE="$SCRIPT_DIR/.build/mx3-control-gnome@enbonnet.github.com.test.zip"

if [[ ! -f "$BUNDLE" ]]; then
    make -C "$SCRIPT_DIR" pack-test
fi

exec gnome-shell-test-tool \
    --wrap "dbus-run-session --" \
    --headless \
    --extension "$BUNDLE" \
    "$SCRIPT_DIR/test-shell.js"
