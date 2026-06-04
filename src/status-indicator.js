import GObject from "gi://GObject";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";

const Mx3QuickToggle = GObject.registerClass(
class Mx3QuickToggle extends QuickSettings.QuickMenuToggle {
    constructor(extension, manager) {
        super({
            title: "MX3 Control",
            subtitle: "Stopped",
            iconName: "mx3-off-symbolic",
            toggleMode: true,
        });

        this._extension = extension;
        this._manager = manager;

        this.menu.setHeader(
            "mx3-off-symbolic",
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
        this.iconName = hasError
            ? "mx3-error-symbolic"
            : running
                ? "mx3-on-symbolic"
                : "mx3-off-symbolic";

        this._startStopItem.label.text = running ? "Stop" : "Start";
        this._statusItem.label.text = `Status: ${this.subtitle}`;

        this._errorItem.visible = hasError;
        if (hasError)
            this._errorItem.label.text = `Last error: ${status.lastError}`;
    }

    destroy() {
        this._disconnectStatusChanged?.();
        this._disconnectStatusChanged = null;

        // connectObject registrations are auto-disconnected by SignalTracker
        // when the 'destroy' GObject signal fires on this object.
        super.destroy();
    }
});

const Mx3Indicator = GObject.registerClass(
class Mx3Indicator extends QuickSettings.SystemIndicator {
    constructor(extension, manager) {
        super();

        this._toggle = new Mx3QuickToggle(extension, manager);
        this.quickSettingsItems.push(this._toggle);

        this._indicator = this._addIndicator();
        this._indicator.iconName = "mx3-off-symbolic";
        this._toggle.bind_property("checked", this._indicator, "visible",
            GObject.BindingFlags.SYNC_CREATE);

        this._statusCallback = manager.connectStatusChanged(status => {
            this._indicator.iconName = status.lastError
                ? "mx3-error-symbolic"
                : status.running
                    ? "mx3-on-symbolic"
                    : "mx3-off-symbolic";
        });
    }

    destroy() {
        this._statusCallback?.();
        this._statusCallback = null;

        this.quickSettingsItems.forEach(item => item.destroy());
        this.quickSettingsItems.length = 0;
        super.destroy();
    }
});

export default Mx3Indicator;
