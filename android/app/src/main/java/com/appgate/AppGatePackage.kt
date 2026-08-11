package com.appgate

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class AppGatePackage : TurboReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == NativeAppGateModule.NAME) {
            NativeAppGateModule(reactContext)
        } else {
            null
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            NativeAppGateModule.NAME to ReactModuleInfo(
                NativeAppGateModule.NAME,
                NativeAppGateModule.NAME,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true, // isTurboModule
            )
        )
    }
}
