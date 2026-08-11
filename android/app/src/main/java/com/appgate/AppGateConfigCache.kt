package com.appgate

import org.json.JSONArray

data class CachedGatedApp(
    val packageName: String,
    val appName: String,
    val mode: String, // "BLOCK" or "MESSAGE"
    val blockUntilMillis: Long?,
    val message: String?,
)

/**
 * In-memory mirror of appgate_config.json, read by the AccessibilityService on the
 * hot path (see CLAUDE.md §4/§10.1). Kept in sync with the file synchronously on
 * every saveConfig() call, and populated once from disk on service connect after
 * a reboot (JS never runs in that path).
 */
object AppGateConfigCache {
    @Volatile
    var configJson: String = "[]"

    fun parsed(): List<CachedGatedApp> {
        return try {
            val array = JSONArray(configJson)
            (0 until array.length()).mapNotNull { i ->
                val obj = array.optJSONObject(i) ?: return@mapNotNull null
                CachedGatedApp(
                    packageName = obj.optString("packageName"),
                    appName = obj.optString("appName"),
                    mode = obj.optString("mode"),
                    blockUntilMillis = if (obj.has("blockUntilMillis") && !obj.isNull("blockUntilMillis")) {
                        obj.optLong("blockUntilMillis")
                    } else {
                        null
                    },
                    message = if (obj.has("message") && !obj.isNull("message")) obj.optString("message") else null,
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
}
