# MX3 Control

GNOME Shell extension that adds an `MX3 Control` toggle to Quick Settings for the external `mx3` daemon used with Logitech MX Master 3 mice.

The extension does not implement gesture handling itself. It starts, stops, restarts, and monitors the `mx3` daemon inside the current GNOME session.

## Features

- Quick Settings tile for `mx3`
- Direct click to start or stop the daemon
- Submenu actions for restart and preferences
- Visible error state when `mx3` is missing or exits immediately
- Optional autostart when the extension is enabled

## Requirements

- GNOME Shell 45+
- `mx3` installed and available in the user session
- `uinput` kernel module loaded
- Permission to access `/dev/uinput`

## How It Works

- The extension starts `mx3 --daemon --pid-file=/tmp/mx3.pid`
- It reads `/tmp/mx3.pid` to detect whether the daemon is running
- It checks `/proc/<pid>` to verify the process still exists
- It exposes daemon status through GNOME Quick Settings

If the extension shows an error, verify the CLI directly in a terminal first.

## Installation

### From source

```bash
git clone https://github.com/enbonnet/mx3-gnome
cd mx3-gnome
make install
```

`make install` now builds a GNOME extension bundle and installs it through
`gnome-extensions install`, which is more reliable than copying files directly.

### Enable the extension

```bash
gnome-extensions enable mx3-gnome@enbonnet.github.com
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

Run the CLI directly:

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

## Project Files

```text
mx3-gnome/
├── extension.js
├── metadata.json
├── prefs.js
├── resources/
│   └── org.gnome.shell.extensions.mx3-gnome.gschema.xml
└── src/
    ├── mx3-manager.js
    ├── status-indicator.js
    └── types.js
```
