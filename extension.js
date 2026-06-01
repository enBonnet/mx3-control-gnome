import {Extension} from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

import {Mx3Manager} from "./src/mx3-manager.js";
import Mx3Indicator from "./src/status-indicator.js";

export default class Mx3ControlExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._manager = new Mx3Manager();
        this._manager.refresh();
        this._manager.watch();

        this._indicator = new Mx3Indicator(this, this._manager);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

        if (this._settings.get_boolean("autostart"))
            this._manager.start();
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;

        this._manager?.destroy();
        this._manager = null;
        this._settings = null;
    }
}
