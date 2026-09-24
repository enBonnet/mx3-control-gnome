import GLib from "gi://GLib";
import Gio from "gi://Gio";

// load_contents_async is one of the few GI methods GJS does not
// auto-promisify — without this, every read throws and the manager
// permanently reports "Stopped".
Gio._promisify(Gio.File.prototype, "load_contents_async", "load_contents_finish");

import {MX3_COMMAND, MX3_PID_FILE} from "./types.js";

const STARTUP_TIMEOUT_MS = 1500;

export class Mx3Manager {
    constructor() {
        this._status = {
            running: false,
            pid: null,
            lastError: null,
        };
        this._watchId = null;
        this._startupTimeoutId = null;
        this._sleepIds = new Set();
        this._pendingStart = false;
        this._statusCallbacks = new Set();
        this._cancellable = new Gio.Cancellable();
    }

    get status() {
        return {...this._status};
    }

    connectStatusChanged(callback) {
        this._statusCallbacks.add(callback);
        return () => this._statusCallbacks.delete(callback);
    }

    _emitStatusChanged() {
        const status = this.status;
        for (const callback of this._statusCallbacks)
            callback(status);
    }

    _setStatus(nextStatus) {
        const changed = Object.keys(nextStatus).some(key => this._status[key] !== nextStatus[key]);
        this._status = nextStatus;
        if (changed)
            this._emitStatusChanged();
    }

    async _readPidFile() {
        const file = Gio.File.new_for_path(MX3_PID_FILE);
        try {
            const [contents] = await file.load_contents_async(this._cancellable);
            const text = new TextDecoder().decode(contents);
            const pid = Number.parseInt(text.trim(), 10);
            if (Number.isNaN(pid) || pid <= 0)
                return null;
            return pid;
        } catch (_) {
            return null;
        }
    }

    async _isProcessRunning(pid) {
        try {
            const commFile = Gio.File.new_for_path(`/proc/${pid}/comm`);
            const [contents] = await commFile.load_contents_async(this._cancellable);
            const name = new TextDecoder().decode(contents).trim();
            return name === MX3_COMMAND;
        } catch (_) {
            return false;
        }
    }

    _resolveExecutable() {
        const resolved = GLib.find_program_in_path(MX3_COMMAND);
        if (resolved)
            return resolved;

        const homeDir = GLib.get_home_dir();
        const fallbackPaths = [
            "/usr/bin/mx3",
            "/usr/local/bin/mx3",
            `${homeDir}/.local/bin/mx3`,
            `${homeDir}/.cargo/bin/mx3`,
        ];

        return fallbackPaths.find(path => Gio.File.new_for_path(path).query_exists(null)) ?? null;
    }

    async refresh() {
        const pid = await this._readPidFile();
        const running = pid !== null && await this._isProcessRunning(pid);
        this._setStatus({
            running,
            pid,
            lastError: running ? null : this._status.lastError,
        });
    }

    start() {
        if (this._status.running || this._pendingStart)
            return true;

        try {
            if (this._startupTimeoutId !== null) {
                GLib.Source.remove(this._startupTimeoutId);
                this._startupTimeoutId = null;
            }

            const executable = this._resolveExecutable();
            if (!executable)
                throw new Error(`Could not find '${MX3_COMMAND}' in PATH`);

            Gio.Subprocess.new(
                [executable, "--daemon", `--pid-file=${MX3_PID_FILE}`],
                Gio.SubprocessFlags.NONE
            );

            // From here until the pid file shows up, stop() must treat the
            // daemon as running even though refresh() still reports false.
            this._pendingStart = true;

            this._startupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, STARTUP_TIMEOUT_MS, () => {
                this._startupTimeoutId = null;
                this._pendingStart = false;
                this.refresh().then(() => {
                    if (!this._status.running && !this._status.lastError) {
                        this._setStatus({
                            ...this._status,
                            lastError: `mx3 did not create ${MX3_PID_FILE}. Try '${executable} --daemon --pid-file=${MX3_PID_FILE}' in the same session.`,
                        });
                    }
                }).catch(e => console.error("[mx3-control] startup timeout refresh failed:", e));
                return GLib.SOURCE_REMOVE;
            });

            this._setStatus({...this._status, lastError: null});
            return true;
        } catch (error) {
            this._pendingStart = false;
            this._setStatus({...this._status, lastError: String(error)});
            return false;
        }
    }

    async stop() {
        const wasStarting = this._pendingStart;
        if (!this._status.running && !wasStarting)
            return true;
        this._pendingStart = false;

        if (this._startupTimeoutId !== null) {
            GLib.Source.remove(this._startupTimeoutId);
            this._startupTimeoutId = null;
        }

        // A just-started daemon may not have written the pid file yet; give it
        // a moment so stop can target the real process instead of no-oping.
        let pid = this._status.pid;
        if (pid === null && wasStarting) {
            for (let i = 0; i < 10 && pid === null; i++) {
                await this._sleep(100);
                pid = await this._readPidFile();
            }
        }

        if (pid !== null) {
            try {
                const proc = Gio.Subprocess.new(
                    ["kill", String(pid)],
                    Gio.SubprocessFlags.NONE
                );
                await new Promise((resolve, reject) => {
                    proc.wait_async(this._cancellable, (obj, result) => {
                        try {
                            obj.wait_finish(result);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    });
                });
                // kill(1) exiting non-zero just means nobody to signal; wait
                // for mx3 itself to exit so callers see a settled state.
                await this._waitForExit(pid, 2000);
            } catch (error) {
                if (error.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    return true;   // extension shutting down; nothing to report
                this._setStatus({...this._status, lastError: String(error)});
            }
        }

        await this.refresh();
        return true;
    }

    _sleep(ms) {
        return new Promise(resolve => {
            const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
                this._sleepIds.delete(id);
                resolve();
                return GLib.SOURCE_REMOVE;
            });
            this._sleepIds.add(id);
        });
    }

    async _waitForExit(pid, timeoutMs) {
        const deadline = GLib.get_monotonic_time() + timeoutMs * 1000;
        while (await this._isProcessRunning(pid)) {
            if (GLib.get_monotonic_time() >= deadline)
                return;
            await this._sleep(100);
        }
    }

    async restart() {
        await this.stop();
        return this.start();
    }

    watch() {
        if (this._watchId !== null)
            return;

        this._watchId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this.refresh().catch(e => console.error("[mx3-control] watch refresh failed:", e));
            return GLib.SOURCE_CONTINUE;
        });
    }

    destroy() {
        this._cancellable.cancel();

        if (this._startupTimeoutId !== null) {
            GLib.Source.remove(this._startupTimeoutId);
            this._startupTimeoutId = null;
        }

        if (this._watchId !== null) {
            GLib.Source.remove(this._watchId);
            this._watchId = null;
        }

        for (const id of this._sleepIds)
            GLib.Source.remove(id);
        this._sleepIds.clear();

        this._statusCallbacks.clear();
    }
}
