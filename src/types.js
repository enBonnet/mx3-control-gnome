import GLib from "gi://GLib";

export const MX3_PID_FILE = GLib.build_filenamev([
    GLib.get_user_runtime_dir(), "mx3.pid",
]);
export const MX3_COMMAND = "mx3";
