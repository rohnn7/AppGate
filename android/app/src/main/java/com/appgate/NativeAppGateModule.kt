package com.appgate

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.text.TextUtils
import com.appgate.specs.NativeAppGateSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import java.io.File
import java.io.FileOutputStream

class NativeAppGateModule(reactContext: ReactApplicationContext) :
    NativeAppGateSpec(reactContext) {

    private val configFile: File
        get() = File(reactApplicationContext.filesDir, "appgate_config.json")

    private val setupAckFile: File
        get() = File(reactApplicationContext.filesDir, "appgate_setup_ack.txt")

    override fun getName(): String = NAME

    override fun loadConfig(): String {
        val json = if (configFile.exists()) configFile.readText() else "[]"
        AppGateConfigCache.configJson = json
        return json
    }

    override fun saveConfig(json: String) {
        configFile.writeText(json)
        AppGateConfigCache.configJson = json
    }

    override fun loadSetupAcknowledged(): Boolean =
        setupAckFile.exists() && setupAckFile.readText().trim() == "true"

    override fun saveSetupAcknowledged(acknowledged: Boolean) {
        setupAckFile.writeText(acknowledged.toString())
    }

    override fun isAccessibilityEnabled(): Boolean {
        val expected = "${reactApplicationContext.packageName}/${AppGateAccessibilityService::class.java.name}"
        val enabledServices = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            if (splitter.next().equals(expected, ignoreCase = true)) {
                return true
            }
        }
        return false
    }

    override fun canDrawOverlays(): Boolean = Settings.canDrawOverlays(reactApplicationContext)

    override fun isBatteryOptimizationIgnored(): Boolean {
        val powerManager = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        return powerManager.isIgnoringBatteryOptimizations(reactApplicationContext.packageName)
    }

    override fun getManufacturer(): String = Build.MANUFACTURER

    override fun openAccessibilitySettings() {
        startSettingsActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }

    override fun openOverlaySettings() {
        startSettingsActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}"),
            ),
        )
    }

    override fun openBatteryOptimizationSettings() {
        startSettingsActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }

    override fun openAppInfoSettings() {
        startSettingsActivity(
            Intent(
                Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:${reactApplicationContext.packageName}"),
            ),
        )
    }

    override fun openAutostartSettings() {
        // OEM autostart management has no public API — these are commonly
        // documented component names per manufacturer, tried best-effort.
        // Only Xiaomi/MIUI has been confirmed working on a real device;
        // others fall back to the app info screen if the activity isn't found.
        val candidates: List<Pair<String, String>> = when (Build.MANUFACTURER.lowercase()) {
            "xiaomi" -> listOf(
                "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
            )
            "vivo" -> listOf(
                "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
                "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity",
            )
            "oppo", "realme" -> listOf(
                "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
                "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
            )
            else -> emptyList()
        }

        for ((pkg, cls) in candidates) {
            try {
                val intent = Intent().apply {
                    component = ComponentName(pkg, cls)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactApplicationContext.startActivity(intent)
                return
            } catch (e: Exception) {
                // Try the next candidate.
            }
        }
        openAppInfoSettings()
    }

    private fun startSettingsActivity(intent: Intent) {
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactApplicationContext.startActivity(intent)
    }

    override fun getInstalledApps(promise: Promise) {
        // Touches PackageManager for ~150 entries and writes icon files; keep off
        // the native modules thread's fast path, per §6.
        Thread {
            try {
                val pm = reactApplicationContext.packageManager
                val ownPackage = reactApplicationContext.packageName
                val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                val resolveInfos = pm.queryIntentActivities(intent, 0)
                val iconsDir = File(reactApplicationContext.cacheDir, "icons").apply { mkdirs() }

                val result: WritableArray = Arguments.createArray()
                val seen = HashSet<String>()
                for (info in resolveInfos) {
                    val packageName = info.activityInfo.packageName
                    if (packageName == ownPackage || !seen.add(packageName)) {
                        continue
                    }
                    val appName = info.loadLabel(pm).toString()
                    val iconFile = File(iconsDir, "$packageName.png")
                    if (!iconFile.exists()) {
                        try {
                            val bitmap = drawableToBitmap(info.loadIcon(pm))
                            FileOutputStream(iconFile).use { out ->
                                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                            }
                        } catch (e: Exception) {
                            // No icon file written; the app is still usable without one.
                        }
                    }
                    val map = Arguments.createMap()
                    map.putString("packageName", packageName)
                    map.putString("appName", appName)
                    map.putString("iconUri", "file://${iconFile.absolutePath}")
                    result.pushMap(map)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("E_GET_INSTALLED_APPS", e)
            }
        }.start()
    }

    private fun drawableToBitmap(drawable: Drawable): Bitmap {
        if (drawable is BitmapDrawable && drawable.bitmap != null) {
            return drawable.bitmap
        }
        val width = if (drawable.intrinsicWidth > 0) drawable.intrinsicWidth else 96
        val height = if (drawable.intrinsicHeight > 0) drawable.intrinsicHeight else 96
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        return bitmap
    }

    companion object {
        const val NAME = "NativeAppGate"
    }
}
