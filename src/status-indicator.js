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
            iconName: "input-mouse-symbolic",
            toggleMode: true,
        });

        this._extension = extension;
        this._manager = manager;

        this.menu.setHeader(
            "input-mouse-symbolic",
            "MX3 Control",
            "Quick Settings control for the mx3 daemon"
        );

        this._startStopItem = new PopupMenu.PopupMenuItem("Start");
        this._startStopItem.connect("activate", () => {
            this._toggleManager();
        });
        this.menu.addMenuItem(this._startStopItem);

        const restartItem = new PopupMenu.PopupMenuItem("Restart");
        this.menu.addMenuItem(restartItem);
        restartItem.connect("activate", () => this._manager.restart());

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

        this.connect("clicked", () => {
            this._toggleManager();
        });

        this._syncStatus(this._manager.status);
    }

    _toggleManager() {
        if (this._manager.status.running)
            this._manager.stop();
        else
            this._manager.start();
    }

    _syncStatus(status) {
        const running = status.running;
        this.checked = running;
        this.subtitle = running ? "Running" : status.lastError ? "Error" : "Stopped";
        this._startStopItem.label.text = running ? "Stop" : "Start";
        this._statusItem.label.text = `Status: ${running ? "Running" : status.lastError ? "Error" : "Stopped"}`;
        this._errorItem.label.text = `Last error: ${status.lastError}`;
        this._errorItem.visible = Boolean(status.lastError);
    }

    destroy() {
        this._disconnectStatusChanged?.();
        this._disconnectStatusChanged = null;
        super.destroy();
    }
});

const Mx3Indicator = GObject.registerClass(
class Mx3Indicator extends QuickSettings.SystemIndicator {
    constructor(extension, manager) {
        super();

        this.quickSettingsItems.push(new Mx3QuickToggle(extension, manager));
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());
        super.destroy();
    }
});

export default Mx3Indicator;
