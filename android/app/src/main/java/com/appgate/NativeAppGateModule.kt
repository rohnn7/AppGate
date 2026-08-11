package com.appgate

import com.appgate.specs.NativeAppGateSpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.Arguments

class NativeAppGateModule(reactContext: ReactApplicationContext) :
    NativeAppGateSpec(reactContext) {

    override fun getName(): String = NAME

    // Step 2 stub: hardcoded values only, proving the JS <-> Kotlin bridge works.
    // Real file I/O and cache wiring land in step 3.
    override fun loadConfig(): String = "[]"

    override fun saveConfig(json: String) {
        // no-op stub
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
