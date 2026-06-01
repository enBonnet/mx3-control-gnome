# MX3 Control Production Checklist

This checklist captures the agreed product direction for the extension and the work required to prepare it for production.

## Product Definition

- [x] Rename the extension to `MX3 Control`
- [x] Position the extension as a controller for the external `mx3` daemon
- [x] Move the UI from the top bar to GNOME Quick Settings
- [x] Use a `QuickMenuToggle` instead of a top-panel indicator
- [x] Make primary click toggle the daemon directly
- [x] Keep submenu actions for restart and preferences
- [x] Do not show an extra Quick Settings header indicator icon
- [x] Plan support for GNOME Shell `45`, `46`, `47`, `48`, `49`, and `50`

## Architecture Changes

- [x] Replace `PanelMenu.Button` usage with Quick Settings integration in `extension.js`
- [x] Register the extension through `Main.panel.statusArea.quickSettings.addExternalIndicator(...)`
- [x] Replace `src/status-indicator.js` with a Quick Settings implementation
- [x] Create a `QuickSettings.SystemIndicator` wrapper without a visible indicator icon
- [x] Create a `QuickSettings.QuickMenuToggle` tile for `MX3 Control`
- [x] Wire tile click to start or stop the daemon directly
- [x] Add submenu actions for `Restart` and `Preferences`
- [x] Add non-reactive submenu rows for current status and last error
- [x] Keep the daemon/process control logic in `src/mx3-manager.js`

## Backend Cleanup

- [x] Track the startup timeout source ID in `src/mx3-manager.js`
- [x] Remove all GLib source IDs in `destroy()`
- [ ] Confirm repeated enable/disable cycles do not leave stale timers behind
- [ ] Confirm repeated start/stop/restart cycles leave the manager in a correct state
- [x] Ensure error states are propagated cleanly to the Quick Settings tile

## Preferences

- [x] Rename visible strings from `MX3 Gnome` to `MX3 Control`
- [x] Decide whether to keep only `autostart` for the first production release
- [x] Remove unused notification-related preferences if they remain unimplemented
- [x] Keep the preferences window minimal and accurate to the shipped feature set

## Metadata

- [x] Update `metadata.json` name to `MX3 Control`
- [x] Update the metadata description to match the actual shipped behavior
- [x] Keep `shell-version` aligned with the intended support matrix: `45` to `50`
- [ ] Decide whether to remove manual `version` for GNOME Extensions submission

## Documentation

- [x] Rewrite `README.md` so it describes the extension as a Quick Settings controller for `mx3`
- [x] Remove claims about unimplemented features such as gesture remapping UI in the extension
- [x] Remove claims about last-gesture display unless implemented
- [x] Remove claims about notifications unless implemented
- [ ] Update screenshots or usage descriptions after the Quick Settings UI is in place
- [x] Add troubleshooting notes for daemon startup failures and `/dev/uinput` permissions

## Packaging And Release Hygiene

- [ ] Add a `LICENSE` file
- [ ] Add a release packaging target to `Makefile`
- [ ] Ensure the release artifact contains only runtime files
- [ ] Ensure the schema file is included in the shipped extension package
- [ ] Verify install/build instructions match the final package layout

## Asset Cleanup

- [ ] Remove unused custom icons if the Quick Settings tile does not use them
- [ ] Remove unused CSS if the new implementation does not require it
- [ ] Remove any dead code left from the top-bar indicator implementation
- [ ] Remove unused schema keys if related features are not shipped

## Tile UX Requirements

- [x] Tile title is `MX3 Control`
- [x] Tile click starts the daemon when stopped
- [x] Tile click stops the daemon when running
- [x] Tile checked state reflects whether the daemon is running
- [x] Tile subtitle reflects `Running`, `Stopped`, or `Error`
- [x] Submenu contains `Restart`
- [x] Submenu contains `Preferences`
- [x] Submenu shows useful status text
- [x] Submenu shows the last error only when relevant

## Compatibility Verification

- [ ] Verify the extension loads on GNOME Shell `45`
- [ ] Verify the extension loads on GNOME Shell `46`
- [ ] Verify the extension loads on GNOME Shell `47`
- [ ] Verify the extension loads on GNOME Shell `48`
- [ ] Verify the extension loads on GNOME Shell `49`
- [ ] Verify the extension loads on GNOME Shell `50`
- [ ] Verify Quick Settings tile placement on all tested versions
- [ ] Avoid relying on private GNOME Shell internals where possible

## Functional Verification

- [ ] Enable the extension and confirm no shell error is raised
- [ ] Confirm the tile appears in Quick Settings instead of the top bar
- [ ] Confirm clicking the tile starts the daemon
- [ ] Confirm clicking the tile stops the daemon
- [ ] Confirm the submenu opens correctly
- [ ] Confirm `Restart` works correctly
- [ ] Confirm `Preferences` opens correctly
- [ ] Confirm autostart behaves as expected
- [ ] Confirm missing `mx3` executable produces a visible error state
- [ ] Confirm daemon startup failure produces a useful error message

## Suggested Release Positioning

- [x] Use the public name `MX3 Control`
- [x] Use a concise description such as `Quick Settings control for the mx3 Logitech MX Master 3 daemon.`
- [x] Keep the first production release focused on daemon control and status
- [ ] Defer broader gesture-configuration claims until the extension actually implements them
