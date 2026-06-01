import GLib from "gi://GLib";
import Gio from "gi://Gio";

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
        this._statusCallbacks = new Set();
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

    _readPidFile() {
        try {
            const [, contents] = GLib.file_get_contents(MX3_PID_FILE);
            const text = new TextDecoder().decode(contents);
            const pid = Number.parseInt(text.trim(), 10);
            return Number.isNaN(pid) ? null : pid;
        } catch (_) {
            return null;
        }
    }

    _isProcessRunning(pid) {
        try {
            const procPath = Gio.File.new_for_path(`/proc/${pid}`);
            return procPath.query_exists(null);
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

    refresh() {
        const pid = this._readPidFile();
        const running = pid !== null && this._isProcessRunning(pid);
        this._setStatus({
            running,
            pid,
            lastError: running ? null : this._status.lastError,
        });
    }

    start() {
        if (this._status.running)
            return true;

        try {
            if (this._startupTimeoutId !== null) {
                GLib.source_remove(this._startupTimeoutId);
                this._startupTimeoutId = null;
            }

            const executable = this._resolveExecutable();
            if (!executable)
                throw new Error(`Could not find '${MX3_COMMAND}' in PATH`);

            const process = Gio.Subprocess.new(
                [executable, "--daemon", `--pid-file=${MX3_PID_FILE}`],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            process.communicate_utf8_async(null, null, (subprocess, result) => {
                try {
                    const [, stdout, stderr] = subprocess.communicate_utf8_finish(result);
                    if (!subprocess.get_successful()) {
                        const message = stderr?.trim() || stdout?.trim() || `mx3 exited with status ${subprocess.get_exit_status()}`;
                        this._setStatus({...this._status, lastError: message});
                    }
                } catch (error) {
                    this._setStatus({...this._status, lastError: String(error)});
                }
            });

            this._startupTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, STARTUP_TIMEOUT_MS, () => {
                this._startupTimeoutId = null;
                this.refresh();
                if (!this._status.running && !this._status.lastError) {
                    this._setStatus({
                        ...this._status,
                        lastError: `mx3 did not create ${MX3_PID_FILE}. Try '${executable} --daemon --pid-file=${MX3_PID_FILE}' in the same session.`,
                    });
                }
                return GLib.SOURCE_REMOVE;
            });

            this._setStatus({...this._status, lastError: null});
            return true;
        } catch (error) {
            this._setStatus({...this._status, lastError: String(error)});
            return false;
        }
    }

    stop() {
        if (!this._status.running || this._status.pid === null)
            return true;

        try {
            if (this._startupTimeoutId !== null) {
                GLib.source_remove(this._startupTimeoutId);
                this._startupTimeoutId = null;
            }

            Gio.Subprocess.new(
                ["kill", String(this._status.pid)],
                Gio.SubprocessFlags.NONE
            ).wait(null);
            this.refresh();
            return true;
        } catch (error) {
            this._setStatus({...this._status, lastError: String(error)});
            return false;
        }
    }

    restart() {
        this.stop();
        return this.start();
    }

    watch() {
        if (this._watchId !== null)
            return;

        this._watchId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
            this.refresh();
            return GLib.SOURCE_CONTINUE;
        });
    }

    destroy() {
        if (this._startupTimeoutId !== null) {
            GLib.source_remove(this._startupTimeoutId);
            this._startupTimeoutId = null;
        }

        if (this._watchId !== null) {
            GLib.source_remove(this._watchId);
            this._watchId = null;
        }

        this._statusCallbacks.clear();
    }
}
