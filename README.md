# MX3 Control

GNOME Shell extension that adds an `MX3 Control` toggle to Quick Settings for the external `mx3` daemon used with Logitech MX Master 3 mice.

This extension requires the `mx3` CLI from `mx3-linux-driver`:

- Project: <https://github.com/enBonnet/mx3-linux-driver>
- Required command: `mx3`

The extension does not implement gesture handling or device control itself. It only starts, stops, restarts, and monitors the `mx3` daemon inside the current GNOME session.

## Features

- Quick Settings tile for `mx3`
- Direct click to start or stop the daemon
- Submenu actions for restart and preferences
- Visible error state when `mx3` is missing or exits immediately
- Optional autostart when the extension is enabled

## Requirements

- GNOME Shell 45+
- `mx3-linux-driver` installed: <https://github.com/enBonnet/mx3-linux-driver>
- `mx3` installed and available in the user session `PATH`
- `uinput` kernel module loaded
- Permission to access `/dev/uinput`

## Dependency

`MX3 Control` depends on the separate `mx3-linux-driver` project.

You must install `mx3-linux-driver` before this extension. Without it, the extension can load in GNOME Shell, but it cannot control anything and will show an error state because the `mx3` executable is missing.

## How It Works

- The extension starts `mx3 --daemon --pid-file=/tmp/mx3.pid`
- It reads `/tmp/mx3.pid` to detect whether the daemon is running
- It checks `/proc/<pid>` to verify the process still exists
- It exposes daemon status through GNOME Quick Settings

If the extension shows an error, verify the CLI directly in a terminal first.

## Installation

### Install the required CLI first

Install `mx3-linux-driver` first:

- <https://github.com/enBonnet/mx3-linux-driver>

Confirm the `mx3` command is available before installing this extension:

```bash
mx3 --help
```

### From source

```bash
git clone https://github.com/enbonnet/mx3-control-gnome
cd mx3-control-gnome
make install
```

`make install` now builds a GNOME extension bundle and installs it through
`gnome-extensions install`, which is more reliable than copying files directly.

### Enable the extension

```bash
gnome-extensions enable mx3-control-gnome@enbonnet.github.com
```

If the extension is not listed right away, log out and back in once so the
running GNOME Shell session refreshes its extension list.

After enabling, open GNOME Quick Settings and look for `MX3 Control`.

## Preferences

The preferences window currently exposes:

- `Start daemon automatically`

You can open preferences from:

- Quick Settings -> `MX3 Control` submenu -> `Preferences`
- GNOME Extensions app

## Troubleshooting

### `mx3` does not start

First confirm `mx3-linux-driver` is installed and the `mx3` command is available:

```bash
mx3 --help
```

Then run the CLI directly:

```bash
mx3
```

If the daemon exits immediately, the extension will stay stopped and show the last error in the Quick Settings submenu.

### `/dev/uinput` permission error

If `mx3` reports a permission error, fix the system setup first:

```bash
sudo modprobe uinput
sudo usermod -aG input $USER
```

Then log out and log back in so GNOME Shell gets the updated group membership.

### Check daemon state manually

```bash
cat /tmp/mx3.pid
ls /proc/$(cat /tmp/mx3.pid)
```

If `/proc/<pid>` does not exist, the daemon started and exited immediately.

## Building

```bash
make build
make install
make clean
```

## Testing

### Recommended automated test on GNOME Shell 50+

The most reliable local test flow on GNOME Shell `50` is a headless nested
shell launched through `gnome-shell-test-tool`.

Build the extension bundle first:

```bash
make pack
```

Run the automated headless test:

```bash
./run-headless-test.sh
```

Or with `make`:

```bash
make test-headless
```

This test does the following:

- starts an isolated GNOME Shell test session with `dbus-run-session`
- installs the packed extension zip into that session
- opens Quick Settings
- verifies that the `MX3 Control` tile exists

Equivalent direct command:

```bash
gnome-shell-test-tool \
  --wrap "dbus-run-session --" \
  --headless \
  --extension ".build/mx3-control-gnome@enbonnet.github.com.shell-extension.zip" \
  test-shell.js
```

### Visual nested testing

There is also a visual test helper:

```bash
./run-visual-test.sh
```

Or:

```bash
make test-visual
```

This uses `gnome-shell-test-tool --devkit`, which requires
`/usr/lib/mutter-devkit` to exist on the system.

If `mutter-devkit` is missing, the visual helper exits immediately with a
clear error message and you should use the headless test instead.

### GNOME Shell 50 notes

On GNOME Shell `50`, older nested shell commands that appear in blog posts or
older extension docs no longer work:

- `gnome-shell --nested` is not available
- `gnome-shell --x11` is not available
- `gnome-shell --replace` is not a valid nested test flow here

For this project, `gnome-shell-test-tool` is the working approach.

### Packaging note for tests

The extension imports runtime files from `./src/...`, so the packed zip must
preserve the `src/` directory. The current `Makefile` already does this.

If the package is built incorrectly, GNOME Shell will fail to load the
extension and report missing files such as:

```text
ImportError: Unable to load file .../src/mx3-manager.js
```

### Expected warnings in the test environment

The headless test environment may still print warnings related to:

- `org.freedesktop.systemd1`
- `gvfs`
- `xdg-desktop-portal`
- missing GNOME background images
- authentication agent registration

Those warnings did not prevent the extension test from passing in this repo.

## Project Files

```text
mx3-control-gnome/
├── extension.js
├── metadata.json
├── prefs.js
├── resources/
│   └── org.gnome.shell.extensions.mx3-control-gnome.gschema.xml
└── src/
    ├── mx3-manager.js
    ├── status-indicator.js
    └── types.js
```
