package com.appgate

import com.appgate.specs.NativeAppGateSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments
import java.io.File

class NativeAppGateModule(reactContext: ReactApplicationContext) :
    NativeAppGateSpec(reactContext) {

    private val configFile: File
        get() = File(reactApplicationContext.filesDir, "appgate_config.json")

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

    override fun isAccessibilityEnabled(): Boolean = false

    override fun canDrawOverlays(): Boolean = false

    override fun openAccessibilitySettings() {
        // stub, wired up in the setup gate step
    }

    override fun openOverlaySettings() {
        // stub, wired up in the setup gate step
    }

    override fun openBatteryOptimizationSettings() {
        // stub, wired up in the setup gate step
    }

    override fun openAppInfoSettings() {
        // stub, wired up in the setup gate step
    }

    override fun getInstalledApps(promise: Promise) {
        val empty: WritableArray = Arguments.createArray()
        promise.resolve(empty)
    }

    companion object {
        const val NAME = "NativeAppGate"
    }
}
