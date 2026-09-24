import Gio from "gi://Gio";
import GObject from "gi://GObject";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";

// Extension dirs are not in the St icon theme search path, so custom icon
// names never resolve — load the shipped SVGs directly instead.
function loadIcons(extension) {
    const iconsDir = extension.dir.get_child("icons");
    const gicon = name =>
        Gio.Icon.new_for_string(iconsDir.get_child(`${name}.svg`).get_path());
    return {
        on: gicon("mx3-on-symbolic"),
        off: gicon("mx3-off-symbolic"),
        error: gicon("mx3-error-symbolic"),
    };
}

const Mx3QuickToggle = GObject.registerClass(
class Mx3QuickToggle extends QuickSettings.QuickMenuToggle {
    constructor(extension, manager) {
        const icons = loadIcons(extension);

        super({
            title: "MX3 Control",
            subtitle: "Stopped",
            gicon: icons.off,
            toggleMode: true,
        });

        this._extension = extension;
        this._manager = manager;
        this._icons = icons;

        this.menu.setHeader(
            icons.off,
            "MX3 Control",
            "Quick Settings control for the mx3 daemon"
        );

        this._startStopItem = new PopupMenu.PopupMenuItem("Start");
        this._startStopItem.connectObject("activate", () => {
            this._toggleManager();
        }, this);
        this.menu.addMenuItem(this._startStopItem);

        this._restartItem = new PopupMenu.PopupMenuItem("Restart");
        this.menu.addMenuItem(this._restartItem);
        this._restartItem.connectObject("activate", () => {
            this._manager.restart().catch(e =>
                console.error("[mx3-control] restart failed:", e));
        }, this);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._statusItem = new PopupMenu.PopupMenuItem("", {
            reactive: false,
            can_focus: false,
        });
        this.menu.addMenuItem(this._statusItem);

        this._errorItem = new PopupMenu.PopupMenuItem("", {
            reactive: false,
            can_focus: false,
        });
        this.menu.addMenuItem(this._errorItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._preferencesItem = this.menu.addAction("Preferences", () => {
            this._extension.openPreferences();
        });
        this._preferencesItem.visible = Main.sessionMode.allowSettings;

        this._disconnectStatusChanged = this._manager.connectStatusChanged(status => {
            this._syncStatus(status);
        });

        this.connectObject("clicked", () => {
            this._toggleManager();
        }, this);

        this._syncStatus(this._manager.status);
    }

    _toggleManager() {
        if (this._manager.status.running)
            this._manager.stop().catch(e => console.error("[mx3-control] stop failed:", e));
        else
            this._manager.start();
    }

    _syncStatus(status) {
        const running = status.running;
        const hasError = !!status.lastError;

        this.checked = running;
        this.subtitle = running ? "Running" : hasError ? "Error" : "Stopped";
        this.gicon = hasError
            ? this._icons.error
            : running
                ? this._icons.on
                : this._icons.off;

        this._startStopItem.label.text = running ? "Stop" : "Start";
        this._statusItem.label.text = `Status: ${this.subtitle}`;

        this._errorItem.visible = hasError;
        if (hasError)
            this._errorItem.label.text = `Last error: ${status.lastError}`;
    }

    destroy() {
        this._disconnectStatusChanged();
        this._disconnectStatusChanged = null;

        // The menu actor is parented into the QuickSettings overlay, not into
        // this widget, so it must be destroyed explicitly to avoid leaking it.
        this.menu.destroy();

        // connectObject registrations are auto-disconnected by SignalTracker
        // when the 'destroy' GObject signal fires on this object.
        super.destroy();
    }
});

const Mx3Indicator = GObject.registerClass(
class Mx3Indicator extends QuickSettings.SystemIndicator {
    constructor(extension, manager) {
        super();

        this._icons = loadIcons(extension);
        this._toggle = new Mx3QuickToggle(extension, manager);
        this.quickSettingsItems.push(this._toggle);

        this._indicator = this._addIndicator();
        this._indicator.gicon = this._icons.off;
        this._toggle.bind_property("checked", this._indicator, "visible",
            GObject.BindingFlags.SYNC_CREATE);

        this._statusCallback = manager.connectStatusChanged(status => {
            this._indicator.gicon = status.lastError
                ? this._icons.error
                : status.running
                    ? this._icons.on
                    : this._icons.off;
        });
    }

    destroy() {
        this._statusCallback();
        this._statusCallback = null;

        this.quickSettingsItems.forEach(item => item.destroy());
        this.quickSettingsItems.length = 0;
        super.destroy();
    }
});

export default Mx3Indicator;
