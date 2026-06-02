import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

function waitForStartupComplete() {
    return new Promise(resolve => {
        if (Main.layoutManager._startingUp) {
            const id = Main.layoutManager.connect('startup-complete', () => {
                Main.layoutManager.disconnect(id);
                resolve();
            });
            return;
        }

        resolve();
    });
}

function hasMx3Tile() {
    const items = Main.panel.statusArea.quickSettings.menu._grid?.get_children?.() ?? [];
    return items.some(item => item.title === 'MX3 Control');
}

async function waitForMx3Tile(timeoutMs = 5000) {
    const deadline = GLib.get_monotonic_time() + timeoutMs * 1000;

    while (GLib.get_monotonic_time() < deadline) {
        if (hasMx3Tile())
            return true;

        await Scripting.sleep(100);
    }

    return false;
}

export async function run() {
    await waitForStartupComplete();
    await Scripting.waitLeisure();

    Main.panel.statusArea.quickSettings.menu.open();
    await Scripting.sleep(1000);

    if (!await waitForMx3Tile())
        throw new Error('MX3 Control quick settings tile was not found');

    // Keep the shell alive briefly so the menu stays open for inspection.
    await Scripting.sleep(15000);
}

export function finish() {
}
