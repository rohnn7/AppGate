package com.appgate

/**
 * In-memory mirror of appgate_config.json, read by the AccessibilityService on the
 * hot path (see CLAUDE.md §4/§10.1). Kept in sync with the file synchronously on
 * every saveConfig() call, and populated once from disk on service connect after
 * a reboot (JS never runs in that path).
 */
object AppGateConfigCache {
    @Volatile
    var configJson: String = "[]"
}
