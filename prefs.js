import Adw from "gi://Adw";
import Gio from "gi://Gio";

import {ExtensionPreferences} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class Mx3ControlPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        window.set_default_size(560, 320);
        window.search_enabled = false;

        const page = new Adw.PreferencesPage({
            title: "MX3 Control",
            icon_name: "input-mouse-symbolic",
        });

        const daemonGroup = new Adw.PreferencesGroup({
            title: "Daemon",
            description: "Basic extension behavior for the mx3 background daemon.",
        });

        const autostartRow = new Adw.SwitchRow({
            title: "Start daemon automatically",
            subtitle: "Start mx3 when the extension is enabled.",
        });
        settings.bind("autostart", autostartRow, "active", Gio.SettingsBindFlags.DEFAULT);
        daemonGroup.add(autostartRow);

        const stopOnDisableRow = new Adw.SwitchRow({
            title: "Stop daemon on disable",
            subtitle: "Stop mx3 when the extension is disabled.",
        });
        settings.bind("stop-on-disable", stopOnDisableRow, "active", Gio.SettingsBindFlags.DEFAULT);
        daemonGroup.add(stopOnDisableRow);

        const aboutGroup = new Adw.PreferencesGroup({
            title: "About",
        });
        aboutGroup.add(new Adw.ActionRow({
            title: "MX3 Control",
            subtitle: "Quick Settings control for the mx3 Logitech MX Master 3 daemon.",
        }));

        page.add(daemonGroup);
        page.add(aboutGroup);
        window.add(page);
    }
}
